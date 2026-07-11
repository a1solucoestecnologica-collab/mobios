/**
 * MÖBI Time — módulo operacional interno (A1 Soluções).
 * Escalas, ajustes, competências, comunicados, documentos.
 */
import { randomBytes, randomUUID, scryptSync } from "node:crypto";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { writeAuditLog } from "../../platform/server-handlers/services/auth/session.js";
import { DEPRECATION_MSG as TIME_EMPLOYEE_DEPRECATION } from "./time-employees.js";

const ADJUSTMENT_KINDS = {
  FORGOT_ENTRY: { punchType: "ENTRY", label: "Esqueci entrada" },
  FORGOT_EXIT: { punchType: "EXIT", label: "Esqueci saída" },
  FORGOT_LUNCH_OUT: { punchType: "LUNCH_OUT", label: "Esqueci saída almoço" },
  FORGOT_LUNCH_RETURN: { punchType: "LUNCH_RETURN", label: "Esqueci retorno almoço" },
  TIME_ERROR: { punchType: null, label: "Erro de horário" },
};

const COLLABORATOR_ROLE_ID = "role-collaborator-a1";
const COLLABORATOR_PERMS = ["portal.access", "time.clock", "time.report", "time.adjust", "planner.execute"];

export function migrateOperationalSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS ponto_shift_plans (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      plan_type TEXT NOT NULL CHECK(plan_type IN ('weekly', 'monthly')),
      reference_year INTEGER,
      reference_month INTEGER,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ponto_shift_plan_entries (
      id TEXT PRIMARY KEY,
      plan_id TEXT NOT NULL REFERENCES ponto_shift_plans(id) ON DELETE CASCADE,
      day_of_week INTEGER,
      calendar_date TEXT,
      day_of_month INTEGER,
      work_schedule_id TEXT REFERENCES ponto_work_schedules(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ponto_adjustment_requests (
      id TEXT PRIMARY KEY,
      employee_id TEXT NOT NULL REFERENCES ponto_employees(id) ON DELETE CASCADE,
      person_id TEXT REFERENCES people(id) ON DELETE SET NULL,
      server_date TEXT NOT NULL,
      kind TEXT NOT NULL,
      punch_type TEXT,
      requested_time TEXT NOT NULL,
      note TEXT,
      status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED')),
      admin_note TEXT,
      reviewed_by TEXT,
      reviewed_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ponto_competences (
      id TEXT PRIMARY KEY,
      year INTEGER NOT NULL,
      month INTEGER NOT NULL,
      label TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'OPEN' CHECK(status IN ('OPEN', 'CLOSED')),
      closed_at TEXT,
      closed_by TEXT,
      reopened_at TEXT,
      reopened_by TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(year, month)
    );

    CREATE TABLE IF NOT EXISTS ponto_notices (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      priority TEXT NOT NULL DEFAULT 'normal',
      pinned INTEGER NOT NULL DEFAULT 0,
      valid_from TEXT,
      valid_to TEXT,
      targets_json TEXT NOT NULL DEFAULT '["all"]',
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ponto_notice_reads (
      notice_id TEXT NOT NULL REFERENCES ponto_notices(id) ON DELETE CASCADE,
      person_id TEXT NOT NULL REFERENCES people(id) ON DELETE CASCADE,
      read_at TEXT NOT NULL,
      PRIMARY KEY (notice_id, person_id)
    );

    CREATE TABLE IF NOT EXISTS ponto_employee_documents (
      id TEXT PRIMARY KEY,
      employee_id TEXT NOT NULL REFERENCES ponto_employees(id) ON DELETE CASCADE,
      person_id TEXT REFERENCES people(id) ON DELETE SET NULL,
      category TEXT NOT NULL,
      label TEXT,
      file_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      requires_ack INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ponto_document_reads (
      document_id TEXT NOT NULL REFERENCES ponto_employee_documents(id) ON DELETE CASCADE,
      person_id TEXT NOT NULL REFERENCES people(id) ON DELETE CASCADE,
      read_at TEXT NOT NULL,
      PRIMARY KEY (document_id, person_id)
    );

    CREATE INDEX IF NOT EXISTS idx_shift_entries_plan ON ponto_shift_plan_entries(plan_id);
    CREATE INDEX IF NOT EXISTS idx_adjustment_employee ON ponto_adjustment_requests(employee_id);
    CREATE INDEX IF NOT EXISTS idx_adjustment_status ON ponto_adjustment_requests(status);
    CREATE INDEX IF NOT EXISTS idx_notices_active ON ponto_notices(active);
  `);

  try {
    db.exec("ALTER TABLE ponto_employees ADD COLUMN shift_plan_id TEXT REFERENCES ponto_shift_plans(id) ON DELETE SET NULL");
  } catch (e) {
    if (!String(e.message).includes("duplicate column name")) throw e;
  }
  try {
    db.exec("ALTER TABLE ponto_users ADD COLUMN person_id TEXT REFERENCES people(id) ON DELETE SET NULL");
  } catch (e) {
    if (!String(e.message).includes("duplicate column name")) throw e;
  }

  seedCollaboratorRole(db);
}

export function seedCollaboratorRole(db) {
  const hasRoles = db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'roles'").get();
  if (!hasRoles) return;
  const now = new Date().toISOString();
  if (!db.prepare("SELECT id FROM roles WHERE id = ?").get(COLLABORATOR_ROLE_ID)) {
    db.prepare("INSERT INTO roles (id, name, description, system, created_at) VALUES (?, ?, ?, 1, ?)").run(
      COLLABORATOR_ROLE_ID,
      "Colaborador A1",
      "Acesso ao Portal, ponto e tarefas",
      now,
    );
  }
  for (const code of COLLABORATOR_PERMS) {
    const perm = db.prepare("SELECT id FROM permissions WHERE code = ?").get(code);
    if (!perm) continue;
    const linked = db.prepare("SELECT 1 FROM role_permissions WHERE role_id = ? AND permission_id = ?").get(
      COLLABORATOR_ROLE_ID,
      perm.id,
    );
    if (!linked) {
      db.prepare("INSERT INTO role_permissions (role_id, permission_id, created_at) VALUES (?, ?, ?)").run(
        COLLABORATOR_ROLE_ID,
        perm.id,
        now,
      );
    }
  }
}

function createId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function nowIso() {
  return new Date().toISOString();
}

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(String(password), salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function parseDateParts(dateStr) {
  const [y, m] = String(dateStr).slice(0, 7).split("-").map(Number);
  return { year: y, month: m };
}

function mapShiftPlan(db, row) {
  if (!row) return null;
  const entries = db
    .prepare(
      `SELECT id, day_of_week AS dayOfWeek, calendar_date AS calendarDate, day_of_month AS dayOfMonth,
              work_schedule_id AS workScheduleId
       FROM ponto_shift_plan_entries WHERE plan_id = ? ORDER BY day_of_week, day_of_month, calendar_date`,
    )
    .all(row.id);
  return {
    id: row.id,
    name: row.name,
    planType: row.plan_type,
    referenceYear: row.reference_year,
    referenceMonth: row.reference_month,
    active: Boolean(row.active),
    entries,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function getShiftPlan(db, id) {
  const row = db.prepare("SELECT * FROM ponto_shift_plans WHERE id = ?").get(id);
  return mapShiftPlan(db, row);
}

export function resolveScheduleForDate(db, employeeId, dateStr) {
  const emp = db.prepare("SELECT work_schedule_id, shift_plan_id FROM ponto_employees WHERE id = ?").get(employeeId);
  if (!emp) return { off: true, schedule: null };

  if (emp.shift_plan_id) {
    const plan = getShiftPlan(db, emp.shift_plan_id);
    if (plan) {
      const date = new Date(`${dateStr}T12:00:00`);
      const dow = date.getDay();
      const dom = date.getDate();

      let entry = null;
      if (plan.planType === "weekly") {
        entry = plan.entries.find((e) => e.dayOfWeek === dow);
      } else {
        entry =
          plan.entries.find((e) => e.calendarDate === dateStr) ||
          plan.entries.find((e) => e.dayOfMonth === dom && !e.calendarDate) ||
          plan.entries.find((e) => e.dayOfWeek === dow && !e.calendarDate && !e.dayOfMonth);
      }

      if (entry) {
        if (!entry.workScheduleId) return { off: true, schedule: null, planName: plan.name };
        const sched = db.prepare("SELECT * FROM ponto_work_schedules WHERE id = ?").get(entry.workScheduleId);
        return {
          off: false,
          planName: plan.name,
          schedule: sched
            ? {
                name: sched.name,
                startTime: sched.start_time,
                lunchStartTime: sched.lunch_start_time,
                lunchEndTime: sched.lunch_end_time,
                endTime: sched.end_time,
              }
            : null,
        };
      }
    }
  }

  if (emp.work_schedule_id) {
    const sched = db.prepare("SELECT * FROM ponto_work_schedules WHERE id = ?").get(emp.work_schedule_id);
    return {
      off: false,
      schedule: sched
        ? {
            name: sched.name,
            startTime: sched.start_time,
            lunchStartTime: sched.lunch_start_time,
            lunchEndTime: sched.lunch_end_time,
            endTime: sched.end_time,
          }
        : null,
    };
  }

  return { off: true, schedule: null };
}

export function isCompetenceClosed(db, dateStr) {
  const { year, month } = parseDateParts(dateStr);
  const row = db.prepare("SELECT status FROM ponto_competences WHERE year = ? AND month = ?").get(year, month);
  return row?.status === "CLOSED";
}

export function ensureCompetenceOpen(db, dateStr, HttpError) {
  if (isCompetenceClosed(db, dateStr)) {
    const msg = "Competência fechada. Não é possível alterar registros deste período.";
    if (HttpError) throw new HttpError(403, msg);
    const error = new Error(msg);
    error.status = 403;
    throw error;
  }
}

function mapAdjustment(row) {
  return {
    id: row.id,
    employeeId: row.employee_id,
    personId: row.person_id,
    serverDate: row.server_date,
    kind: row.kind,
    kindLabel: ADJUSTMENT_KINDS[row.kind]?.label || row.kind,
    punchType: row.punch_type,
    requestedTime: row.requested_time,
    note: row.note,
    status: row.status,
    adminNote: row.admin_note,
    reviewedBy: row.reviewed_by,
    reviewedAt: row.reviewed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    employeeName: row.employee_name || null,
  };
}

function audit(db, { personId, module, action, afterJson, beforeJson }) {
  writeAuditLog(db, {
    personId: personId || null,
    application: "time",
    module,
    action,
    afterJson,
    beforeJson,
  });
}

function saveDocumentFile(uploadsDir, base64Data, fileName) {
  const match = String(base64Data || "").match(/^data:([^;]+);base64,(.+)$/);
  if (!match) throw Object.assign(new Error("Arquivo inválido."), { status: 400 });
  const ext = (match[1].split("/")[1] || "bin").replace("jpeg", "jpg");
  const id = createId("doc");
  const safeName = String(fileName || `documento.${ext}`).replace(/[^\w.\-]+/g, "_");
  const stored = `${id}.${ext}`;
  const path = join(uploadsDir, stored);
  writeFileSync(path, Buffer.from(match[2], "base64"));
  return { filePath: `/uploads/ponto/${stored}`, fileName: safeName };
}

export function createOperationalHandlers(deps) {
  const { db, uploadsDir, readJson, sendJson, HttpError, buildRequestContext, resolvePontoEmployee, requireAdmin, requirePlatformEmployee, mapSchedule, getEmployee, generateProtocol, serverNow, createId: extCreateId } = deps;

  function cid(prefix) {
    return extCreateId ? extCreateId(prefix) : createId(prefix);
  }

  function listShiftPlans() {
    return db.prepare("SELECT * FROM ponto_shift_plans WHERE active = 1 ORDER BY name").all().map((r) => mapShiftPlan(db, r));
  }

  function createShiftPlan(body) {
    const now = nowIso();
    const id = cid("shift");
    const planType = body.planType === "monthly" ? "monthly" : "weekly";
    db.prepare(
      `INSERT INTO ponto_shift_plans (id, name, plan_type, reference_year, reference_month, active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 1, ?, ?)`,
    ).run(
      id,
      String(body.name || "Escala").trim(),
      planType,
      body.referenceYear ? Number(body.referenceYear) : null,
      body.referenceMonth ? Number(body.referenceMonth) : null,
      now,
      now,
    );
    for (const entry of body.entries || []) {
      db.prepare(
        `INSERT INTO ponto_shift_plan_entries (id, plan_id, day_of_week, calendar_date, day_of_month, work_schedule_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        cid("se"),
        id,
        entry.dayOfWeek ?? null,
        entry.calendarDate || null,
        entry.dayOfMonth ?? null,
        entry.workScheduleId || null,
        now,
      );
    }
    return getShiftPlan(db, id);
  }

  function getEmployeeReadiness(employeeId) {
    const emp = db.prepare("SELECT * FROM ponto_employees WHERE id = ?").get(employeeId);
    if (!emp) return null;

    const person = emp.person_id ? db.prepare("SELECT * FROM people WHERE id = ?").get(emp.person_id) : null;
    const access = emp.person_id ? db.prepare("SELECT * FROM person_access WHERE person_id = ?").get(emp.person_id) : null;
    const roles = emp.person_id
      ? db.prepare("SELECT role_id FROM person_roles WHERE person_id = ?").all(emp.person_id).map((r) => r.role_id)
      : [];
    const hasPortal = roles.length > 0;
    const checks = {
      person: Boolean(person?.status === "ACTIVE"),
      portal: hasPortal,
      permissions: hasPortal,
      journey: Boolean(emp.work_schedule_id),
      shift: Boolean(emp.shift_plan_id),
      access: Boolean(access?.access_status === "ACTIVE"),
      timeLink: Boolean(emp.person_id),
    };
    const ok = Object.values(checks).every(Boolean);
    const missing = Object.entries(checks)
      .filter(([, v]) => !v)
      .map(([k]) => k);

    return { employeeId, personId: emp.person_id, checks, ready: ok, missing };
  }

  function approveAdjustment(id, adminNote, reviewerPersonId) {
    const req = db
      .prepare(
        `SELECT ar.*, e.name AS employee_name FROM ponto_adjustment_requests ar
         JOIN ponto_employees e ON e.id = ar.employee_id WHERE ar.id = ?`,
      )
      .get(id);
    if (!req) throw Object.assign(new Error("Solicitação não encontrada."), { status: 404 });
    if (req.status !== "PENDING") throw Object.assign(new Error("Solicitação já processada."), { status: 400 });

    ensureCompetenceOpen(db, req.server_date, HttpError);

    const punchType = req.punch_type || ADJUSTMENT_KINDS[req.kind]?.punchType;
    if (!punchType) throw Object.assign(new Error("Tipo de batida inválido."), { status: 400 });

    const now = nowIso();
    const { recordedAt, serverDate, serverTime } = serverNow();
    const time = req.requested_time.length === 5 ? `${req.requested_time}:00` : req.requested_time;
    const recordId = cid("rec");
    const protocol = generateProtocol();

    const existing = db
      .prepare(
        `SELECT id FROM ponto_time_records WHERE employee_id = ? AND server_date = ? AND type = ? AND status != 'CANCELED'`,
      )
      .get(req.employee_id, req.server_date, punchType);

    if (existing) {
      db.prepare("UPDATE ponto_time_records SET server_time = ?, status = 'MANUAL_ADJUSTED', updated_at = ? WHERE id = ?").run(
        time,
        now,
        existing.id,
      );
    } else {
      db.prepare(
        `INSERT INTO ponto_time_records (id, employee_id, type, recorded_at, server_date, server_time, photo_url, protocol, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, '', ?, 'MANUAL_ADJUSTED', ?, ?)`,
      ).run(recordId, req.employee_id, punchType, recordedAt, req.server_date, time, protocol, now, now);
    }

    db.prepare(
      `UPDATE ponto_adjustment_requests SET status = 'APPROVED', admin_note = ?, reviewed_by = ?, reviewed_at = ?, updated_at = ? WHERE id = ?`,
    ).run(adminNote || null, reviewerPersonId || "admin", now, now, id);

    audit(db, {
      personId: req.person_id,
      module: "adjustment",
      action: "APPROVED",
      afterJson: JSON.stringify({ requestId: id, punchType, time }),
    });

    return mapAdjustment(db.prepare("SELECT ar.*, e.name AS employee_name FROM ponto_adjustment_requests ar JOIN ponto_employees e ON e.id = ar.employee_id WHERE ar.id = ?").get(id));
  }

  function getOperationalDashboard() {
    const pendingAdjustments = db.prepare("SELECT COUNT(*) AS total FROM ponto_adjustment_requests WHERE status = 'PENDING'").get().total;
    const openCompetence = db.prepare("SELECT * FROM ponto_competences WHERE status = 'OPEN' ORDER BY year DESC, month DESC LIMIT 1").get();
    const employees = db.prepare("SELECT id FROM ponto_employees WHERE status = 'ACTIVE'").all();
    let incomplete = 0;
    for (const e of employees) {
      if (!getEmployeeReadiness(e.id)?.ready) incomplete += 1;
    }
    const activeNotices = db
      .prepare("SELECT COUNT(*) AS total FROM ponto_notices WHERE active = 1")
      .get().total;
    const docs = db.prepare("SELECT COUNT(*) AS total FROM ponto_employee_documents").get().total;

    return {
      pendingAdjustments,
      openCompetence: openCompetence ? { id: openCompetence.id, label: openCompetence.label, status: openCompetence.status } : null,
      incompleteEmployees: incomplete,
      activeNotices,
      pendingDocuments: docs,
    };
  }

  async function handleOperationalApi(req, res, url) {
    const { pathname } = url;

    if (pathname === "/api/ponto/shift-plans" && req.method === "GET") {
      requireAdmin(req);
      sendJson(res, 200, { plans: listShiftPlans() });
      return true;
    }

    if (pathname === "/api/ponto/shift-plans" && req.method === "POST") {
      requireAdmin(req);
      const body = await readJson(req);
      sendJson(res, 201, { plan: createShiftPlan(body) });
      return true;
    }

    const shiftPlanMatch = pathname.match(/^\/api\/ponto\/shift-plans\/([^/]+)$/);
    if (shiftPlanMatch && req.method === "GET") {
      requireAdmin(req);
      const plan = getShiftPlan(db, shiftPlanMatch[1]);
      if (!plan) throw new HttpError(404, "Escala não encontrada.");
      sendJson(res, 200, { plan });
      return true;
    }

    if (pathname === "/api/ponto/onboarding" && req.method === "POST") {
      requireAdmin(req);
      throw new HttpError(400, `${TIME_EMPLOYEE_DEPRECATION} Use POST /api/platform/people e POST /api/ponto/time-employees.`);
    }

    const readinessMatch = pathname.match(/^\/api\/ponto\/employees\/([^/]+)\/readiness$/);
    if (readinessMatch && req.method === "GET") {
      requireAdmin(req);
      const readiness = getEmployeeReadiness(readinessMatch[1]);
      if (!readiness) throw new HttpError(404, "Funcionário não encontrado.");
      sendJson(res, 200, { readiness });
      return true;
    }

    if (pathname === "/api/ponto/schedule/today" && req.method === "GET") {
      const { employee } = requirePlatformEmployee(req, "time.report");
      const today = serverNow().serverDate;
      const resolved = resolveScheduleForDate(db, employee.id, today);
      sendJson(res, 200, { date: today, ...resolved });
      return true;
    }

    if (pathname === "/api/ponto/schedule/range" && req.method === "GET") {
      const { employee } = requirePlatformEmployee(req, "time.report");
      const start = url.searchParams.get("startDate") || serverNow().serverDate;
      const end = url.searchParams.get("endDate") || start;
      const days = [];
      const cursor = new Date(`${start}T12:00:00`);
      const endDate = new Date(`${end}T12:00:00`);
      while (cursor <= endDate) {
        const pad = (n) => String(n).padStart(2, "0");
        const dateStr = `${cursor.getFullYear()}-${pad(cursor.getMonth() + 1)}-${pad(cursor.getDate())}`;
        const resolved = resolveScheduleForDate(db, employee.id, dateStr);
        days.push({
          date: dateStr,
          weekday: cursor.toLocaleDateString("pt-BR", { weekday: "long" }),
          off: resolved.off,
          schedule: resolved.schedule,
          planName: resolved.planName || null,
        });
        cursor.setDate(cursor.getDate() + 1);
      }
      sendJson(res, 200, { days });
      return true;
    }

    if (pathname === "/api/ponto/adjustment-requests" && req.method === "GET") {
      const platformCtx = buildRequestContext(db, req);
      if (platformCtx) {
        const employee = resolvePontoEmployee(platformCtx.person.id);
        if (!employee) throw new HttpError(403, "Vínculo Time incompleto.");
        const rows = db
          .prepare(
            `SELECT ar.*, e.name AS employee_name FROM ponto_adjustment_requests ar
             JOIN ponto_employees e ON e.id = ar.employee_id
             WHERE ar.employee_id = ? ORDER BY ar.created_at DESC`,
          )
          .all(employee.id);
        sendJson(res, 200, { requests: rows.map(mapAdjustment) });
        return true;
      }
      requireAdmin(req);
      const status = url.searchParams.get("status");
      let sql = `SELECT ar.*, e.name AS employee_name FROM ponto_adjustment_requests ar JOIN ponto_employees e ON e.id = ar.employee_id WHERE 1=1`;
      const params = [];
      if (status) {
        sql += " AND ar.status = ?";
        params.push(status);
      }
      sql += " ORDER BY ar.created_at DESC";
      sendJson(res, 200, { requests: db.prepare(sql).all(...params).map(mapAdjustment) });
      return true;
    }

    if (pathname === "/api/ponto/adjustment-requests" && req.method === "POST") {
      const { ctx, employee } = requirePlatformEmployee(req, "time.adjust");
      const body = await readJson(req);
      ensureCompetenceOpen(db, body.serverDate || serverNow().serverDate, HttpError);

      const kind = String(body.kind || "");
      if (!ADJUSTMENT_KINDS[kind]) throw new HttpError(400, "Tipo de solicitação inválido.");

      const now = nowIso();
      const id = cid("adj");
      const punchType = body.punchType || ADJUSTMENT_KINDS[kind].punchType;
      if (!punchType) throw new HttpError(400, "Informe o tipo de batida.");

      db.prepare(
        `INSERT INTO ponto_adjustment_requests (id, employee_id, person_id, server_date, kind, punch_type, requested_time, note, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, ?)`,
      ).run(
        id,
        employee.id,
        ctx.person.id,
        body.serverDate,
        kind,
        punchType,
        String(body.requestedTime || "").slice(0, 8),
        String(body.note || "").trim(),
        now,
        now,
      );

      audit(db, { personId: ctx.person.id, module: "adjustment", action: "REQUESTED", afterJson: JSON.stringify({ id, kind }) });
      sendJson(res, 201, { request: mapAdjustment(db.prepare("SELECT ar.*, NULL AS employee_name FROM ponto_adjustment_requests ar WHERE ar.id = ?").get(id)) });
      return true;
    }

    const adjMatch = pathname.match(/^\/api\/ponto\/adjustment-requests\/([^/]+)$/);
    if (adjMatch) {
      const id = adjMatch[1];
      if (req.method === "POST" && pathname.endsWith("/cancel")) {
        const { ctx, employee } = requirePlatformEmployee(req, "time.adjust");
        const row = db.prepare("SELECT * FROM ponto_adjustment_requests WHERE id = ?").get(id);
        if (!row || row.employee_id !== employee.id) throw new HttpError(404, "Solicitação não encontrada.");
        if (row.status !== "PENDING") throw new HttpError(400, "Somente pendentes podem ser canceladas.");
        db.prepare("UPDATE ponto_adjustment_requests SET status = 'CANCELLED', updated_at = ? WHERE id = ?").run(nowIso(), id);
        sendJson(res, 200, { ok: true });
        return true;
      }
    }

    const adjActionMatch = pathname.match(/^\/api\/ponto\/adjustment-requests\/([^/]+)\/(approve|reject)$/);
    if (adjActionMatch && req.method === "POST") {
      requireAdmin(req);
      const body = await readJson(req);
      const id = adjActionMatch[1];
      if (adjActionMatch[2] === "approve") {
        sendJson(res, 200, { request: approveAdjustment(id, body.adminNote, null) });
      } else {
        const row = db.prepare("SELECT * FROM ponto_adjustment_requests WHERE id = ?").get(id);
        if (!row) throw new HttpError(404, "Solicitação não encontrada.");
        const now = nowIso();
        db.prepare(
          `UPDATE ponto_adjustment_requests SET status = 'REJECTED', admin_note = ?, reviewed_at = ?, updated_at = ? WHERE id = ?`,
        ).run(body.adminNote || "Rejeitado", now, now, id);
        audit(db, { personId: row.person_id, module: "adjustment", action: "REJECTED", afterJson: JSON.stringify({ id }) });
        sendJson(res, 200, { ok: true });
      }
      return true;
    }

    if (pathname === "/api/ponto/competences" && req.method === "GET") {
      requireAdmin(req);
      const rows = db.prepare("SELECT * FROM ponto_competences ORDER BY year DESC, month DESC").all();
      sendJson(res, 200, {
        competences: rows.map((r) => ({
          id: r.id,
          year: r.year,
          month: r.month,
          label: r.label,
          status: r.status,
          closedAt: r.closed_at,
          reopenedAt: r.reopened_at,
        })),
      });
      return true;
    }

    if (pathname === "/api/ponto/competences" && req.method === "POST") {
      requireAdmin(req);
      const body = await readJson(req);
      const year = Number(body.year);
      const month = Number(body.month);
      const now = nowIso();
      const id = cid("comp");
      const label = body.label || `${String(month).padStart(2, "0")}/${year}`;
      db.prepare(
        `INSERT INTO ponto_competences (id, year, month, label, status, created_at, updated_at) VALUES (?, ?, ?, ?, 'OPEN', ?, ?)`,
      ).run(id, year, month, label, now, now);
      sendJson(res, 201, { competence: { id, year, month, label, status: "OPEN" } });
      return true;
    }

    const compActionMatch = pathname.match(/^\/api\/ponto\/competences\/([^/]+)\/(close|reopen)$/);
    if (compActionMatch && req.method === "POST") {
      requireAdmin(req);
      const id = compActionMatch[1];
      const row = db.prepare("SELECT * FROM ponto_competences WHERE id = ?").get(id);
      if (!row) throw new HttpError(404, "Competência não encontrada.");
      const now = nowIso();
      if (compActionMatch[2] === "close") {
        db.prepare("UPDATE ponto_competences SET status = 'CLOSED', closed_at = ?, updated_at = ? WHERE id = ?").run(now, now, id);
        audit(db, { module: "competence", action: "CLOSED", afterJson: JSON.stringify({ id, label: row.label }) });
      } else {
        db.prepare("UPDATE ponto_competences SET status = 'OPEN', reopened_at = ?, updated_at = ? WHERE id = ?").run(now, now, id);
        audit(db, { module: "competence", action: "REOPENED", afterJson: JSON.stringify({ id, label: row.label }) });
      }
      sendJson(res, 200, { ok: true });
      return true;
    }

    if (pathname === "/api/ponto/notices" && req.method === "GET") {
      const platformCtx = buildRequestContext(db, req);
      const today = serverNow().serverDate;
      let rows = db.prepare("SELECT * FROM ponto_notices WHERE active = 1 ORDER BY pinned DESC, created_at DESC").all();
      rows = rows.filter((n) => {
        if (n.valid_from && n.valid_from > today) return false;
        if (n.valid_to && n.valid_to < today) return false;
        return true;
      });

      if (platformCtx) {
        const employee = resolvePontoEmployee(platformCtx.person.id);
        rows = rows.filter((n) => {
          const targets = JSON.parse(n.targets_json || '["all"]');
          if (targets.includes("all")) return true;
          return employee && targets.includes(employee.id);
        });
        const notices = rows.map((n) => {
          const read = db
            .prepare("SELECT read_at FROM ponto_notice_reads WHERE notice_id = ? AND person_id = ?")
            .get(n.id, platformCtx.person.id);
          return {
            id: n.id,
            title: n.title,
            message: n.message,
            priority: n.priority,
            pinned: Boolean(n.pinned),
            read: Boolean(read),
            readAt: read?.read_at || null,
            createdAt: n.created_at,
          };
        });
        sendJson(res, 200, { notices });
        return true;
      }

      requireAdmin(req);
      sendJson(res, 200, { notices: rows });
      return true;
    }

    if (pathname === "/api/ponto/notices" && req.method === "POST") {
      requireAdmin(req);
      const body = await readJson(req);
      const now = nowIso();
      const id = cid("notice");
      db.prepare(
        `INSERT INTO ponto_notices (id, title, message, priority, pinned, valid_from, valid_to, targets_json, active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
      ).run(
        id,
        body.title,
        body.message,
        body.priority || "normal",
        body.pinned ? 1 : 0,
        body.validFrom || null,
        body.validTo || null,
        JSON.stringify(body.targets || ["all"]),
        now,
        now,
      );
      audit(db, { module: "notice", action: "CREATED", afterJson: JSON.stringify({ id, title: body.title }) });
      sendJson(res, 201, { id });
      return true;
    }

    const noticeReadMatch = pathname.match(/^\/api\/ponto\/notices\/([^/]+)\/read$/);
    if (noticeReadMatch && req.method === "POST") {
      const { ctx } = requirePlatformEmployee(req, "portal.access");
      const noticeId = noticeReadMatch[1];
      db.prepare(
        `INSERT OR REPLACE INTO ponto_notice_reads (notice_id, person_id, read_at) VALUES (?, ?, ?)`,
      ).run(noticeId, ctx.person.id, nowIso());
      audit(db, { personId: ctx.person.id, module: "notice", action: "READ", afterJson: JSON.stringify({ noticeId }) });
      sendJson(res, 200, { ok: true });
      return true;
    }

    if (pathname === "/api/ponto/documents" && req.method === "GET") {
      const platformCtx = buildRequestContext(db, req);
      if (platformCtx) {
        const employee = resolvePontoEmployee(platformCtx.person.id);
        if (!employee) throw new HttpError(403, "Vínculo Time incompleto.");
        const rows = db
          .prepare("SELECT * FROM ponto_employee_documents WHERE employee_id = ? ORDER BY created_at DESC")
          .all(employee.id);
        const documents = rows.map((d) => {
          const read = db
            .prepare("SELECT read_at FROM ponto_document_reads WHERE document_id = ? AND person_id = ?")
            .get(d.id, platformCtx.person.id);
          return {
            id: d.id,
            category: d.category,
            label: d.label,
            fileName: d.file_name,
            filePath: d.file_path,
            requiresAck: Boolean(d.requires_ack),
            read: Boolean(read),
            readAt: read?.read_at || null,
            createdAt: d.created_at,
          };
        });
        sendJson(res, 200, { documents });
        return true;
      }
      requireAdmin(req);
      const employeeId = url.searchParams.get("employeeId");
      let sql = "SELECT * FROM ponto_employee_documents";
      const rows = employeeId ? db.prepare(`${sql} WHERE employee_id = ? ORDER BY created_at DESC`).all(employeeId) : db.prepare(`${sql} ORDER BY created_at DESC`).all();
      sendJson(res, 200, { documents: rows });
      return true;
    }

    if (pathname === "/api/ponto/documents" && req.method === "POST") {
      requireAdmin(req);
      const body = await readJson(req);
      const emp = db.prepare("SELECT id, person_id FROM ponto_employees WHERE id = ?").get(body.employeeId);
      if (!emp) throw new HttpError(404, "Funcionário não encontrado.");
      if (!existsSync(uploadsDir)) mkdirSync(uploadsDir, { recursive: true });
      const saved = saveDocumentFile(uploadsDir, body.fileData, body.fileName);
      const id = cid("pdoc");
      db.prepare(
        `INSERT INTO ponto_employee_documents (id, employee_id, person_id, category, label, file_name, file_path, requires_ack, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(id, emp.id, emp.person_id, body.category || "Outros", body.label || "", saved.fileName, saved.filePath, body.requiresAck !== false ? 1 : 0, nowIso());
      audit(db, { personId: emp.person_id, module: "document", action: "UPLOADED", afterJson: JSON.stringify({ id }) });
      sendJson(res, 201, { id });
      return true;
    }

    const docReadMatch = pathname.match(/^\/api\/ponto\/documents\/([^/]+)\/read$/);
    if (docReadMatch && req.method === "POST") {
      const { ctx } = requirePlatformEmployee(req, "portal.access");
      const docId = docReadMatch[1];
      const doc = db.prepare("SELECT * FROM ponto_employee_documents WHERE id = ?").get(docId);
      if (!doc) throw new HttpError(404, "Documento não encontrado.");
      const employee = resolvePontoEmployee(ctx.person.id);
      if (!employee || doc.employee_id !== employee.id) throw new HttpError(403, "Acesso negado.");
      db.prepare(
        `INSERT OR REPLACE INTO ponto_document_reads (document_id, person_id, read_at) VALUES (?, ?, ?)`,
      ).run(docId, ctx.person.id, nowIso());
      audit(db, { personId: ctx.person.id, module: "document", action: "READ", afterJson: JSON.stringify({ docId }) });
      sendJson(res, 200, { ok: true });
      return true;
    }

    if (pathname === "/api/ponto/operational-dashboard" && req.method === "GET") {
      requireAdmin(req);
      sendJson(res, 200, getOperationalDashboard());
      return true;
    }

    const adjCancelMatch = pathname.match(/^\/api\/ponto\/adjustment-requests\/([^/]+)\/cancel$/);
    if (adjCancelMatch && req.method === "POST") {
      const { employee } = requirePlatformEmployee(req, "time.adjust");
      const row = db.prepare("SELECT * FROM ponto_adjustment_requests WHERE id = ?").get(adjCancelMatch[1]);
      if (!row || row.employee_id !== employee.id) throw new HttpError(404, "Solicitação não encontrada.");
      if (row.status !== "PENDING") throw new HttpError(400, "Somente pendentes podem ser canceladas.");
      db.prepare("UPDATE ponto_adjustment_requests SET status = 'CANCELLED', updated_at = ? WHERE id = ?").run(nowIso(), adjCancelMatch[1]);
      sendJson(res, 200, { ok: true });
      return true;
    }

    return false;
  }

  return { handleOperationalApi, migrateOperationalSchema, resolveScheduleForDate, isCompetenceClosed, ensureCompetenceOpen, getEmployeeReadiness, getOperationalDashboard };
}

// MÖBI Time — handlers e API /api/ponto/*
// Arquitetura oficial: /docs/BIBLIA_MOBI_OS.md
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { buildRequestContext } from "../platform/server-handlers/services/auth/context.js";
import { isProduction } from "../platform/server-handlers/services/bootstrap/index.js";
import { writeAuditLog } from "../platform/server-handlers/services/auth/session.js";
import { migrateOperationalSchema, createOperationalHandlers, resolveScheduleForDate, isCompetenceClosed, ensureCompetenceOpen } from "./server-handlers/operational.js";
import { createTimeEmployeeHandlers } from "./server-handlers/time-employees.js";

const PUNCH_ORDER = ["ENTRY", "LUNCH_OUT", "LUNCH_RETURN", "EXIT"];
const PUNCH_LABELS = {
  ENTRY: "Entrada",
  LUNCH_OUT: "Saída almoço",
  LUNCH_RETURN: "Volta almoço",
  EXIT: "Saída",
};
const PORTAL_PUNCH_TYPES = {
  ENTRY: "IN",
  LUNCH_OUT: "LUNCH_OUT",
  LUNCH_RETURN: "LUNCH_IN",
  EXIT: "OUT",
};
const PORTAL_PUNCH_LABELS = {
  IN: "Registrar Entrada",
  LUNCH_OUT: "Registrar Saída para Almoço",
  LUNCH_IN: "Registrar Retorno do Almoço",
  OUT: "Registrar Saída",
};

export function initPontoDatabase(db, rootDir) {
  const uploadsDir = join(rootDir, "uploads", "ponto");
  if (!existsSync(uploadsDir)) mkdirSync(uploadsDir, { recursive: true });

  db.exec(`
    -- LEGADO (Time): substituído por people após migração. Ver /docs/IDENTITY_MIGRATION_PLAN.md
    CREATE TABLE IF NOT EXISTS ponto_users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('ADMIN', 'EMPLOYEE')),
      employee_id TEXT REFERENCES ponto_employees(id) ON DELETE SET NULL,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ponto_work_schedules (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      start_time TEXT NOT NULL,
      lunch_start_time TEXT NOT NULL,
      lunch_end_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      tolerance_minutes INTEGER NOT NULL DEFAULT 5,
      daily_work_minutes INTEGER NOT NULL DEFAULT 480,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- LEGADO (Time): substituído por people após migração. Ver /docs/IDENTITY_MIGRATION_PLAN.md
    CREATE TABLE IF NOT EXISTS ponto_employees (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      cpf TEXT,
      registration_number TEXT,
      role_name TEXT,
      department TEXT,
      admission_date TEXT,
      status TEXT NOT NULL CHECK(status IN ('ACTIVE', 'INACTIVE')) DEFAULT 'ACTIVE',
      profile_photo_url TEXT,
      work_schedule_id TEXT REFERENCES ponto_work_schedules(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ponto_time_records (
      id TEXT PRIMARY KEY,
      employee_id TEXT NOT NULL REFERENCES ponto_employees(id) ON DELETE CASCADE,
      type TEXT NOT NULL CHECK(type IN ('ENTRY', 'LUNCH_OUT', 'LUNCH_RETURN', 'EXIT')),
      recorded_at TEXT NOT NULL,
      server_date TEXT NOT NULL,
      server_time TEXT NOT NULL,
      photo_url TEXT,
      protocol TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL CHECK(status IN ('VALID', 'MANUAL_ADJUSTED', 'CANCELED')) DEFAULT 'VALID',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ponto_time_record_audits (
      id TEXT PRIMARY KEY,
      time_record_id TEXT NOT NULL REFERENCES ponto_time_records(id) ON DELETE CASCADE,
      admin_user_id TEXT NOT NULL REFERENCES ponto_users(id),
      action TEXT NOT NULL,
      old_value TEXT,
      new_value TEXT,
      reason TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ponto_manual_adjustments (
      id TEXT PRIMARY KEY,
      employee_id TEXT NOT NULL REFERENCES ponto_employees(id) ON DELETE CASCADE,
      admin_user_id TEXT NOT NULL REFERENCES ponto_users(id),
      date TEXT NOT NULL,
      type TEXT NOT NULL,
      adjusted_time TEXT NOT NULL,
      reason TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ponto_company_settings (
      id TEXT PRIMARY KEY DEFAULT 'default',
      company_name TEXT NOT NULL DEFAULT 'A1 Ponto',
      document TEXT,
      logo_url TEXT,
      address TEXT,
      default_tolerance_minutes INTEGER NOT NULL DEFAULT 5,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ponto_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES ponto_users(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_ponto_records_employee ON ponto_time_records(employee_id);
    CREATE INDEX IF NOT EXISTS idx_ponto_records_date ON ponto_time_records(server_date);
    CREATE INDEX IF NOT EXISTS idx_ponto_employees_schedule ON ponto_employees(work_schedule_id);
  `);

  seedPontoDefaults(db);
  migrateOperationalSchema(db);
}

function pontoHashPassword(password) {
  const value = String(password || "");
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(value, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function seedPontoDefaults(db) {
  const now = new Date().toISOString();
  const settings = db.prepare("SELECT id FROM ponto_company_settings WHERE id = 'default'").get();
  if (!settings) {
    db.prepare(
      `INSERT INTO ponto_company_settings (id, company_name, document, address, default_tolerance_minutes, created_at, updated_at)
       VALUES ('default', 'A1 Ponto', '', '', 5, ?, ?)`,
    ).run(now, now);
  }

  const scheduleCount = db.prepare("SELECT COUNT(*) AS total FROM ponto_work_schedules").get().total;
  if (scheduleCount === 0) {
    const scheduleId = "sched-admin-default";
    db.prepare(
      `INSERT INTO ponto_work_schedules (id, name, start_time, lunch_start_time, lunch_end_time, end_time, tolerance_minutes, daily_work_minutes, active, created_at, updated_at)
       VALUES (?, 'Administrativo', '08:00', '12:00', '13:00', '18:00', 5, 480, 1, ?, ?)`,
    ).run(scheduleId, now, now);
  }

  const admin = db.prepare("SELECT id FROM ponto_users WHERE lower(email) = 'admin@a1ponto.com'").get();
  if (!admin && process.env.NODE_ENV !== "production") {
    const hash = pontoHashPassword(String(process.env.MOBI_DEV_PONTO_PASSWORD || "dev-only-change-me"));
    db.prepare(
      `INSERT INTO ponto_users (id, name, email, password_hash, role, employee_id, active, created_at, updated_at)
       VALUES (?, 'Administrador', 'admin@a1ponto.com', ?, 'ADMIN', NULL, 1, ?, ?)`,
    ).run("ponto-admin", hash, now, now);
  }
}

export function createPontoHandlers({ db, rootDir, readJson, sendJson, sendText, HttpError, authorize }) {
  const uploadsDir = join(rootDir, "uploads", "ponto");

  function hashPassword(password) {
    const value = String(password || "");
    if (value.length < 6) throw new HttpError(400, "A senha deve ter pelo menos 6 caracteres.");
    const salt = randomBytes(16).toString("hex");
    const hash = scryptSync(value, salt, 64).toString("hex");
    return `${salt}:${hash}`;
  }

  function verifyPassword(password, storedHash) {
    if (!storedHash || !storedHash.includes(":")) return false;
    const [salt, hash] = storedHash.split(":");
    const expected = Buffer.from(hash, "hex");
    const actual = scryptSync(String(password || ""), salt, 64);
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  }

  function createId(prefix) {
    return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function required(value, label) {
    const normalized = String(value || "").trim();
    if (!normalized) throw new HttpError(400, `${label} é obrigatório.`);
    return normalized;
  }

  function parseCookies(cookieHeader) {
    return Object.fromEntries(
      (cookieHeader || "")
        .split(";")
        .map((part) => part.trim())
        .filter(Boolean)
        .map((part) => {
          const index = part.indexOf("=");
          if (index === -1) return [part, ""];
          return [part.slice(0, index), decodeURIComponent(part.slice(index + 1))];
        }),
    );
  }

  function getSessionId(req) {
    return parseCookies(req.headers.cookie || "").ponto_session || "";
  }

  function setSessionCookie(res, sessionId) {
    res.setHeader("Set-Cookie", `ponto_session=${sessionId}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${60 * 60 * 24 * 14}`);
  }

  function createSession(userId) {
    const id = randomBytes(32).toString("hex");
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 14);
    db.prepare("INSERT INTO ponto_sessions (id, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)").run(
      id,
      userId,
      now.toISOString(),
      expiresAt.toISOString(),
    );
    db.prepare("DELETE FROM ponto_sessions WHERE expires_at <= ?").run(now.toISOString());
    return id;
  }

  function publicUser(row) {
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      role: row.role,
      employeeId: row.employee_id || row.employeeId || null,
      active: Boolean(row.active),
    };
  }

  function getAuthenticatedPontoUser(req) {
    const sessionId = getSessionId(req);
    if (!sessionId) return null;
    const user = db
      .prepare(
        `SELECT u.id, u.name, u.email, u.role, u.employee_id, u.active, s.expires_at AS expiresAt
         FROM ponto_sessions s
         JOIN ponto_users u ON u.id = s.user_id
         WHERE s.id = ?`,
      )
      .get(sessionId);
    if (!user || !user.active || new Date(user.expiresAt).getTime() <= Date.now()) {
      if (sessionId) db.prepare("DELETE FROM ponto_sessions WHERE id = ?").run(sessionId);
      return null;
    }
    return publicUser(user);
  }

  function requireAdmin(req) {
    const user = getAuthenticatedPontoUser(req);
    if (user?.role === "ADMIN") return user;

    const platformCtx = buildRequestContext(db, req);
    if (platformCtx?.permissionCodes?.has("time.adjust") || platformCtx?.permissionCodes?.has("admin.users")) {
      return { id: "platform-admin", name: platformCtx.person.name, role: "ADMIN", platform: true };
    }

    if (isProduction()) {
      throw new HttpError(401, "Autenticação administrativa necessária.");
    }

    const row = db.prepare("SELECT * FROM ponto_users WHERE role = 'ADMIN' AND active = 1 LIMIT 1").get();
    if (row) return publicUser(row);
    throw new HttpError(401, "Autenticação administrativa necessária.");
  }

  function requireAuth(req, roles = null) {
    const user = getAuthenticatedPontoUser(req);
    if (!user) throw new HttpError(401, "Sessão expirada. Faça login novamente.");
    if (roles && !roles.includes(user.role)) throw new HttpError(403, "Acesso não permitido.");
    return user;
  }

  function serverNow() {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    return {
      recordedAt: now.toISOString(),
      serverDate: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
      serverTime: `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`,
    };
  }

  function mapSchedule(row) {
    if (!row) return null;
    return {
      id: row.id,
      name: row.name,
      startTime: row.start_time,
      lunchStartTime: row.lunch_start_time,
      lunchEndTime: row.lunch_end_time,
      endTime: row.end_time,
      toleranceMinutes: row.tolerance_minutes,
      dailyWorkMinutes: row.daily_work_minutes,
      active: Boolean(row.active),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  function mapEmployee(row) {
    if (!row) return null;
    return {
      id: row.id,
      name: row.name,
      cpf: row.cpf || "",
      registrationNumber: row.registration_number || "",
      roleName: row.role_name || "",
      department: row.department || "",
      admissionDate: row.admission_date || "",
      status: row.status,
      profilePhotoUrl: row.profile_photo_url || "",
      workScheduleId: row.work_schedule_id || null,
      shiftPlanId: row.shift_plan_id || null,
      personId: row.person_id || null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  function mapRecord(row) {
    return {
      id: row.id,
      employeeId: row.employee_id,
      employeeName: row.employee_name || row.employeeName || "",
      type: row.type,
      typeLabel: PUNCH_LABELS[row.type] || row.type,
      recordedAt: row.recorded_at,
      serverDate: row.server_date,
      serverTime: row.server_time,
      photoUrl: row.photo_url || "",
      protocol: row.protocol,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  function getEmployee(id) {
    const row = db.prepare("SELECT * FROM ponto_employees WHERE id = ?").get(id);
    if (!row) throw new HttpError(404, "Funcionário não encontrado.");
    return timeEmployees.enrichEmployeeFromPerson(db, mapEmployee(row));
  }

  function getSchedule(id) {
    const row = db.prepare("SELECT * FROM ponto_work_schedules WHERE id = ?").get(id);
    if (!row) throw new HttpError(404, "Jornada não encontrada.");
    return mapSchedule(row);
  }

  function listRecords(filters = {}) {
    const conditions = ["1=1"];
    const params = [];
    if (filters.employeeId) {
      conditions.push("r.employee_id = ?");
      params.push(filters.employeeId);
    }
    if (filters.startDate) {
      conditions.push("r.server_date >= ?");
      params.push(filters.startDate);
    }
    if (filters.endDate) {
      conditions.push("r.server_date <= ?");
      params.push(filters.endDate);
    }
    if (filters.type) {
      conditions.push("r.type = ?");
      params.push(filters.type);
    }
    if (filters.serverDate) {
      conditions.push("r.server_date = ?");
      params.push(filters.serverDate);
    }
    const sql = `SELECT r.*, e.name AS employee_name
      FROM ponto_time_records r
      JOIN ponto_employees e ON e.id = r.employee_id
      WHERE ${conditions.join(" AND ")}
      ORDER BY r.recorded_at DESC`;
    return db.prepare(sql).all(...params).map(mapRecord);
  }

  function resolvePontoEmployee(personId) {
    if (!personId) return null;
    const row = db.prepare("SELECT * FROM ponto_employees WHERE person_id = ? AND status = 'ACTIVE'").get(personId);
    return row ? mapEmployee(row) : null;
  }

  function requirePlatformEmployee(req, permission) {
    const ctx = authorize ? authorize(req, permission ? { permission } : {}) : buildRequestContext(db, req);
    if (!ctx?.person) throw new HttpError(401, "Sessão expirada. Faça login novamente.");
    if (ctx.person.status !== "ACTIVE") throw new HttpError(403, "Pessoa inativa ou bloqueada.");
    if (permission && !ctx.permissionCodes.has(permission)) {
      throw new HttpError(403, "Permissão insuficiente.");
    }
    const employee = resolvePontoEmployee(ctx.person.id);
    if (!employee) {
      throw new HttpError(
        403,
        "Cadastro incompleto: vínculo com MÖBI Time não encontrado (ponto_employees.person_id).",
      );
    }
    return { ctx, employee };
  }

  function mapRecordToPortal(record) {
    return {
      type: PORTAL_PUNCH_TYPES[record.type] || record.type,
      time: String(record.serverTime || "").slice(0, 5),
      protocol: record.protocol,
    };
  }

  function derivePortalPhase(recordsToday, nextType) {
    if (!nextType) return "day_complete";
    const types = recordsToday.map((r) => r.type);
    if (nextType === "ENTRY") return "before_entry";
    if (nextType === "LUNCH_OUT") return "working";
    if (nextType === "LUNCH_RETURN") return "lunch_out";
    if (nextType === "EXIT") {
      if (types.includes("LUNCH_RETURN")) return "before_exit";
      if (types.includes("LUNCH_OUT")) return "lunch_return";
      return "before_exit";
    }
    return "working";
  }

  function getTodayRecords(employeeId) {
    const { serverDate } = serverNow();
    return listRecords({ employeeId, serverDate }).filter((r) => r.status !== "CANCELED");
  }

  function buildEmployeePunchStatus(employeeId) {
    const records = getTodayRecords(employeeId);
    const nextType = getNextPunchType(records);
    const { serverDate } = serverNow();
    const resolved = resolveScheduleForDate(db, employeeId, serverDate);
    const schedule = resolved.schedule
      ? {
          start: resolved.schedule.startTime?.slice(0, 5),
          end: resolved.schedule.endTime?.slice(0, 5),
          lunchStart: resolved.schedule.lunchStartTime?.slice(0, 5),
          lunchEnd: resolved.schedule.lunchEndTime?.slice(0, 5),
          label: resolved.schedule.name,
          off: resolved.off,
        }
      : null;
    const workedMinutes = calcDayWorked(records);
    const portalNextType = nextType ? PORTAL_PUNCH_TYPES[nextType] : null;

    return {
      state: derivePortalPhase(records, nextType),
      phase: derivePortalPhase(records, nextType),
      dayComplete: !nextType,
      hasEntry: records.some((r) => r.type === "ENTRY"),
      nextAction: portalNextType
        ? { type: portalNextType, label: PORTAL_PUNCH_LABELS[portalNextType] || PUNCH_LABELS[nextType] }
        : null,
      allowedActions: portalNextType ? [portalNextType.toLowerCase()] : [],
      schedule,
      todayRecords: records.map(mapRecordToPortal),
      hoursWorked: workedMinutes != null ? minutesToHHMM(workedMinutes) : null,
      records,
      offToday: resolved.off,
    };
  }

  function registerEmployeePunch(employeeId) {
    const records = getTodayRecords(employeeId);
    const nextType = getNextPunchType(records);
    if (!nextType) throw new HttpError(400, "Jornada do dia já concluída.");

    const { recordedAt, serverDate, serverTime } = serverNow();
    ensureCompetenceOpen(db, serverDate, HttpError);
    const id = createId("rec");
    const protocol = generateProtocol();
    db.prepare(
      `INSERT INTO ponto_time_records (id, employee_id, type, recorded_at, server_date, server_time, photo_url, protocol, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, '', ?, 'VALID', ?, ?)`,
    ).run(id, employeeId, nextType, recordedAt, serverDate, serverTime, protocol, recordedAt, recordedAt);

    try {
      const personId = db.prepare("SELECT person_id FROM ponto_employees WHERE id = ?").get(employeeId)?.person_id;
      writeAuditLog(db, {
        personId: personId || null,
        application: "time",
        module: "punch",
        action: "CLOCK",
        afterJson: JSON.stringify({ type: nextType, protocol, employeeId }),
      });
    } catch {
      // auditoria não bloqueia registro
    }

    return { id, protocol, type: PORTAL_PUNCH_TYPES[nextType], status: buildEmployeePunchStatus(employeeId) };
  }


  function getNextPunchType(recordsToday) {
    const types = recordsToday.map((r) => r.type);
    for (const type of PUNCH_ORDER) {
      if (!types.includes(type)) return type;
    }
    return null;
  }

  function timeToMinutes(time) {
    const [h, m] = String(time || "00:00").split(":").map(Number);
    return h * 60 + (m || 0);
  }

  function minutesToHHMM(minutes) {
    const sign = minutes < 0 ? "-" : "";
    const abs = Math.abs(minutes);
    const h = Math.floor(abs / 60);
    const m = abs % 60;
    return `${sign}${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }

  function calcDayWorked(records) {
    const byType = {};
    for (const r of records) {
      if (r.status === "CANCELED") continue;
      byType[r.type] = r.serverTime.slice(0, 5);
    }
    if (!byType.ENTRY || !byType.EXIT) return null;
    let total = timeToMinutes(byType.EXIT) - timeToMinutes(byType.ENTRY);
    if (byType.LUNCH_OUT && byType.LUNCH_RETURN) {
      total -= timeToMinutes(byType.LUNCH_RETURN) - timeToMinutes(byType.LUNCH_OUT);
    }
    return total;
  }

  function buildTimesheet(employeeId, startDate, endDate) {
    const employee = getEmployee(employeeId);
    const schedule = employee.workScheduleId ? getSchedule(employee.workScheduleId) : null;
    const records = listRecords({ employeeId, startDate, endDate });
    const byDate = {};
    for (const r of records) {
      if (!byDate[r.serverDate]) byDate[r.serverDate] = [];
      byDate[r.serverDate].push(r);
    }

    const days = [];
    let totalExpected = 0;
    let totalWorked = 0;
    let incompleteDays = 0;
    let lateDays = 0;
    let absentDays = 0;

    const cursor = new Date(startDate + "T12:00:00");
    const end = new Date(endDate + "T12:00:00");
    while (cursor <= end) {
      const pad = (n) => String(n).padStart(2, "0");
      const dateStr = `${cursor.getFullYear()}-${pad(cursor.getMonth() + 1)}-${pad(cursor.getDate())}`;
      const dayRecords = byDate[dateStr] || [];
      const byType = {};
      for (const r of dayRecords) {
        if (r.status !== "CANCELED") byType[r.type] = r.serverTime.slice(0, 5);
      }

      const hasAll = PUNCH_ORDER.every((t) => byType[t]);
      const worked = calcDayWorked(dayRecords);
      const expected = schedule?.dailyWorkMinutes ?? 480;
      let overtime = 0;
      let negative = 0;
      let observation = "";

      if (dayRecords.length === 0) {
        const dayOfWeek = cursor.getDay();
        if (dayOfWeek >= 1 && dayOfWeek <= 5) {
          absentDays += 1;
          observation = "Falta";
        }
      } else if (!hasAll) {
        incompleteDays += 1;
        observation = "Incompleto";
      } else {
        totalExpected += expected;
        totalWorked += worked;
        const diff = worked - expected;
        if (diff > 0) overtime = diff;
        if (diff < 0) negative = Math.abs(diff);
        if (schedule && byType.ENTRY) {
          const entryMin = timeToMinutes(byType.ENTRY);
          const expectedEntry = timeToMinutes(schedule.startTime) + (schedule.toleranceMinutes || 0);
          if (entryMin > expectedEntry) {
            lateDays += 1;
            observation = observation ? `${observation}; Atraso` : "Atraso";
          }
        }
      }

      days.push({
        date: dateStr,
        entry: byType.ENTRY || "—",
        lunchOut: byType.LUNCH_OUT || "—",
        lunchReturn: byType.LUNCH_RETURN || "—",
        exit: byType.EXIT || "—",
        workedMinutes: worked,
        workedLabel: worked != null ? minutesToHHMM(worked) : "—",
        expectedMinutes: hasAll ? expected : null,
        overtimeMinutes: overtime,
        overtimeLabel: overtime ? minutesToHHMM(overtime) : "—",
        negativeMinutes: negative,
        negativeLabel: negative ? minutesToHHMM(negative) : "—",
        observation,
        incomplete: dayRecords.length > 0 && !hasAll,
      });

      cursor.setDate(cursor.getDate() + 1);
    }

    const balance = totalWorked - totalExpected;
    return {
      employee,
      schedule,
      days,
      summary: {
        totalExpectedMinutes: totalExpected,
        totalExpectedLabel: minutesToHHMM(totalExpected),
        totalWorkedMinutes: totalWorked,
        totalWorkedLabel: minutesToHHMM(totalWorked),
        balanceMinutes: balance,
        balanceLabel: (balance >= 0 ? "+" : "") + minutesToHHMM(balance),
        lateDays,
        absentDays,
        incompleteDays,
      },
    };
  }

  function savePhoto(base64Data) {
    const match = String(base64Data || "").match(/^data:([^;]+);base64,(.+)$/);
    if (!match) throw new HttpError(400, "Foto inválida.");
    const [, mime, data] = match;
    const ext = mime.includes("png") ? "png" : "jpg";
    const filename = `${createId("photo")}.${ext}`;
    const filePath = join(uploadsDir, filename);
    writeFileSync(filePath, Buffer.from(data, "base64"));
    return `/uploads/ponto/${filename}`;
  }

  function generateProtocol() {
    return `PT-${Date.now()}-${randomBytes(3).toString("hex").toUpperCase()}`;
  }

  function getDashboard() {
    const today = serverNow().serverDate;
    const activeEmployees = db.prepare("SELECT COUNT(*) AS total FROM ponto_employees WHERE status = 'ACTIVE'").get().total;
    const todayRecords = listRecords({ serverDate: today });
    const validToday = todayRecords.filter((r) => r.status !== "CANCELED");
    const employeesWithEntry = new Set(validToday.filter((r) => r.type === "ENTRY").map((r) => r.employeeId));
    const presentToday = employeesWithEntry.size;

    const schedules = db.prepare("SELECT * FROM ponto_work_schedules WHERE active = 1").all();
    const scheduleMap = Object.fromEntries(schedules.map((s) => [s.id, s]));
    let lateToday = 0;
    for (const empId of employeesWithEntry) {
      const entry = validToday.find((r) => r.employeeId === empId && r.type === "ENTRY");
      const emp = db.prepare("SELECT work_schedule_id FROM ponto_employees WHERE id = ?").get(empId);
      const sched = emp?.work_schedule_id ? scheduleMap[emp.work_schedule_id] : null;
      if (entry && sched) {
        const entryMin = timeToMinutes(entry.serverTime);
        const limit = timeToMinutes(sched.start_time) + (sched.tolerance_minutes || 0);
        if (entryMin > limit) lateToday += 1;
      }
    }

    const activeIds = db.prepare("SELECT id FROM ponto_employees WHERE status = 'ACTIVE'").all().map((r) => r.id);
    const missingEntry = activeIds.filter((id) => !employeesWithEntry.has(id)).length;

    return {
      activeEmployees,
      presentToday,
      lateToday,
      missingEntry,
      recordsToday: validToday.length,
      recentRecords: validToday.slice(0, 20),
    };
  }

  function buildReport(type, filters) {
    const { startDate, endDate, employeeId } = filters;
    const employees = employeeId
      ? [getEmployee(employeeId)]
      : db.prepare("SELECT * FROM ponto_employees WHERE status = 'ACTIVE'").all().map(mapEmployee);

    const rows = [];
    for (const emp of employees) {
      const sheet = buildTimesheet(emp.id, startDate, endDate);
      if (type === "monthly" || type === "general") {
        rows.push({
          employee: emp.name,
          worked: sheet.summary.totalWorkedLabel,
          expected: sheet.summary.totalExpectedLabel,
          balance: sheet.summary.balanceLabel,
          lateDays: sheet.summary.lateDays,
          absentDays: sheet.summary.absentDays,
          incompleteDays: sheet.summary.incompleteDays,
        });
      } else if (type === "late") {
        const lateDays = sheet.days.filter((d) => d.observation.includes("Atraso"));
        if (lateDays.length) rows.push({ employee: emp.name, days: lateDays });
      } else if (type === "absent") {
        const absent = sheet.days.filter((d) => d.observation === "Falta");
        if (absent.length) rows.push({ employee: emp.name, days: absent });
      } else if (type === "overtime") {
        const ot = sheet.days.filter((d) => d.overtimeMinutes > 0);
        if (ot.length) rows.push({ employee: emp.name, days: ot });
      } else if (type === "incomplete") {
        const inc = sheet.days.filter((d) => d.incomplete);
        if (inc.length) rows.push({ employee: emp.name, days: inc });
      }
    }
    return { type, startDate, endDate, rows };
  }

  const timeEmployees = createTimeEmployeeHandlers({
    db,
    readJson,
    sendJson,
    HttpError,
    requireAdmin,
    createId,
    mapEmployee,
  });

  const operational = createOperationalHandlers({
    db,
    uploadsDir,
    readJson,
    sendJson,
    HttpError,
    buildRequestContext,
    resolvePontoEmployee,
    requireAdmin,
    requirePlatformEmployee,
    getEmployee,
    generateProtocol,
    serverNow,
    createId,
  });

  async function handlePontoApi(req, res, url) {
    const { pathname } = url;

    if (await timeEmployees.handleTimeEmployeeApi(req, res, url)) return;
    if (await operational.handleOperationalApi(req, res, url)) return;

    if (pathname === "/api/ponto/login" && req.method === "POST") {
      const body = await readJson(req);
      const email = String(body.email || "").trim().toLowerCase();
      const password = String(body.password || "");
      const user = db
        .prepare("SELECT * FROM ponto_users WHERE lower(email) = ? AND active = 1")
        .get(email);
      if (!user || !verifyPassword(password, user.password_hash)) {
        throw new HttpError(401, "E-mail ou senha inválidos.");
      }
      const sessionId = createSession(user.id);
      setSessionCookie(res, sessionId);
      sendJson(res, 200, { user: publicUser(user) });
      return;
    }

    if (pathname === "/api/ponto/logout" && req.method === "POST") {
      const sessionId = getSessionId(req);
      if (sessionId) db.prepare("DELETE FROM ponto_sessions WHERE id = ?").run(sessionId);
      res.setHeader("Set-Cookie", "ponto_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0");
      sendJson(res, 200, { ok: true });
      return;
    }

    if (pathname === "/api/ponto/me" && req.method === "GET") {
      sendJson(res, 200, { authenticated: true, user: requireAdmin(req) });
      return;
    }

    if (pathname === "/api/ponto/dashboard" && req.method === "GET") {
      requireAdmin(req);
      const dashboard = getDashboard();
      try {
        dashboard.operational = operational.getOperationalDashboard();
      } catch {
        dashboard.operational = null;
      }
      sendJson(res, 200, dashboard);
      return;
    }

    if (pathname === "/api/ponto/settings" && req.method === "GET") {
      requireAdmin(req);
      const row = db.prepare("SELECT * FROM ponto_company_settings WHERE id = 'default'").get();
      sendJson(res, 200, {
        companyName: row.company_name,
        document: row.document || "",
        logoUrl: row.logo_url || "",
        address: row.address || "",
        defaultToleranceMinutes: row.default_tolerance_minutes,
      });
      return;
    }

    if (pathname === "/api/ponto/settings" && req.method === "PUT") {
      requireAdmin(req);
      const body = await readJson(req);
      const now = new Date().toISOString();
      db.prepare(
        `UPDATE ponto_company_settings SET company_name = ?, document = ?, logo_url = ?, address = ?, default_tolerance_minutes = ?, updated_at = ? WHERE id = 'default'`,
      ).run(
        String(body.companyName || "A1 Ponto").trim(),
        String(body.document || "").trim(),
        String(body.logoUrl || "").trim(),
        String(body.address || "").trim(),
        Number(body.defaultToleranceMinutes) || 5,
        now,
      );
      sendJson(res, 200, { ok: true });
      return;
    }

    if (pathname === "/api/ponto/schedules") {
      if (req.method === "GET") {
        requireAdmin(req);
        const rows = db.prepare("SELECT * FROM ponto_work_schedules ORDER BY name").all();
        sendJson(res, 200, { schedules: rows.map(mapSchedule) });
        return;
      }
      if (req.method === "POST") {
        requireAdmin(req);
        const body = await readJson(req);
        const now = new Date().toISOString();
        const id = createId("sched");
        db.prepare(
          `INSERT INTO ponto_work_schedules (id, name, start_time, lunch_start_time, lunch_end_time, end_time, tolerance_minutes, daily_work_minutes, active, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ).run(
          id,
          required(body.name, "Nome"),
          required(body.startTime, "Entrada"),
          required(body.lunchStartTime, "Saída almoço"),
          required(body.lunchEndTime, "Volta almoço"),
          required(body.endTime, "Saída"),
          Number(body.toleranceMinutes) || 5,
          Number(body.dailyWorkMinutes) || 480,
          body.active === false ? 0 : 1,
          now,
          now,
        );
        sendJson(res, 201, mapSchedule(db.prepare("SELECT * FROM ponto_work_schedules WHERE id = ?").get(id)));
        return;
      }
    }

    const schedMatch = pathname.match(/^\/api\/ponto\/schedules\/([^/]+)$/);
    if (schedMatch) {
      const id = schedMatch[1];
      if (req.method === "PUT") {
        requireAdmin(req);
        const body = await readJson(req);
        const now = new Date().toISOString();
        const result = db.prepare(
          `UPDATE ponto_work_schedules SET name = ?, start_time = ?, lunch_start_time = ?, lunch_end_time = ?, end_time = ?, tolerance_minutes = ?, daily_work_minutes = ?, active = ?, updated_at = ? WHERE id = ?`,
        ).run(
          required(body.name, "Nome"),
          required(body.startTime, "Entrada"),
          required(body.lunchStartTime, "Saída almoço"),
          required(body.lunchEndTime, "Volta almoço"),
          required(body.endTime, "Saída"),
          Number(body.toleranceMinutes) || 5,
          Number(body.dailyWorkMinutes) || 480,
          body.active === false ? 0 : 1,
          now,
          id,
        );
        if (result.changes === 0) throw new HttpError(404, "Jornada não encontrada.");
        sendJson(res, 200, getSchedule(id));
        return;
      }
      if (req.method === "DELETE") {
        requireAdmin(req);
        db.prepare("UPDATE ponto_work_schedules SET active = 0, updated_at = ? WHERE id = ?").run(new Date().toISOString(), id);
        sendJson(res, 200, { ok: true });
        return;
      }
    }

    if (pathname === "/api/ponto/employees") {
      if (req.method === "GET") {
        requireAdmin(req);
        const rows = db.prepare("SELECT * FROM ponto_employees ORDER BY name").all();
        sendJson(res, 200, {
          employees: rows.map((r) => timeEmployees.enrichEmployeeFromPerson(db, mapEmployee(r))),
        });
        return;
      }
      if (req.method === "POST") {
        requireAdmin(req);
        const body = await readJson(req);
        if (body.personId) {
          const employee = timeEmployees.linkTimeEmployee(body);
          timeEmployees.sendDeprecated(res, 201, { employee, migratedTo: "/api/ponto/time-employees" });
          return;
        }
        throw new HttpError(
          410,
          `${timeEmployees.DEPRECATION_MSG} Informe personId e use POST /api/ponto/time-employees após criar a pessoa na Platform.`,
        );
      }
    }

    const empMatch = pathname.match(/^\/api\/ponto\/employees\/([^/]+)$/);
    if (empMatch) {
      const id = empMatch[1];
      if (req.method === "GET") {
        requireAdmin(req);
        const emp = getEmployee(id);
        const user = db.prepare("SELECT email FROM ponto_users WHERE employee_id = ?").get(id);
        sendJson(res, 200, { ...emp, loginEmail: user?.email || "" });
        return;
      }
      if (req.method === "PUT") {
        requireAdmin(req);
        const body = await readJson(req);
        const now = new Date().toISOString();
        const current = db.prepare("SELECT * FROM ponto_employees WHERE id = ?").get(id);
        if (!current) throw new HttpError(404, "Funcionário não encontrado.");

        if (current.person_id) {
          db.prepare(
            `UPDATE ponto_employees SET work_schedule_id = ?, shift_plan_id = ?, status = ?, updated_at = ? WHERE id = ?`,
          ).run(
            body.workScheduleId !== undefined ? body.workScheduleId || null : current.work_schedule_id,
            body.shiftPlanId !== undefined ? body.shiftPlanId || null : current.shift_plan_id,
            body.status === "INACTIVE" ? "INACTIVE" : body.status === "ACTIVE" ? "ACTIVE" : current.status,
            now,
            id,
          );
          sendJson(res, 200, getEmployee(id));
          return;
        }

        let photoUrl = current.profile_photo_url;
        if (body.profilePhotoData) photoUrl = savePhoto(body.profilePhotoData);
        db.prepare(
          `UPDATE ponto_employees SET name = ?, cpf = ?, registration_number = ?, role_name = ?, department = ?, admission_date = ?, status = ?, profile_photo_url = ?, work_schedule_id = ?, shift_plan_id = ?, updated_at = ? WHERE id = ?`,
        ).run(
          required(body.name, "Nome"),
          String(body.cpf || "").trim(),
          String(body.registrationNumber || "").trim(),
          String(body.roleName || "").trim(),
          String(body.department || "").trim(),
          String(body.admissionDate || "").trim(),
          body.status === "INACTIVE" ? "INACTIVE" : "ACTIVE",
          photoUrl,
          body.workScheduleId || null,
          body.shiftPlanId || null,
          now,
          id,
        );
        timeEmployees.sendDeprecated(res, 200, {
          employee: getEmployee(id),
          legacy: true,
          note: "Registro legado sem person_id. Dados pessoais devem ser editados na Platform.",
        });
        return;
      }
    }

    if (pathname === "/api/ponto/punch/status" && req.method === "GET") {
      const { employee } = requirePlatformEmployee(req, "time.clock");
      sendJson(res, 200, buildEmployeePunchStatus(employee.id));
      return;
    }

    if (pathname === "/api/ponto/punch" && req.method === "POST") {
      const { employee } = requirePlatformEmployee(req, "time.clock");
      sendJson(res, 201, registerEmployeePunch(employee.id));
      return;
    }

    if (pathname === "/api/ponto/records" && req.method === "GET") {
      requireAdmin(req);
      const employeeId = url.searchParams.get("employeeId") || null;
      const records = listRecords({
        employeeId: employeeId || undefined,
        startDate: url.searchParams.get("startDate") || undefined,
        endDate: url.searchParams.get("endDate") || undefined,
        type: url.searchParams.get("type") || undefined,
      });
      sendJson(res, 200, { records });
      return;
    }

    const recordMatch = pathname.match(/^\/api\/ponto\/records\/([^/]+)$/);
    if (recordMatch && req.method === "PATCH") {
      const admin = requireAdmin(req);
      const id = recordMatch[1];
      const body = await readJson(req);
      const reason = required(body.reason, "Motivo");
      const current = db.prepare("SELECT * FROM ponto_time_records WHERE id = ?").get(id);
      if (!current) throw new HttpError(404, "Registro não encontrado.");
      ensureCompetenceOpen(db, current.server_date, HttpError);

      const now = new Date().toISOString();
      const oldValue = JSON.stringify({ type: current.type, serverTime: current.server_time, status: current.status });

      if (body.cancel) {
        db.prepare("UPDATE ponto_time_records SET status = 'CANCELED', updated_at = ? WHERE id = ?").run(now, id);
        db.prepare(
          `INSERT INTO ponto_time_record_audits (id, time_record_id, admin_user_id, action, old_value, new_value, reason, created_at)
           VALUES (?, ?, ?, 'CANCEL', ?, ?, ?, ?)`,
        ).run(createId("aud"), id, admin.id, oldValue, JSON.stringify({ status: "CANCELED" }), reason, now);
      } else {
        const newTime = required(body.serverTime, "Horário");
        const newType = body.type || current.type;
        db.prepare(
          `UPDATE ponto_time_records SET type = ?, server_time = ?, status = 'MANUAL_ADJUSTED', updated_at = ? WHERE id = ?`,
        ).run(newType, newTime.length === 5 ? `${newTime}:00` : newTime, now, id);
        db.prepare(
          `INSERT INTO ponto_time_record_audits (id, time_record_id, admin_user_id, action, old_value, new_value, reason, created_at)
           VALUES (?, ?, ?, 'ADJUST', ?, ?, ?, ?)`,
        ).run(
          createId("aud"),
          id,
          admin.id,
          oldValue,
          JSON.stringify({ type: newType, serverTime: newTime, status: "MANUAL_ADJUSTED" }),
          reason,
          now,
        );
        db.prepare(
          `INSERT INTO ponto_manual_adjustments (id, employee_id, admin_user_id, date, type, adjusted_time, reason, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        ).run(createId("adj"), current.employee_id, admin.id, current.server_date, newType, newTime, reason, now);
      }
      sendJson(res, 200, { ok: true });
      return;
    }

    if (pathname === "/api/ponto/records/manual" && req.method === "POST") {
      const admin = requireAdmin(req);
      const body = await readJson(req);
      const reason = required(body.reason, "Motivo");
      const employeeId = required(body.employeeId, "Funcionário");
      const type = required(body.type, "Tipo");
      const serverDate = required(body.serverDate, "Data");
      ensureCompetenceOpen(db, serverDate, HttpError);
      const serverTime = required(body.serverTime, "Horário");
      const now = new Date().toISOString();
      const id = createId("rec");
      const protocol = generateProtocol();

      db.prepare(
        `INSERT INTO ponto_time_records (id, employee_id, type, recorded_at, server_date, server_time, photo_url, protocol, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, '', ?, 'MANUAL_ADJUSTED', ?, ?)`,
      ).run(id, employeeId, type, now, serverDate, serverTime.length === 5 ? `${serverTime}:00` : serverTime, protocol, now, now);

      db.prepare(
        `INSERT INTO ponto_manual_adjustments (id, employee_id, admin_user_id, date, type, adjusted_time, reason, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(createId("adj"), employeeId, admin.id, serverDate, type, serverTime, reason, now);

      db.prepare(
        `INSERT INTO ponto_time_record_audits (id, time_record_id, admin_user_id, action, old_value, new_value, reason, created_at)
         VALUES (?, ?, ?, 'CREATE_MANUAL', NULL, ?, ?, ?)`,
      ).run(createId("aud"), id, admin.id, JSON.stringify({ type, serverDate, serverTime }), reason, now);

      sendJson(res, 201, { ok: true, id });
      return;
    }

    if (pathname === "/api/ponto/timesheet" && req.method === "GET") {
      const platformCtx = buildRequestContext(db, req);
      if (platformCtx) {
        if (!platformCtx.permissionCodes.has("time.report")) throw new HttpError(403, "Permissão insuficiente.");
        const employee = resolvePontoEmployee(platformCtx.person.id);
        if (!employee) {
          throw new HttpError(403, "Cadastro incompleto: vínculo com MÖBI Time não encontrado (ponto_employees.person_id).");
        }
        const startDate = url.searchParams.get("startDate");
        const endDate = url.searchParams.get("endDate");
        const month = url.searchParams.get("month");
        let rangeStart = startDate;
        let rangeEnd = endDate;
        if (!rangeStart || !rangeEnd) {
          const now = new Date();
          const pad = (n) => String(n).padStart(2, "0");
          if (month && /^\d{4}-\d{2}$/.test(month)) {
            const [y, m] = month.split("-").map(Number);
            rangeStart = `${y}-${pad(m)}-01`;
            const lastDay = new Date(y, m, 0).getDate();
            rangeEnd = `${y}-${pad(m)}-${pad(lastDay)}`;
          } else {
            rangeStart = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`;
            rangeEnd = serverNow().serverDate;
          }
        }
        const settings = db.prepare("SELECT company_name, document FROM ponto_company_settings WHERE id = 'default'").get();
        sendJson(res, 200, { ...buildTimesheet(employee.id, rangeStart, rangeEnd), company: settings });
        return;
      }

      requireAdmin(req);
      const employeeId = url.searchParams.get("employeeId");
      const startDate = url.searchParams.get("startDate");
      const endDate = url.searchParams.get("endDate");
      if (!startDate || !endDate) throw new HttpError(400, "Informe período.");
      if (!employeeId) throw new HttpError(400, "Funcionário obrigatório.");
      const settings = db.prepare("SELECT company_name, document FROM ponto_company_settings WHERE id = 'default'").get();
      sendJson(res, 200, { ...buildTimesheet(employeeId, startDate, endDate), company: settings });
      return;
    }

    if (pathname === "/api/ponto/hour-bank" && req.method === "GET") {
      const platformCtx = buildRequestContext(db, req);
      if (platformCtx) {
        if (!platformCtx.permissionCodes.has("time.report")) throw new HttpError(403, "Permissão insuficiente.");
        const employee = resolvePontoEmployee(platformCtx.person.id);
        if (!employee) {
          throw new HttpError(403, "Cadastro incompleto: vínculo com MÖBI Time não encontrado (ponto_employees.person_id).");
        }
        const endDate = serverNow().serverDate;
        const start = new Date();
        start.setMonth(start.getMonth() - 1);
        const pad = (n) => String(n).padStart(2, "0");
        const startDate = `${start.getFullYear()}-${pad(start.getMonth() + 1)}-01`;
        const sheet = buildTimesheet(employee.id, startDate, endDate);
        sendJson(res, 200, {
          balance: sheet.summary.balanceLabel,
          balanceMinutes: sheet.summary.balanceMinutes,
          balanceLabel: sheet.summary.balanceLabel,
          totalWorkedLabel: sheet.summary.totalWorkedLabel,
          totalExpectedLabel: sheet.summary.totalExpectedLabel,
          incompleteDays: sheet.summary.incompleteDays,
          period: "Acumulado",
        });
        return;
      }

      requireAdmin(req);
      const employeeId = url.searchParams.get("employeeId");
      if (!employeeId) throw new HttpError(400, "Funcionário obrigatório.");
      const endDate = serverNow().serverDate;
      const start = new Date();
      start.setMonth(start.getMonth() - 1);
      const pad = (n) => String(n).padStart(2, "0");
      const startDate = `${start.getFullYear()}-${pad(start.getMonth() + 1)}-01`;
      const sheet = buildTimesheet(employeeId, startDate, endDate);
      sendJson(res, 200, {
        balanceMinutes: sheet.summary.balanceMinutes,
        balanceLabel: sheet.summary.balanceLabel,
        totalWorkedLabel: sheet.summary.totalWorkedLabel,
        totalExpectedLabel: sheet.summary.totalExpectedLabel,
        incompleteDays: sheet.summary.incompleteDays,
      });
      return;
    }

    const reportMatch = pathname.match(/^\/api\/ponto\/reports\/([^/]+)$/);
    if (reportMatch && req.method === "GET") {
      requireAdmin(req);
      const type = reportMatch[1];
      const startDate = url.searchParams.get("startDate");
      const endDate = url.searchParams.get("endDate");
      if (!startDate || !endDate) throw new HttpError(400, "Informe período.");
      sendJson(res, 200, buildReport(type, {
        startDate,
        endDate,
        employeeId: url.searchParams.get("employeeId") || null,
      }));
      return;
    }

    if (pathname === "/api/ponto/profile" && req.method === "GET") {
      const platformCtx = buildRequestContext(db, req);
      if (platformCtx) {
        const employee = resolvePontoEmployee(platformCtx.person.id);
        const employment = db.prepare("SELECT * FROM person_employment WHERE person_id = ?").get(platformCtx.person.id);
        sendJson(res, 200, {
          person: platformCtx.person,
          employee,
          employment: employment
            ? {
                company: employment.company,
                jobTitle: employment.job_title,
                departmentId: employment.department_id,
                employeeCode: employment.employee_code,
              }
            : null,
        });
        return;
      }
      const user = requireAdmin(req);
      sendJson(res, 200, { user, employee: null });
      return;
    }

    if (pathname === "/api/ponto/profile/password" && req.method === "PUT") {
      throw new HttpError(403, "Alteração de senha disponível no painel do colaborador (em breve).");
    }

    sendJson(res, 404, { error: "Rota do Mobi Time não encontrada." });
  }

  return { handlePontoApi };
}

/**
 * MÖBI Time — vínculo operacional pessoa ↔ domínio de ponto.
 * A Platform é dona de people; o Time apenas consome person_id.
 */
import { writeAuditLog } from "../../platform/server-handlers/services/auth/session.js";

const DEPRECATION_MSG =
  "Este endpoint está depreciado. Cadastre colaboradores em Admin → Pessoas → Novo Colaborador (Wizard oficial da Platform).";

export { DEPRECATION_MSG };

export function enrichEmployeeFromPerson(db, employee) {
  if (!employee?.personId) return employee;
  const person = db.prepare("SELECT name, cpf, email, photo FROM people WHERE id = ?").get(employee.personId);
  const employment = db
    .prepare("SELECT job_title, hired_at FROM person_employment WHERE person_id = ?")
    .get(employee.personId);
  const dept = db
    .prepare(
      `SELECT d.name FROM person_employment pe
       LEFT JOIN departments d ON d.id = pe.department_id
       WHERE pe.person_id = ?`,
    )
    .get(employee.personId);
  if (!person) return employee;
  return {
    ...employee,
    name: person.name || employee.name,
    cpf: person.cpf || employee.cpf || "",
    email: person.email || "",
    roleName: employment?.job_title || employee.roleName || "",
    department: dept?.name || employee.department || "",
    admissionDate: employment?.hired_at || employee.admissionDate || "",
    profilePhotoUrl: person.photo || employee.profilePhotoUrl || "",
    platformProfileUrl: `/api/platform/people/${employee.personId}`,
  };
}

export function createTimeEmployeeHandlers(deps) {
  const { db, readJson, sendJson, HttpError, requireAdmin, createId, mapEmployee } = deps;

  function sendDeprecated(res, status, body) {
    sendJson(res, status, {
      ...body,
      deprecated: true,
      deprecationWarning: DEPRECATION_MSG,
    });
  }

  function assertPersonExists(personId) {
    const person = db.prepare("SELECT id, name, status FROM people WHERE id = ?").get(personId);
    if (!person) throw new HttpError(404, "Pessoa não encontrada na Platform.");
    if (person.status !== "ACTIVE") throw new HttpError(400, "Pessoa inativa ou bloqueada.");
    return person;
  }

  function validateScheduleIds(body) {
    if (body.workScheduleId) {
      const sched = db.prepare("SELECT id FROM ponto_work_schedules WHERE id = ? AND active = 1").get(body.workScheduleId);
      if (!sched) throw new HttpError(400, "Jornada inválida ou inativa.");
    }
    if (body.shiftPlanId) {
      const plan = db.prepare("SELECT id FROM ponto_shift_plans WHERE id = ? AND active = 1").get(body.shiftPlanId);
      if (!plan) throw new HttpError(400, "Escala inválida ou inativa.");
    }
  }

  function linkTimeEmployee(body) {
    const personId = String(body.personId || "").trim();
    if (!personId) throw new HttpError(400, "personId é obrigatório.");

    const existing = db.prepare("SELECT id FROM ponto_employees WHERE person_id = ?").get(personId);
    if (existing) throw new HttpError(409, "Esta pessoa já possui vínculo operacional no MÖBI Time.");

    const person = assertPersonExists(personId);
    validateScheduleIds(body);
    const now = new Date().toISOString();
    const empId = createId("emp");
    const status = body.operationalStatus === "INACTIVE" ? "INACTIVE" : "ACTIVE";

    db.prepare(
      `INSERT INTO ponto_employees (
        id, name, cpf, registration_number, role_name, department, admission_date,
        status, profile_photo_url, work_schedule_id, shift_plan_id, person_id, created_at, updated_at
      ) VALUES (?, ?, '', '', '', '', '', ?, '', ?, ?, ?, ?, ?)`,
    ).run(
      empId,
      person.name,
      status,
      body.workScheduleId || null,
      body.shiftPlanId || null,
      personId,
      now,
      now,
    );

    writeAuditLog(db, {
      personId,
      application: "time",
      module: "time_employee",
      action: "LINKED",
      afterJson: JSON.stringify({ employeeId: empId, workScheduleId: body.workScheduleId, shiftPlanId: body.shiftPlanId }),
    });

    const row = db.prepare("SELECT * FROM ponto_employees WHERE id = ?").get(empId);
    return enrichEmployeeFromPerson(db, mapEmployee(row));
  }

  function updateTimeEmployee(personId, body) {
    const row = db.prepare("SELECT * FROM ponto_employees WHERE person_id = ?").get(personId);
    if (!row) throw new HttpError(404, "Vínculo Time não encontrado para esta pessoa.");

    validateScheduleIds(body);
    const now = new Date().toISOString();
    db.prepare(
      `UPDATE ponto_employees SET work_schedule_id = ?, shift_plan_id = ?, status = ?, updated_at = ? WHERE person_id = ?`,
    ).run(
      body.workScheduleId !== undefined ? body.workScheduleId || null : row.work_schedule_id,
      body.shiftPlanId !== undefined ? body.shiftPlanId || null : row.shift_plan_id,
      body.operationalStatus === "INACTIVE" ? "INACTIVE" : body.operationalStatus === "ACTIVE" ? "ACTIVE" : row.status,
      now,
      personId,
    );

    const updated = db.prepare("SELECT * FROM ponto_employees WHERE person_id = ?").get(personId);
    return enrichEmployeeFromPerson(db, mapEmployee(updated));
  }

  async function handleTimeEmployeeApi(req, res, url) {
    const { pathname } = url;

    if (pathname === "/api/ponto/time-employees" && req.method === "GET") {
      requireAdmin(req);
      const rows = db.prepare("SELECT * FROM ponto_employees ORDER BY created_at DESC").all();
      sendJson(res, 200, {
        employees: rows.map((r) => enrichEmployeeFromPerson(db, mapEmployee(r))),
      });
      return true;
    }

    if (pathname === "/api/ponto/time-employees" && req.method === "POST") {
      requireAdmin(req);
      const body = await readJson(req);
      const employee = linkTimeEmployee(body);
      sendJson(res, 201, { employee });
      return true;
    }

    const byPersonMatch = pathname.match(/^\/api\/ponto\/time-employees\/by-person\/([^/]+)$/);
    if (byPersonMatch && req.method === "GET") {
      requireAdmin(req);
      const row = db.prepare("SELECT * FROM ponto_employees WHERE person_id = ?").get(byPersonMatch[1]);
      if (!row) throw new HttpError(404, "Vínculo Time não encontrado.");
      sendJson(res, 200, { employee: enrichEmployeeFromPerson(db, mapEmployee(row)) });
      return true;
    }

    const personMatch = pathname.match(/^\/api\/ponto\/time-employees\/([^/]+)$/);
    if (personMatch && req.method === "PUT") {
      requireAdmin(req);
      const body = await readJson(req);
      const employee = updateTimeEmployee(personMatch[1], body);
      sendJson(res, 200, { employee });
      return true;
    }

    return false;
  }

  return { handleTimeEmployeeApi, linkTimeEmployee, updateTimeEmployee, enrichEmployeeFromPerson, sendDeprecated, DEPRECATION_MSG };
}

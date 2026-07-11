/**
 * Homologação — cadastro oficial de colaboradores (Platform → Time).
 * Executar: node tests/collaborator-homologation.test.mjs
 */
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";
import { initPlatformDatabase } from "../platform/server-handlers.js";
import { initPontoDatabase, createPontoHandlers } from "../ponto/server-handlers.js";
import { seedCollaboratorRole } from "../ponto/server-handlers/operational.js";
import { hashPassword } from "../platform/server-handlers/services/auth/crypto.js";
import { createPlatformSession } from "../platform/server-handlers/services/auth/session.js";
import { createAuthorize } from "../platform/server-handlers/services/auth/context.js";
import { createPersonProfile } from "../platform/server-handlers/services/people/profile.js";

const rootDir = fileURLToPath(new URL("..", import.meta.url));

function setupDb() {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON;");
  initPontoDatabase(db, rootDir);
  initPlatformDatabase(db);
  seedCollaboratorRole(db);
  return db;
}

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function createApi(db) {
  const authorize = createAuthorize(db, HttpError);
  const { handlePontoApi } = createPontoHandlers({
    db,
    rootDir,
    readJson: async (req) => req.body || {},
    sendJson: (res, status, body) => {
      res.statusCode = status;
      res.body = body;
    },
    sendText: () => {},
    HttpError,
    authorize,
  });

  async function call(method, pathname, body = null, cookies = "") {
    const res = { statusCode: 0, body: null };
    try {
      await handlePontoApi(
        { method, headers: { cookie: cookies }, body },
        res,
        new URL(`http://localhost${pathname}`),
      );
    } catch (error) {
      res.statusCode = error.status || 500;
      res.body = { error: error.message };
    }
    return res;
  }

  return { call, db };
}

function adminSession(db) {
  const now = new Date().toISOString();
  const passwordHash = hashPassword("TestSecurePass2026!");
  db.prepare("UPDATE people SET email = 'admin@test.local', updated_at = ? WHERE id = 'person-platform-default'").run(now);
  db.prepare(
    `INSERT OR REPLACE INTO person_access (person_id, username, password_hash, access_status, mfa_enabled, updated_at)
     VALUES ('person-platform-default', 'admin@test.local', ?, 'ACTIVE', 0, ?)`,
  ).run(passwordHash, now);
  const sessionId = createPlatformSession(db, "person-platform-default", { ip: "127.0.0.1" });
  return `platform_session=${sessionId}`;
}

const { call, db } = createApi(setupDb());
const cookie = adminSession(db);

function count(table) {
  return db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n;
}

// --- POST /api/ponto/employees sem personId deve falhar ---
const empBefore = count("ponto_employees");
const usersBefore = count("ponto_users");
const peopleBefore = count("people");

const legacyPost = await call("POST", "/api/ponto/employees", { name: "Legado Proibido", email: "legado@test.local" }, cookie);
assert.equal(legacyPost.statusCode, 410, "POST /employees sem personId deve retornar 410");
assert.equal(count("ponto_employees"), empBefore, "ponto_employees não deve aumentar");
assert.equal(count("ponto_users"), usersBefore, "ponto_users não deve aumentar");
assert.equal(count("people"), peopleBefore, "people não deve aumentar");

// --- POST /api/ponto/onboarding bloqueado ---
const onboarding = await call("POST", "/api/ponto/onboarding", { name: "X" }, cookie);
assert.equal(onboarding.statusCode, 400);

// --- Jornada e escala ---
const sched = await call("POST", "/api/ponto/schedules", {
  name: "Comercial", startTime: "08:00", lunchStartTime: "12:00", lunchEndTime: "13:00",
  endTime: "17:00", toleranceMinutes: 10, dailyWorkMinutes: 480,
}, cookie);
assert.equal(sched.statusCode, 201);
const scheduleId = sched.body.id;

const shift = await call("POST", "/api/ponto/shift-plans", {
  name: "Padrão", planType: "weekly",
  entries: [{ dayOfWeek: 1, workScheduleId: scheduleId }],
}, cookie);
assert.equal(shift.statusCode, 201);
const shiftPlanId = shift.body.plan.id;

// --- Pessoa via Platform (simula Wizard) ---
const person = createPersonProfile(db, {
  name: "Homologação Portal",
  email: "homolog@a1.local",
  cpf: "11122233344",
  status: "ACTIVE",
  access: { username: "homolog@a1.local", password: "senha12345", accessStatus: "ACTIVE" },
  roleIds: ["role-collaborator-a1"],
});
const usersAfterPerson = count("ponto_users");
assert.equal(usersAfterPerson, usersBefore, "createPersonProfile não deve criar ponto_users");

// --- POST /api/ponto/time-employees ---
const link = await call("POST", "/api/ponto/time-employees", {
  personId: person.id,
  workScheduleId: scheduleId,
  shiftPlanId,
}, cookie);
assert.equal(link.statusCode, 201);
assert.equal(link.body.employee.personId, person.id);
assert.equal(count("ponto_users"), usersBefore, "time-employees não deve criar ponto_users");

// --- personId duplicado ---
const dup = await call("POST", "/api/ponto/time-employees", { personId: person.id }, cookie);
assert.equal(dup.statusCode, 409);

// --- personId inexistente ---
const missing = await call("POST", "/api/ponto/time-employees", { personId: "person-inexistente" }, cookie);
assert.equal(missing.statusCode, 404);

// --- jornada inválida ---
const person2 = createPersonProfile(db, {
  name: "Segundo", email: "segundo@a1.local", status: "ACTIVE",
  access: { username: "segundo@a1.local", password: "senha12345", accessStatus: "ACTIVE" },
});
const badSched = await call("POST", "/api/ponto/time-employees", {
  personId: person2.id,
  workScheduleId: "sched-invalido",
}, cookie);
assert.equal(badSched.statusCode, 400);

// --- auditoria ---
const audit = db.prepare("SELECT * FROM audit_logs WHERE person_id = ? AND module = 'time_employee'").get(person.id);
assert.ok(audit, "deve registrar auditoria LINKED");

// --- POST /api/ponto/employees com personId (depreciado mas aceita vínculo) ---
const person3 = createPersonProfile(db, {
  name: "Terceiro", email: "terceiro@a1.local", status: "ACTIVE",
  access: { username: "terceiro@a1.local", password: "senha12345", accessStatus: "ACTIVE" },
});
const deprecatedLink = await call("POST", "/api/ponto/employees", { personId: person3.id, workScheduleId: scheduleId }, cookie);
assert.equal(deprecatedLink.statusCode, 201);
assert.equal(deprecatedLink.body.deprecated, true);

console.log("collaborator-homologation.test.mjs — OK");

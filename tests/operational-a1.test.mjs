/**
 * Testes do fluxo oficial Platform → Time (cadastro de colaborador).
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
const db = new DatabaseSync(":memory:");
db.exec("PRAGMA foreign_keys = ON;");
initPontoDatabase(db, rootDir);
initPlatformDatabase(db);
seedCollaboratorRole(db);

const HttpError = class extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
};

function sendJson(res, status, body) {
  res.statusCode = status;
  res.body = body;
}

async function readJson(req) {
  return req.body || {};
}

const authorize = createAuthorize(db, HttpError);
const { handlePontoApi } = createPontoHandlers({
  db, rootDir, readJson, sendJson, sendText: () => {}, HttpError, authorize,
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
    res.thrown = error;
  }
  return res;
}

const now = new Date().toISOString();
const passwordHash = hashPassword("TestSecurePass2026!");
db.prepare("UPDATE people SET email = 'admin@test.local', updated_at = ? WHERE id = 'person-platform-default'").run(now);
db.prepare(
  `INSERT OR REPLACE INTO person_access (person_id, username, password_hash, access_status, mfa_enabled, updated_at)
   VALUES ('person-platform-default', 'admin@test.local', ?, 'ACTIVE', 0, ?)`,
).run(passwordHash, now);
const sessionId = createPlatformSession(db, "person-platform-default", { ip: "127.0.0.1" });
const adminCookie = `platform_session=${sessionId}`;

const sched = await call("POST", "/api/ponto/schedules", {
  name: "Comercial", startTime: "08:00", lunchStartTime: "12:00", lunchEndTime: "13:00",
  endTime: "17:00", toleranceMinutes: 10, dailyWorkMinutes: 480,
}, adminCookie);
assert.equal(sched.statusCode, 201);

const scheduleId = sched.body.id;
const shift = await call("POST", "/api/ponto/shift-plans", {
  name: "Padrão", planType: "weekly",
  entries: Array.from({ length: 7 }, (_, i) => ({ dayOfWeek: i, workScheduleId: i === 0 ? null : scheduleId })),
}, adminCookie);
assert.equal(shift.statusCode, 201);

const shiftPlanId = shift.body.plan.id;

const person = createPersonProfile(db, {
  name: "Colaborador Oficial",
  email: "colab@oficial.local",
  cpf: "00000000000",
  status: "ACTIVE",
  access: { username: "colab@oficial.local", password: "senha123", accessStatus: "ACTIVE" },
  roleIds: ["role-collaborator-a1"],
});

const link = await call("POST", "/api/ponto/time-employees", {
  personId: person.id,
  workScheduleId: scheduleId,
  shiftPlanId,
}, adminCookie);
assert.equal(link.statusCode, 201);
assert.equal(link.body.employee.personId, person.id);

const deprecated = await call("POST", "/api/ponto/onboarding", { name: "X" }, adminCookie);
assert.equal(deprecated.statusCode, 400);

console.log("operational-a1.test.mjs — OK");

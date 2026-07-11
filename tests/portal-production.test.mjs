/**
 * Testes Fase 4 — hardening, isolamento e migração people.id
 * Executar: node tests/portal-production.test.mjs
 */
import { DatabaseSync } from "node:sqlite";
import { initPlatformDatabase } from "../platform/server-handlers/schema.js";
import { initPontoDatabase } from "../ponto/server-handlers.js";
import { hashPassword } from "../platform/server-handlers/services/auth/crypto.js";
import { authenticateCredentials } from "../platform/server-handlers/services/auth/login.js";
import { createPlatformSession } from "../platform/server-handlers/services/auth/session.js";
import { buildRequestContext, createAuthorize } from "../platform/server-handlers/services/auth/context.js";
import { migratePlannerPersonLinks, reportIdentityLinkGaps } from "../platform/server-handlers/migrations/identity-hardening.js";
import { assertProductionSecurity } from "../platform/server-handlers/services/bootstrap/index.js";

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const db = new DatabaseSync(":memory:");
db.exec("PRAGMA foreign_keys = ON;");
initPontoDatabase(db, process.cwd());
initPlatformDatabase(db);

const now = new Date().toISOString();
const strongPassword = "TestSecurePass2026!";
const passwordHash = hashPassword(strongPassword);

db.prepare("UPDATE people SET email = 'colab@mobi.com', updated_at = ? WHERE id = 'person-platform-default'").run(now);
db.prepare(
  `INSERT OR REPLACE INTO person_access (person_id, username, password_hash, access_status, mfa_enabled, updated_at)
   VALUES ('person-platform-default', 'colab@mobi.com', ?, 'ACTIVE', 0, ?)`,
).run(passwordHash, now);

db.prepare(
  `UPDATE ponto_employees SET person_id = 'person-platform-default' WHERE id = 'emp-platform-default'`,
).run();

const plannerMigration = migratePlannerPersonLinks(db);
assert(typeof plannerMigration.migrated === "number", "migração planner deve retornar contagem");

const auth = authenticateCredentials(db, "colab@mobi.com", strongPassword);
assert(auth?.person?.id === "person-platform-default", "login oficial via person_access");

const sessionId = createPlatformSession(db, auth.person.id, {});
const req = { headers: { cookie: `platform_session=${sessionId}` } };
const ctx = buildRequestContext(db, req);
assert(ctx.permissionCodes.has("time.clock"), "deve ter time.clock");

const authorize = createAuthorize(db, HttpError);
try {
  authorize(req, { permission: "portal.access" });
} catch (e) {
  assert(false, "portal.access deveria estar presente");
}

const gaps = reportIdentityLinkGaps(db);
assert(gaps.pontoEmployeesWithoutPerson === 0, "funcionário seed deve ter person_id");

process.env.NODE_ENV = "production";
process.env.MOBI_ALLOW_INSECURE_BOOT = "1";
assertProductionSecurity(db);

const weak = authenticateCredentials(db, "colab@mobi.com", "wrong-password");
assert(!weak, "senha inválida bloqueada");

console.log("portal-production.test.mjs — OK");

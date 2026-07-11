/**
 * Testes de autenticação da Platform — executar com: node tests/platform-auth.test.mjs
 */
import { DatabaseSync } from "node:sqlite";
import { initPlatformDatabase } from "../platform/server-handlers/schema.js";
import { initPontoDatabase } from "../ponto/server-handlers.js";
import { hashPassword } from "../platform/server-handlers/services/auth/crypto.js";
import { authenticateCredentials } from "../platform/server-handlers/services/auth/login.js";
import { createPlatformSession } from "../platform/server-handlers/services/auth/session.js";
import { buildRequestContext, createAuthorize } from "../platform/server-handlers/services/auth/context.js";

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
const passwordHash = hashPassword("TestSecurePass2026!");
db.prepare("UPDATE people SET email = 'teste@mobi.com', updated_at = ? WHERE id = 'person-platform-default'").run(now);
db.prepare(
  `INSERT OR REPLACE INTO person_access (person_id, username, password_hash, access_status, mfa_enabled, updated_at)
   VALUES ('person-platform-default', 'teste@mobi.com', ?, 'ACTIVE', 0, ?)`,
).run(passwordHash, now);

const auth = authenticateCredentials(db, "teste@mobi.com", "TestSecurePass2026!");
assert(auth?.person?.id === "person-platform-default", "login deve resolver people.id");

const sessionId = createPlatformSession(db, auth.person.id, { ip: "127.0.0.1" });
const req = { headers: { cookie: `platform_session=${sessionId}` } };
const ctx = buildRequestContext(db, req);
assert(ctx?.person?.email === "teste@mobi.com", "identity deve retornar pessoa da sessão");
assert(ctx.permissionCodes.has("portal.access"), "admin seed deve ter portal.access");

const authorize = createAuthorize(db, HttpError);
try {
  authorize({ headers: { cookie: "platform_session=invalid" } });
  throw new Error("sessão inválida deveria falhar");
} catch (error) {
  assert(error.status === 401, "sessão inválida retorna 401");
}

const badAuth = authenticateCredentials(db, "teste@mobi.com", "wrong");
assert(!badAuth, "senha inválida não autentica");

console.log("platform-auth.test.mjs — OK");

import { randomBytes } from "node:crypto";
import {
  SESSION_TTL_MS,
  createId,
  getPlatformSessionId,
  setPlatformSessionCookie,
  clearPlatformSessionCookie,
} from "./crypto.js";
import { mapPerson } from "../identity/index.js";

function nowIso() {
  return new Date().toISOString();
}

export function createPlatformSession(db, personId, meta = {}) {
  const id = randomBytes(32).toString("hex");
  const token = randomBytes(32).toString("hex");
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS).toISOString();
  db.prepare(
    `INSERT INTO platform_sessions (id, person_id, token, device, browser, ip, expires_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    personId,
    token,
    meta.device || null,
    meta.browser || null,
    meta.ip || null,
    expiresAt,
    now.toISOString(),
  );
  db.prepare("DELETE FROM platform_sessions WHERE expires_at <= ?").run(now.toISOString());
  return id;
}

export function getPlatformSession(db, req) {
  const sessionId = getPlatformSessionId(req);
  if (!sessionId) return null;

  const row = db
    .prepare(
      `SELECT s.id, s.person_id, s.expires_at, s.created_at,
              p.id AS p_id, p.uuid, p.name, p.email, p.phone, p.cpf, p.photo, p.status, p.created_at AS p_created_at, p.updated_at AS p_updated_at
       FROM platform_sessions s
       INNER JOIN people p ON p.id = s.person_id
       WHERE s.id = ?`,
    )
    .get(sessionId);

  if (!row) return null;
  if (new Date(row.expires_at).getTime() <= Date.now()) {
    db.prepare("DELETE FROM platform_sessions WHERE id = ?").run(sessionId);
    return null;
  }

  if (row.status !== "ACTIVE") {
    db.prepare("DELETE FROM platform_sessions WHERE id = ?").run(sessionId);
    return null;
  }

  return {
    id: row.id,
    personId: row.person_id,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    person: mapPerson({
      id: row.p_id,
      uuid: row.uuid,
      name: row.name,
      email: row.email,
      phone: row.phone,
      cpf: row.cpf,
      photo: row.photo,
      status: row.status,
      created_at: row.p_created_at,
      updated_at: row.p_updated_at,
    }),
  };
}

export function destroyPlatformSession(db, req, res, options = {}) {
  const sessionId = getPlatformSessionId(req);
  if (sessionId) db.prepare("DELETE FROM platform_sessions WHERE id = ?").run(sessionId);
  clearPlatformSessionCookie(res, options);
}

export function touchPlatformSession(db, sessionId) {
  if (!sessionId) return;
  // Reservado para last_access_at quando a coluna existir.
}

export function writeAuditLog(db, { personId, application, module, action, ip, device, beforeJson, afterJson }) {
  db.prepare(
    `INSERT INTO audit_logs (id, person_id, application, module, entity, entity_id, action, before_json, after_json, ip, device, created_at)
     VALUES (?, ?, ?, ?, NULL, NULL, ?, ?, ?, ?, ?, ?)`,
  ).run(
    createId("audit"),
    personId || null,
    application || "platform",
    module || "auth",
    action,
    beforeJson || null,
    afterJson || null,
    ip || null,
    device || null,
    nowIso(),
  );
}

export { setPlatformSessionCookie, clearPlatformSessionCookie, getPlatformSessionId };

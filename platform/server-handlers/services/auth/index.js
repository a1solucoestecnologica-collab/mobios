import { authenticateCredentials } from "./login.js";
import {
  createPlatformSession,
  destroyPlatformSession,
  setPlatformSessionCookie,
  writeAuditLog,
} from "./session.js";
import { createAuthorize, buildRequestContext, getSessionPersonId, requirePermission } from "./context.js";
import { getPlatformSession } from "./session.js";
import { mapPerson } from "../identity/index.js";

export {
  authenticateCredentials,
  createPlatformSession,
  destroyPlatformSession,
  setPlatformSessionCookie,
  buildRequestContext,
  createAuthorize,
  getSessionPersonId,
  requirePermission,
  getPlatformSession,
  writeAuditLog,
  mapPerson,
};

export function platformLogin(db, res, input, meta = {}) {
  const auth = authenticateCredentials(db, input.email, input.password);
  if (!auth?.person) {
    const error = new Error("E-mail ou senha inválidos.");
    error.status = 401;
    throw error;
  }

  const sessionId = createPlatformSession(db, auth.person.id, meta);
  const secure = process.env.NODE_ENV === "production";
  setPlatformSessionCookie(res, sessionId, { secure });

  writeAuditLog(db, {
    personId: auth.person.id,
    application: "platform",
    module: "auth",
    action: "LOGIN",
    ip: meta.ip,
    device: meta.device,
    afterJson: JSON.stringify({ source: auth.source }),
  });

  return { person: auth.person, sessionId, legacySource: auth.source, legacyUserId: auth.legacyUserId };
}

export function platformLogout(db, req, res) {
  const session = getPlatformSession(db, req);
  destroyPlatformSession(db, req, res, { secure: process.env.NODE_ENV === "production" });
  if (session?.personId) {
    writeAuditLog(db, {
      personId: session.personId,
      application: "platform",
      module: "auth",
      action: "LOGOUT",
    });
  }
  return { ok: true };
}

import { getPersonPermissionCodes } from "../authorization/index.js";
import { getAccessibleApplications } from "../authorization/index.js";
import { getPlatformSession } from "./session.js";

export class PlatformAuthError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function buildRequestContext(db, req) {
  const session = getPlatformSession(db, req);
  if (!session?.person) return null;

  const permissionCodes = getPersonPermissionCodes(db, session.personId);
  const permissions = permissionCodes;
  const accessibleApplications = getAccessibleApplications(db, session.personId);

  return {
    session: {
      id: session.id,
      personId: session.personId,
      expiresAt: session.expiresAt,
    },
    person: session.person,
    permissionCodes: new Set(permissionCodes),
    permissions,
    accessibleApplications,
  };
}

export function createAuthorize(db, HttpError = PlatformAuthError) {
  return function authorize(req, options = {}) {
    const ctx = buildRequestContext(db, req);
    if (!ctx?.person) {
      throw new HttpError(401, "Sessão expirada ou inválida. Faça login novamente.");
    }

    if (options.permission && !ctx.permissionCodes.has(options.permission)) {
      throw new HttpError(403, "Permissão insuficiente.");
    }

    if (options.permissions?.length) {
      const ok = options.permissions.some((code) => ctx.permissionCodes.has(code));
      if (!ok) throw new HttpError(403, "Permissão insuficiente.");
    }

    if (options.anyPrefix?.length) {
      const ok = options.anyPrefix.some((prefix) =>
        [...ctx.permissionCodes].some((code) => code.startsWith(prefix)),
      );
      if (!ok) throw new HttpError(403, "Permissão insuficiente.");
    }

    req.platformContext = ctx;
    return ctx;
  };
}

export function requirePermission(ctx, code) {
  if (!ctx?.permissionCodes?.has(code)) {
    const error = new PlatformAuthError(403, "Permissão insuficiente.");
    throw error;
  }
}

export function getSessionPersonId(ctx) {
  return ctx?.person?.id || ctx?.session?.personId || null;
}

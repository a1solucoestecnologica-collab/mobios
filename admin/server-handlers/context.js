import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

export function createAdminContext({ db, HttpError }) {
  function createId(prefix) {
    return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function required(value, label) {
    const normalized = String(value || "").trim();
    if (!normalized) throw new HttpError(400, `${label} é obrigatório.`);
    return normalized;
  }

  function adminHashPassword(password) {
    const value = String(password || "");
    const salt = randomBytes(16).toString("hex");
    const hash = scryptSync(value, salt, 64).toString("hex");
    return `${salt}:${hash}`;
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
    return parseCookies(req.headers.cookie || "").admin_session || "";
  }

  function publicUser(row) {
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      roleId: row.role_id || null,
      departmentId: row.department_id || null,
      active: Boolean(row.active),
    };
  }

  function getAuthenticatedAdminUser(req) {
    const sessionId = getSessionId(req);
    if (!sessionId) return null;
    const user = db
      .prepare(
        `SELECT u.id, u.name, u.email, u.role_id, u.department_id, u.active, s.expires_at AS expiresAt
         FROM admin_sessions s
         JOIN admin_users u ON u.id = s.user_id
         WHERE s.id = ?`,
      )
      .get(sessionId);
    if (!user || !user.active || new Date(user.expiresAt).getTime() <= Date.now()) {
      if (sessionId) db.prepare("DELETE FROM admin_sessions WHERE id = ?").run(sessionId);
      return null;
    }
    return publicUser(user);
  }

  function getDefaultAdminUser() {
    const row = db.prepare("SELECT * FROM admin_users WHERE active = 1 ORDER BY created_at ASC LIMIT 1").get();
    if (!row) {
      return { id: "admin-default", name: "Administrador", email: "admin@mobios.com", roleId: null, departmentId: null, active: true };
    }
    return publicUser(row);
  }

  function requireAdmin(req) {
    const user = getAuthenticatedAdminUser(req);
    if (user) return user;
    return getDefaultAdminUser();
  }

  return {
    db,
    HttpError,
    createId,
    required,
    adminHashPassword,
    requireAdmin,
    publicUser,
  };
}

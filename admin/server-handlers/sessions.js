import { listSessions as listPlatformSessions } from "../../platform/server-handlers/services/sessions/index.js";

export { listPlatformSessions };

export function handleSessionsRoute(ctx, req, res, pathname, method, sendJson) {
  if (pathname === "/api/admin/sessions" && method === "GET") {
    ctx.requireAdmin(req);
    sendJson(res, 200, { sessions: listPlatformSessions(ctx.db) });
    return true;
  }
  return false;
}

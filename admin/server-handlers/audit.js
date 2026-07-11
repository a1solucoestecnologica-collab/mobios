import { listAuditLogs as listPlatformAuditLogs } from "../../platform/server-handlers/services/audit/index.js";

export { listPlatformAuditLogs };

export function handleAuditRoute(ctx, req, res, pathname, method, sendJson) {
  if (pathname === "/api/admin/audit-logs" && method === "GET") {
    ctx.requireAdmin(req);
    sendJson(res, 200, { logs: listPlatformAuditLogs(ctx.db) });
    return true;
  }
  return false;
}

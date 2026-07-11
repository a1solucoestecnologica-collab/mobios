import { getPlatformStats } from "../../platform/server-handlers/services/people/index.js";

export function getDashboardStats(db) {
  return getPlatformStats(db);
}

export function handleDashboardRoute(ctx, req, res, pathname, method, sendJson) {
  if (pathname === "/api/admin/dashboard" && method === "GET") {
    ctx.requireAdmin(req);
    sendJson(res, 200, getDashboardStats(ctx.db));
    return true;
  }
  return false;
}

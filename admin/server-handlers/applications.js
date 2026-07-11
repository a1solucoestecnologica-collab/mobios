export { listApplications } from "../../platform/server-handlers/services/applications/index.js";
import { listApplications } from "../../platform/server-handlers/services/applications/index.js";

export function handleApplicationsRoute(ctx, req, res, pathname, method, sendJson) {
  if (pathname === "/api/admin/applications" && method === "GET") {
    ctx.requireAdmin(req);
    sendJson(res, 200, { applications: listApplications(ctx.db) });
    return true;
  }
  return false;
}

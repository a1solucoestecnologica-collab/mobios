export { listPermissions as listPlatformPermissions } from "../../platform/server-handlers/services/permissions/index.js";
import { listPermissions as listPlatformPermissions } from "../../platform/server-handlers/services/permissions/index.js";

export function handlePermissionsRoute(ctx, req, res, pathname, method, sendJson) {
  if (pathname === "/api/admin/permissions" && method === "GET") {
    ctx.requireAdmin(req);
    sendJson(res, 200, { permissions: listPlatformPermissions(ctx.db) });
    return true;
  }
  return false;
}

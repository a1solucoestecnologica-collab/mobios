import { getSettings, updateSettings } from "../../platform/server-handlers/services/settings/index.js";

export function handleSettingsRoute(ctx, req, res, pathname, method, sendJson, readJson) {
  if (pathname === "/api/admin/settings" && method === "GET") {
    ctx.requireAdmin(req);
    sendJson(res, 200, getSettings(ctx.db));
    return true;
  }
  return false;
}

export async function handleSettingsRouteAsync(ctx, req, res, pathname, method, sendJson, readJson) {
  if (await handleSettingsRoute(ctx, req, res, pathname, method, sendJson, readJson)) return true;
  if (pathname === "/api/admin/settings" && method === "PUT") {
    ctx.requireAdmin(req);
    const body = await readJson(req);
    sendJson(res, 200, updateSettings(ctx.db, body));
    return true;
  }
  return false;
}

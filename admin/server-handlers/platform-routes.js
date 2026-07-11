import { getCurrentPerson, getPlatformArchitectureSummary } from "../../platform/server-handlers/services/identity/index.js";
import { getAccessibleApplications } from "../../platform/server-handlers/services/authorization/index.js";

// Wrappers de compatibilidade /api/admin/platform/* → serviços da Plataforma.

export function handlePlatformRoute(ctx, req, res, pathname, method, sendJson, url) {
  if (pathname === "/api/admin/platform/person" && method === "GET") {
    ctx.requireAdmin(req);
    sendJson(res, 200, { person: getCurrentPerson(ctx.db, req) });
    return true;
  }

  if (pathname === "/api/admin/platform/accessible-apps" && method === "GET") {
    ctx.requireAdmin(req);
    const personId = url.searchParams.get("personId") || getCurrentPerson(ctx.db, req)?.id;
    if (!personId) {
      sendJson(res, 200, { applications: [] });
      return true;
    }
    sendJson(res, 200, { applications: getAccessibleApplications(ctx.db, personId) });
    return true;
  }

  if (pathname === "/api/admin/platform/architecture" && method === "GET") {
    ctx.requireAdmin(req);
    sendJson(res, 200, getPlatformArchitectureSummary(ctx.db));
    return true;
  }

  return false;
}

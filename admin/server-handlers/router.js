import { createAdminContext } from "./context.js";
import { getCurrentPerson } from "./platform/identity.js";
import { handleDashboardRoute } from "./dashboard.js";
import { handleApplicationsRoute } from "./applications.js";
import { handlePermissionsRoute } from "./permissions.js";
import { handleAuditRoute } from "./audit.js";
import { handleSessionsRoute } from "./sessions.js";
import { handleSettingsRoute, handleSettingsRouteAsync } from "./settings.js";
import { handleUsersRoute } from "./users.js";
import { handleRolesRoute } from "./roles.js";
import { handleDepartmentsRoute } from "./departments.js";
import { handlePeopleRoute } from "./people.js";
import { handlePlatformRoute } from "./platform-routes.js";
import { handlePlatformRolesRoute } from "./platform-roles.js";
import { handlePlatformPeopleRoute } from "./platform-people.js";

export function createAdminRouter(deps) {
  const ctx = createAdminContext(deps);
  const { sendJson, readJson } = deps;

  return async function handleAdminApi(req, res, url) {
    const { pathname } = url;
    const method = req.method;

    if (pathname === "/api/admin/me" && method === "GET") {
      const person = getCurrentPerson(ctx.db, req);
      sendJson(res, 200, { authenticated: true, user: ctx.requireAdmin(req), person });
      return;
    }

    if (handlePlatformRoute(ctx, req, res, pathname, method, sendJson, url)) return;
    if (await handlePlatformRolesRoute(ctx, req, res, pathname, method, sendJson, readJson)) return;
    if (await handlePlatformPeopleRoute(ctx, req, res, pathname, method, sendJson, readJson)) return;
    if (handleDashboardRoute(ctx, req, res, pathname, method, sendJson)) return;
    if (handleApplicationsRoute(ctx, req, res, pathname, method, sendJson)) return;
    if (handlePermissionsRoute(ctx, req, res, pathname, method, sendJson)) return;
    if (handleAuditRoute(ctx, req, res, pathname, method, sendJson)) return;
    if (handleSessionsRoute(ctx, req, res, pathname, method, sendJson)) return;
    if (handlePeopleRoute(ctx, req, res, pathname, method, sendJson)) return;
    if (handleSettingsRoute(ctx, req, res, pathname, method, sendJson, readJson)) return;
    if (await handleSettingsRouteAsync(ctx, req, res, pathname, method, sendJson, readJson)) return;
    if (await handleUsersRoute(ctx, req, res, pathname, method, sendJson, readJson)) return;
    if (await handleRolesRoute(ctx, req, res, pathname, method, sendJson, readJson)) return;
    if (await handleDepartmentsRoute(ctx, req, res, pathname, method, sendJson, readJson)) return;

    sendJson(res, 404, { error: "Rota do MÖBI Admin não encontrada." });
  };
}

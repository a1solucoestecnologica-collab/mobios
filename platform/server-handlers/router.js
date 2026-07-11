import { createPlatformContext } from "./context.js";
import { getCurrentPerson, getPlatformArchitectureSummary } from "./services/identity/index.js";
import { getAccessibleApplications, getPersonPermissions, personHasAdminAccess } from "./services/authorization/index.js";
import { platformLogin, platformLogout } from "./services/auth/index.js";
import { assertSafeMutation } from "./services/auth/csrf.js";
import { reportIdentityLinkGaps } from "./migrations/identity-hardening.js";
import { listApplications } from "./services/applications/index.js";
import { listPermissions } from "./services/permissions/index.js";
import {
  listPeople,
  getPlatformStats,
  getPersonProfile,
  createPersonProfile,
  updatePersonProfile,
  deletePersonProfile,
  addPersonAttachment,
  removePersonAttachment,
} from "./services/people/index.js";
import { listRoles, getRole, createRole, updateRole, deleteRole, getRolePermissionIds, setRolePermissions } from "./services/roles/index.js";
import { listNavigationItems } from "./services/navigation/index.js";
import { listAuditLogs } from "./services/audit/index.js";
import { listSessions } from "./services/sessions/index.js";
import { getSettings, updateSettings } from "./services/settings/index.js";

export function createPlatformRouter(deps) {
  const ctx = createPlatformContext(deps);
  const { db, authorize, sendJson, readJson, HttpError } = ctx;

  return async function handlePlatformApi(req, res, url) {
    const { pathname } = url;
    const method = req.method;

    function authorizeAdmin(req) {
      return authorize(req, { anyPrefix: ["admin."] });
    }

    if (pathname === "/api/platform/login" && method === "POST") {
      try {
        assertSafeMutation(req, HttpError);
        const body = await readJson(req);
        const result = platformLogin(db, res, body, {
          ip: req.socket?.remoteAddress || null,
          device: req.headers["user-agent"] || null,
        });
        sendJson(res, 200, { ok: true, person: result.person });
      } catch (error) {
        sendJson(res, error.status || 500, { error: error.message });
      }
      return;
    }

    if (pathname === "/api/platform/logout" && method === "POST") {
      assertSafeMutation(req, HttpError);
      sendJson(res, 200, platformLogout(db, req, res));
      return;
    }

    if (pathname === "/api/platform/diagnostics/identity-links" && method === "GET") {
      const authCtx = authorize(req);
      if (!authCtx.permissionCodes.has("admin.settings") && !authCtx.permissionCodes.has("admin.users")) {
        throw new HttpError(403, "Permissão insuficiente.");
      }
      sendJson(res, 200, { report: reportIdentityLinkGaps(db) });
      return;
    }

    if (pathname === "/api/platform/identity" && method === "GET") {
      const ctx = authorize(req);
      sendJson(res, 200, {
        person: ctx.person,
        permissions: getPersonPermissions(db, ctx.person.id),
        accessibleApplications: ctx.accessibleApplications,
        session: ctx.session,
      });
      return;
    }

    function resolveAuthorizedPersonId(ctx, url) {
      const requested = url.searchParams.get("personId");
      if (!requested || requested === ctx.person.id) return ctx.person.id;
      if (ctx.permissionCodes.has("admin.users") || ctx.permissionCodes.has("admin.settings")) return requested;
      return ctx.person.id;
    }

    if (pathname === "/api/platform/authorization/accessible-apps" && method === "GET") {
      const ctx = authorize(req);
      sendJson(res, 200, { applications: getAccessibleApplications(db, resolveAuthorizedPersonId(ctx, url)) });
      return;
    }

    if (pathname === "/api/platform/authorization/permissions" && method === "GET") {
      const ctx = authorize(req);
      sendJson(res, 200, { permissions: getPersonPermissions(db, resolveAuthorizedPersonId(ctx, url)) });
      return;
    }

    if (pathname === "/api/platform/people" && method === "GET") {
      authorizeAdmin(req);
      sendJson(res, 200, { people: listPeople(db) });
      return;
    }

    if (pathname === "/api/platform/people" && method === "POST") {
      authorizeAdmin(req);
      try {
        const body = await readJson(req);
        const person = createPersonProfile(db, body);
        sendJson(res, 201, { person });
      } catch (error) {
        sendJson(res, error.status || 500, { error: error.message });
      }
      return;
    }

    const personAttachMatch = pathname.match(/^\/api\/platform\/people\/([^/]+)\/attachments\/([^/]+)$/);
    if (personAttachMatch && method === "DELETE") {
      authorizeAdmin(req);
      const ok = removePersonAttachment(db, personAttachMatch[1], personAttachMatch[2]);
      if (!ok) {
        sendJson(res, 404, { error: "Anexo não encontrado." });
        return;
      }
      sendJson(res, 200, { ok: true });
      return;
    }

    const personAttachPostMatch = pathname.match(/^\/api\/platform\/people\/([^/]+)\/attachments$/);
    if (personAttachPostMatch && method === "POST") {
      authorizeAdmin(req);
      try {
        const body = await readJson(req);
        const attachment = addPersonAttachment(db, personAttachPostMatch[1], body);
        sendJson(res, 201, { attachment });
      } catch (error) {
        sendJson(res, error.status || 500, { error: error.message });
      }
      return;
    }

    const personMatch = pathname.match(/^\/api\/platform\/people\/([^/]+)$/);
    if (personMatch) {
      const personId = personMatch[1];
      if (method === "GET") {
        const ctx = authorize(req);
        const isSelf = personId === ctx.person.id;
        if (!isSelf && !personHasAdminAccess(ctx.permissionCodes)) {
          throw new HttpError(403, "Permissão insuficiente.");
        }
        const person = getPersonProfile(db, personId);
        if (!person) {
          sendJson(res, 404, { error: "Pessoa não encontrada." });
          return;
        }
        sendJson(res, 200, { person });
        return;
      }
      authorizeAdmin(req);
      if (method === "PUT") {
        try {
          const body = await readJson(req);
          const person = updatePersonProfile(db, personId, body);
          sendJson(res, 200, { person });
        } catch (error) {
          sendJson(res, error.status || 500, { error: error.message });
        }
        return;
      }
      if (method === "DELETE") {
        try {
          if (!deletePersonProfile(db, personId)) {
            sendJson(res, 404, { error: "Pessoa não encontrada." });
            return;
          }
          sendJson(res, 200, { ok: true });
        } catch (error) {
          sendJson(res, error.status || 500, { error: error.message });
        }
        return;
      }
    }

    if (pathname === "/api/platform/roles" && method === "GET") {
      authorizeAdmin(req);
      sendJson(res, 200, { roles: listRoles(db) });
      return;
    }

    if (pathname === "/api/platform/roles" && method === "POST") {
      authorizeAdmin(req);
      const body = await readJson(req);
      const role = createRole(db, body);
      sendJson(res, 201, { role });
      return;
    }

    const rolePermMatch = pathname.match(/^\/api\/platform\/roles\/([^/]+)\/permissions$/);
    if (rolePermMatch) {
      authorizeAdmin(req);
      const roleId = rolePermMatch[1];
      if (method === "GET") {
        sendJson(res, 200, { permissionIds: getRolePermissionIds(db, roleId) });
        return;
      }
      if (method === "PUT") {
        const body = await readJson(req);
        try {
          sendJson(res, 200, setRolePermissions(db, roleId, body.permissionIds || []));
        } catch (error) {
          sendJson(res, error.status || 500, { error: error.message });
        }
        return;
      }
    }

    const roleMatch = pathname.match(/^\/api\/platform\/roles\/([^/]+)$/);
    if (roleMatch) {
      authorizeAdmin(req);
      const roleId = roleMatch[1];
      if (method === "GET") {
        const role = getRole(db, roleId);
        if (!role) {
          sendJson(res, 404, { error: "Função não encontrada." });
          return;
        }
        sendJson(res, 200, { role });
        return;
      }
      if (method === "PUT") {
        const body = await readJson(req);
        const role = updateRole(db, roleId, body);
        if (!role) {
          sendJson(res, 404, { error: "Função não encontrada." });
          return;
        }
        sendJson(res, 200, { role });
        return;
      }
      if (method === "DELETE") {
        try {
          if (!deleteRole(db, roleId)) {
            sendJson(res, 404, { error: "Função não encontrada." });
            return;
          }
          sendJson(res, 200, { ok: true });
        } catch (error) {
          sendJson(res, error.status || 500, { error: error.message });
        }
        return;
      }
    }

    if (pathname === "/api/platform/permissions" && method === "GET") {
      authorizeAdmin(req);
      sendJson(res, 200, { permissions: listPermissions(db) });
      return;
    }

    if (pathname === "/api/platform/applications" && method === "GET") {
      authorizeAdmin(req);
      sendJson(res, 200, { applications: listApplications(db) });
      return;
    }

    if (pathname === "/api/platform/navigation" && method === "GET") {
      authorizeAdmin(req);
      sendJson(res, 200, { items: listNavigationItems(db) });
      return;
    }

    if (pathname === "/api/platform/audit" && method === "GET") {
      authorizeAdmin(req);
      sendJson(res, 200, { logs: listAuditLogs(db) });
      return;
    }

    if (pathname === "/api/platform/sessions" && method === "GET") {
      authorizeAdmin(req);
      sendJson(res, 200, { sessions: listSessions(db) });
      return;
    }

    if (pathname === "/api/platform/settings" && method === "GET") {
      authorizeAdmin(req);
      sendJson(res, 200, getSettings(db));
      return;
    }

    if (pathname === "/api/platform/settings" && method === "PUT") {
      authorizeAdmin(req);
      const body = await readJson(req);
      sendJson(res, 200, updateSettings(db, body));
      return;
    }

    if (pathname === "/api/platform/architecture" && method === "GET") {
      authorizeAdmin(req);
      sendJson(res, 200, getPlatformArchitectureSummary(db));
      return;
    }

    if (pathname === "/api/platform/stats" && method === "GET") {
      authorizeAdmin(req);
      sendJson(res, 200, getPlatformStats(db));
      return;
    }

    sendJson(res, 404, { error: "Rota da Plataforma não encontrada." });
  };
}

import {
  listRoles,
  createRole,
  updateRole,
  deleteRole,
  getRolePermissionIds,
  setRolePermissions,
} from "../../platform/server-handlers/services/roles/index.js";

export async function handlePlatformRolesRoute(ctx, req, res, pathname, method, sendJson, readJson) {
  if (pathname === "/api/admin/platform/roles") {
    ctx.requireAdmin(req);
    if (method === "GET") {
      sendJson(res, 200, { roles: listRoles(ctx.db) });
      return true;
    }
    if (method === "POST") {
      const body = await readJson(req);
      const name = ctx.required(body.name, "Nome");
      const role = createRole(ctx.db, { name, description: body.description });
      sendJson(res, 201, { role });
      return true;
    }
  }

  const rolePermMatch = pathname.match(/^\/api\/admin\/platform\/roles\/([^/]+)\/permissions$/);
  if (rolePermMatch) {
    ctx.requireAdmin(req);
    const roleId = rolePermMatch[1];
    if (method === "GET") {
      sendJson(res, 200, { permissionIds: getRolePermissionIds(ctx.db, roleId) });
      return true;
    }
    if (method === "PUT") {
      const body = await readJson(req);
      try {
        sendJson(res, 200, setRolePermissions(ctx.db, roleId, body.permissionIds || []));
      } catch (error) {
        throw new ctx.HttpError(error.status || 500, error.message);
      }
      return true;
    }
  }

  const roleMatch = pathname.match(/^\/api\/admin\/platform\/roles\/([^/]+)$/);
  if (roleMatch) {
    ctx.requireAdmin(req);
    const roleId = roleMatch[1];
    if (method === "PUT") {
      const body = await readJson(req);
      const role = updateRole(ctx.db, roleId, {
        name: ctx.required(body.name, "Nome"),
        description: body.description,
      });
      if (!role) throw new ctx.HttpError(404, "Função não encontrada.");
      sendJson(res, 200, { role });
      return true;
    }
    if (method === "DELETE") {
      try {
        if (!deleteRole(ctx.db, roleId)) throw new ctx.HttpError(404, "Função não encontrada.");
        sendJson(res, 200, { ok: true });
      } catch (error) {
        if (error.status) throw error;
        throw new ctx.HttpError(400, error.message);
      }
      return true;
    }
  }

  return false;
}

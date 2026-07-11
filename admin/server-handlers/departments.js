import {
  listDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
} from "../../platform/server-handlers/services/departments/index.js";

export async function handleDepartmentsRoute(ctx, req, res, pathname, method, sendJson, readJson) {
  if (pathname === "/api/admin/departments") {
    ctx.requireAdmin(req);
    if (method === "GET") {
      sendJson(res, 200, { departments: listDepartments(ctx.db) });
      return true;
    }
    if (method === "POST") {
      const body = await readJson(req);
      const department = createDepartment(ctx.db, body, ctx.createId);
      sendJson(res, 201, { department });
      return true;
    }
  }

  const deptMatch = pathname.match(/^\/api\/admin\/departments\/([^/]+)$/);
  if (deptMatch) {
    ctx.requireAdmin(req);
    const deptId = deptMatch[1];
    if (method === "PUT") {
      const body = await readJson(req);
      const department = updateDepartment(ctx.db, deptId, body);
      sendJson(res, 200, { department });
      return true;
    }
    if (method === "DELETE") {
      deleteDepartment(ctx.db, deptId);
      sendJson(res, 200, { ok: true });
      return true;
    }
  }

  return false;
}

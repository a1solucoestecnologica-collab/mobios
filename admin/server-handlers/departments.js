// TODO: Migrar futuramente para a tabela de plataforma "departments".
// CRUD legado em admin_departments — compatibilidade temporária.

function listLegacyDepartments(ctx) {
  return ctx.db
    .prepare("SELECT id, name, description, active, created_at AS createdAt, updated_at AS updatedAt FROM admin_departments ORDER BY name COLLATE NOCASE")
    .all()
    .map((row) => ({ ...row, active: Boolean(row.active) }));
}

export async function handleDepartmentsRoute(ctx, req, res, pathname, method, sendJson, readJson) {
  if (pathname === "/api/admin/departments") {
    ctx.requireAdmin(req);
    if (method === "GET") {
      sendJson(res, 200, { departments: listLegacyDepartments(ctx) });
      return true;
    }
    if (method === "POST") {
      const body = await readJson(req);
      const now = new Date().toISOString();
      const id = ctx.createId("admin-dept");
      ctx.db.prepare(
        `INSERT INTO admin_departments (id, name, description, active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      ).run(
        id,
        ctx.required(body.name, "Nome"),
        String(body.description || "").trim(),
        body.active === false ? 0 : 1,
        now,
        now,
      );
      sendJson(res, 201, { department: listLegacyDepartments(ctx).find((d) => d.id === id) });
      return true;
    }
  }

  const deptMatch = pathname.match(/^\/api\/admin\/departments\/([^/]+)$/);
  if (deptMatch) {
    ctx.requireAdmin(req);
    const deptId = deptMatch[1];
    const current = ctx.db.prepare("SELECT * FROM admin_departments WHERE id = ?").get(deptId);
    if (!current) throw new ctx.HttpError(404, "Departamento não encontrado.");
    if (method === "PUT") {
      const body = await readJson(req);
      const now = new Date().toISOString();
      ctx.db.prepare(
        `UPDATE admin_departments SET name = ?, description = ?, active = ?, updated_at = ? WHERE id = ?`,
      ).run(
        body.name !== undefined ? ctx.required(body.name, "Nome") : current.name,
        body.description !== undefined ? String(body.description).trim() : current.description,
        body.active === false ? 0 : body.active === true ? 1 : current.active,
        now,
        deptId,
      );
      sendJson(res, 200, { department: listLegacyDepartments(ctx).find((d) => d.id === deptId) });
      return true;
    }
    if (method === "DELETE") {
      ctx.db.prepare("DELETE FROM admin_departments WHERE id = ?").run(deptId);
      sendJson(res, 200, { ok: true });
      return true;
    }
  }

  return false;
}

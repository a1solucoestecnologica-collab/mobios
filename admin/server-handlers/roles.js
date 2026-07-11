// TODO: Migrar futuramente para a tabela de plataforma "roles".
// CRUD legado em admin_roles — compatibilidade temporária.

function listLegacyRoles(ctx) {
  return ctx.db
    .prepare("SELECT id, name, slug, description, active, created_at AS createdAt, updated_at AS updatedAt FROM admin_roles ORDER BY name COLLATE NOCASE")
    .all()
    .map((row) => ({ ...row, active: Boolean(row.active) }));
}

export async function handleRolesRoute(ctx, req, res, pathname, method, sendJson, readJson) {
  if (pathname === "/api/admin/roles") {
    ctx.requireAdmin(req);
    if (method === "GET") {
      sendJson(res, 200, { roles: listLegacyRoles(ctx) });
      return true;
    }
    if (method === "POST") {
      const body = await readJson(req);
      const now = new Date().toISOString();
      const id = ctx.createId("admin-role");
      const slug = ctx.required(body.slug || body.name, "Slug").toLowerCase().replace(/\s+/g, "-");
      ctx.db.prepare(
        `INSERT INTO admin_roles (id, name, slug, description, active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        id,
        ctx.required(body.name, "Nome"),
        slug,
        String(body.description || "").trim(),
        body.active === false ? 0 : 1,
        now,
        now,
      );
      sendJson(res, 201, { role: listLegacyRoles(ctx).find((r) => r.id === id) });
      return true;
    }
  }

  const roleMatch = pathname.match(/^\/api\/admin\/roles\/([^/]+)$/);
  if (roleMatch) {
    ctx.requireAdmin(req);
    const roleId = roleMatch[1];
    const current = ctx.db.prepare("SELECT * FROM admin_roles WHERE id = ?").get(roleId);
    if (!current) throw new ctx.HttpError(404, "Função não encontrada.");
    if (method === "PUT") {
      const body = await readJson(req);
      const now = new Date().toISOString();
      ctx.db.prepare(
        `UPDATE admin_roles SET name = ?, slug = ?, description = ?, active = ?, updated_at = ? WHERE id = ?`,
      ).run(
        body.name !== undefined ? ctx.required(body.name, "Nome") : current.name,
        body.slug !== undefined ? ctx.required(body.slug, "Slug") : current.slug,
        body.description !== undefined ? String(body.description).trim() : current.description,
        body.active === false ? 0 : body.active === true ? 1 : current.active,
        now,
        roleId,
      );
      sendJson(res, 200, { role: listLegacyRoles(ctx).find((r) => r.id === roleId) });
      return true;
    }
    if (method === "DELETE") {
      ctx.db.prepare("DELETE FROM admin_roles WHERE id = ?").run(roleId);
      sendJson(res, 200, { ok: true });
      return true;
    }
  }

  return false;
}

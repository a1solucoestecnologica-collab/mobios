// LEGADO: admin_users — será removido após migração para people.
// Ver /docs/IDENTITY_MIGRATION_PLAN.md
// TODO: Migrar futuramente para a entidade única "people".

function mapUserRow(ctx, row) {
  const role = row.role_id
    ? ctx.db.prepare("SELECT name FROM admin_roles WHERE id = ?").get(row.role_id)
    : null;
  const department = row.department_id
    ? ctx.db.prepare("SELECT name FROM admin_departments WHERE id = ?").get(row.department_id)
    : null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    roleId: row.role_id || null,
    roleName: role?.name || "—",
    departmentId: row.department_id || null,
    departmentName: department?.name || "—",
    active: Boolean(row.active),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function listUsers(ctx) {
  const rows = ctx.db.prepare("SELECT * FROM admin_users ORDER BY name COLLATE NOCASE").all();
  return rows.map((row) => mapUserRow(ctx, row));
}

export async function handleUsersRoute(ctx, req, res, pathname, method, sendJson, readJson) {
  if (pathname === "/api/admin/users") {
    ctx.requireAdmin(req);
    if (method === "GET") {
      sendJson(res, 200, { users: listUsers(ctx) });
      return true;
    }
    if (method === "POST") {
      const body = await readJson(req);
      const now = new Date().toISOString();
      const id = ctx.createId("admin-user");
      const email = ctx.required(body.email, "E-mail").toLowerCase();
      const exists = ctx.db.prepare("SELECT id FROM admin_users WHERE lower(email) = ?").get(email);
      if (exists) throw new ctx.HttpError(409, "E-mail já cadastrado.");
      const passwordHash = body.password ? ctx.adminHashPassword(body.password) : null;
      ctx.db.prepare(
        `INSERT INTO admin_users (id, name, email, password_hash, role_id, department_id, active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        id,
        ctx.required(body.name, "Nome"),
        email,
        passwordHash,
        body.roleId || null,
        body.departmentId || null,
        body.active === false ? 0 : 1,
        now,
        now,
      );
      sendJson(res, 201, { user: mapUserRow(ctx, ctx.db.prepare("SELECT * FROM admin_users WHERE id = ?").get(id)) });
      return true;
    }
  }

  const userMatch = pathname.match(/^\/api\/admin\/users\/([^/]+)$/);
  if (userMatch) {
    ctx.requireAdmin(req);
    const userId = userMatch[1];
    const current = ctx.db.prepare("SELECT * FROM admin_users WHERE id = ?").get(userId);
    if (!current) throw new ctx.HttpError(404, "Usuário não encontrado.");
    if (method === "PUT") {
      const body = await readJson(req);
      const now = new Date().toISOString();
      const email = body.email ? String(body.email).trim().toLowerCase() : current.email;
      const duplicate = ctx.db.prepare("SELECT id FROM admin_users WHERE lower(email) = ? AND id != ?").get(email, userId);
      if (duplicate) throw new ctx.HttpError(409, "E-mail já cadastrado.");
      let passwordHash = current.password_hash;
      if (body.password) passwordHash = ctx.adminHashPassword(body.password);
      ctx.db.prepare(
        `UPDATE admin_users SET name = ?, email = ?, password_hash = ?, role_id = ?, department_id = ?, active = ?, updated_at = ? WHERE id = ?`,
      ).run(
        body.name !== undefined ? ctx.required(body.name, "Nome") : current.name,
        email,
        passwordHash,
        body.roleId !== undefined ? body.roleId || null : current.role_id,
        body.departmentId !== undefined ? body.departmentId || null : current.department_id,
        body.active === false ? 0 : body.active === true ? 1 : current.active,
        now,
        userId,
      );
      sendJson(res, 200, { user: mapUserRow(ctx, ctx.db.prepare("SELECT * FROM admin_users WHERE id = ?").get(userId)) });
      return true;
    }
    if (method === "DELETE") {
      ctx.db.prepare("DELETE FROM admin_users WHERE id = ?").run(userId);
      sendJson(res, 200, { ok: true });
      return true;
    }
  }

  return false;
}

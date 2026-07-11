export function listRoles(db) {
  return db
    .prepare(
      `SELECT id, name, description, system, created_at AS createdAt
       FROM roles
       ORDER BY name COLLATE NOCASE`,
    )
    .all()
    .map((row) => ({ ...row, system: Boolean(row.system) }));
}

export function getRole(db, roleId) {
  const row = db
    .prepare(
      `SELECT id, name, description, system, created_at AS createdAt
       FROM roles WHERE id = ?`,
    )
    .get(roleId);
  if (!row) return null;
  return { ...row, system: Boolean(row.system) };
}

export function createRole(db, { name, description }) {
  const now = new Date().toISOString();
  const id = `role-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  db.prepare(
    `INSERT INTO roles (id, name, description, system, created_at)
     VALUES (?, ?, ?, 0, ?)`,
  ).run(id, String(name || "").trim(), String(description || "").trim(), now);
  return getRole(db, id);
}

export function updateRole(db, roleId, { name, description }) {
  const role = getRole(db, roleId);
  if (!role) return null;
  db.prepare(`UPDATE roles SET name = ?, description = ? WHERE id = ?`).run(
    String(name || "").trim(),
    String(description || "").trim(),
    roleId,
  );
  return getRole(db, roleId);
}

export function deleteRole(db, roleId) {
  const role = getRole(db, roleId);
  if (!role) return false;
  if (role.system) {
    const error = new Error("Função de sistema não pode ser excluída.");
    error.status = 400;
    throw error;
  }
  db.prepare("DELETE FROM roles WHERE id = ?").run(roleId);
  return true;
}

export function getRolePermissionIds(db, roleId) {
  return db
    .prepare("SELECT permission_id AS permissionId FROM role_permissions WHERE role_id = ?")
    .all(roleId)
    .map((row) => row.permissionId);
}

export function setRolePermissions(db, roleId, permissionIds) {
  const role = getRole(db, roleId);
  if (!role) {
    const error = new Error("Função não encontrada.");
    error.status = 404;
    throw error;
  }

  const validIds = new Set(db.prepare("SELECT id FROM permissions").all().map((row) => row.id));
  const filtered = [...new Set((permissionIds || []).filter((id) => validIds.has(id)))];
  const now = new Date().toISOString();

  db.exec("BEGIN");
  try {
    db.prepare("DELETE FROM role_permissions WHERE role_id = ?").run(roleId);
    const insert = db.prepare(
      "INSERT INTO role_permissions (role_id, permission_id, created_at) VALUES (?, ?, ?)",
    );
    for (const permissionId of filtered) {
      insert.run(roleId, permissionId, now);
    }
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }

  return { ok: true, permissionIds: filtered };
}

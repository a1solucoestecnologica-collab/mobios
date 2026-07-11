export function listPermissions(db) {
  return db
    .prepare(
      `SELECT id, code, name, description, application, module, action, created_at AS createdAt
       FROM permissions
       ORDER BY application, module, action`,
    )
    .all();
}

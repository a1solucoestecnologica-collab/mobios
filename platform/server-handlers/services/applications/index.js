export function listApplications(db) {
  return db
    .prepare(
      `SELECT id, slug, name, description, icon, version,
              permission_prefix AS permissionPrefix,
              sort_order AS sortOrder, active,
              created_at AS createdAt, updated_at AS updatedAt
       FROM applications
       ORDER BY sort_order ASC, name COLLATE NOCASE`,
    )
    .all()
    .map((row) => ({ ...row, active: Boolean(row.active) }));
}

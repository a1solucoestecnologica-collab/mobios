export function listNavigationItems(db) {
  return db
    .prepare(
      `SELECT id, application_id AS applicationId, parent_id AS parentId,
              title, route, icon, sort_order AS sortOrder, active,
              created_at AS createdAt
       FROM navigation_items
       ORDER BY sort_order ASC, title COLLATE NOCASE`,
    )
    .all()
    .map((row) => ({ ...row, active: Boolean(row.active) }));
}

export function listSessions(db, limit = 200) {
  return db
    .prepare(
      `SELECT s.id, s.person_id AS personId, p.name AS personName, p.email AS personEmail,
              s.device, s.browser, s.ip, s.created_at AS createdAt, s.expires_at AS expiresAt
       FROM platform_sessions s
       JOIN people p ON p.id = s.person_id
       ORDER BY s.created_at DESC
       LIMIT ?`,
    )
    .all(limit);
}

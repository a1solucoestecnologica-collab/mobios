export function listAuditLogs(db, limit = 200) {
  return db
    .prepare(
      `SELECT a.id, a.person_id AS personId, p.name AS personName,
              a.application, a.module, a.entity, a.entity_id AS entityId,
              a.action, a.before_json AS beforeJson, a.after_json AS afterJson,
              a.ip, a.device, a.created_at AS createdAt
       FROM audit_logs a
       LEFT JOIN people p ON p.id = a.person_id
       ORDER BY a.created_at DESC
       LIMIT ?`,
    )
    .all(limit);
}

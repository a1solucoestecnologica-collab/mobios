/**
 * Migrações de identidade — Fase 4 (hardening).
 * Vínculos oficiais por people.id; e-mail apenas para backfill controlado.
 */

export function migratePlannerPersonLinks(db) {
  try {
    db.prepare("SELECT 1 FROM planner_executions LIMIT 1").get();
  } catch {
    return { scanned: 0, migrated: 0, skipped: true };
  }

  try {
    db.exec("ALTER TABLE planner_executions ADD COLUMN person_id TEXT REFERENCES people(id) ON DELETE SET NULL");
  } catch (error) {
    if (!String(error.message).includes("duplicate column name")) throw error;
  }

  try {
    db.exec("CREATE INDEX IF NOT EXISTS idx_planner_executions_person ON planner_executions(person_id)");
  } catch {
    // índice opcional
  }

  const rows = db
    .prepare("SELECT id, collaborator_id FROM planner_executions WHERE person_id IS NULL OR person_id = ''")
    .all();

  let migrated = 0;
  for (const row of rows) {
    const link = db
      .prepare(
        `SELECT p.id AS personId
         FROM platform_users u
         INNER JOIN people p ON lower(p.email) = lower(u.email)
         WHERE u.id = ?`,
      )
      .get(row.collaborator_id);
    if (link?.personId) {
      db.prepare("UPDATE planner_executions SET person_id = ? WHERE id = ?").run(link.personId, row.id);
      migrated += 1;
    }
  }

  return { scanned: rows.length, migrated };
}

export function reportIdentityLinkGaps(db) {
  const gaps = {
    pontoEmployeesWithoutPerson: 0,
    plannerExecutionsWithoutPerson: 0,
    peopleWithoutPersonAccess: 0,
    items: [],
  };

  try {
    gaps.pontoEmployeesWithoutPerson = db
      .prepare("SELECT COUNT(*) AS total FROM ponto_employees WHERE status = 'ACTIVE' AND (person_id IS NULL OR person_id = '')")
      .get().total;
    if (gaps.pontoEmployeesWithoutPerson > 0) {
      const sample = db
        .prepare("SELECT id, name FROM ponto_employees WHERE status = 'ACTIVE' AND (person_id IS NULL OR person_id = '') LIMIT 10")
        .all();
      gaps.items.push({ domain: "time", sample });
    }
  } catch {
    gaps.pontoEmployeesWithoutPerson = -1;
  }

  try {
    gaps.plannerExecutionsWithoutPerson = db
      .prepare(
        "SELECT COUNT(*) AS total FROM planner_executions WHERE status = 'active' AND (person_id IS NULL OR person_id = '')",
      )
      .get().total;
    if (gaps.plannerExecutionsWithoutPerson > 0) {
      const sample = db
        .prepare(
          "SELECT id, collaborator_id FROM planner_executions WHERE status = 'active' AND (person_id IS NULL OR person_id = '') LIMIT 10",
        )
        .all();
      gaps.items.push({ domain: "workmaps", sample });
    }
  } catch {
    gaps.plannerExecutionsWithoutPerson = -1;
  }

  try {
    gaps.peopleWithoutPersonAccess = db
      .prepare(
        `SELECT COUNT(*) AS total FROM people p
         LEFT JOIN person_access pa ON pa.person_id = p.id
         WHERE p.status = 'ACTIVE' AND pa.person_id IS NULL`,
      )
      .get().total;
  } catch {
    gaps.peopleWithoutPersonAccess = -1;
  }

  return gaps;
}

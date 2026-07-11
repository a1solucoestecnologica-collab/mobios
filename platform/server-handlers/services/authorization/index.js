// Autorização oficial da Plataforma MÖBI OS.
// Domínio: platform/ · Arquitetura: /docs/BIBLIA_MOBI_OS.md

export function getPersonPermissionCodes(db, personId) {
  const fromRoles = db
    .prepare(
      `SELECT DISTINCT p.code AS code
       FROM permissions p
       INNER JOIN role_permissions rp ON rp.permission_id = p.id
       INNER JOIN person_roles pr ON pr.role_id = rp.role_id
       WHERE pr.person_id = ?`,
    )
    .all(personId)
    .map((row) => row.code);

  const direct = db
    .prepare(
      `SELECT DISTINCT p.code AS code
       FROM permissions p
       INNER JOIN person_permissions pp ON pp.permission_id = p.id
       WHERE pp.person_id = ?`,
    )
    .all(personId)
    .map((row) => row.code);

  return [...new Set([...fromRoles, ...direct])];
}

/**
 * Descobre aplicativos autorizados para uma Pessoa via permission_prefix.
 * PEOPLE → PERSON_ROLES → ROLES → ROLE_PERMISSIONS → PERMISSIONS → APPLICATIONS
 */
export function getAccessibleApplications(db, personId) {
  const person = db.prepare("SELECT id FROM people WHERE id = ? AND status = 'ACTIVE'").get(personId);
  if (!person) return [];

  const permissionCodes = getPersonPermissionCodes(db, personId);
  const apps = db
    .prepare(
      `SELECT id, slug, name, description, icon, version,
              permission_prefix AS permissionPrefix,
              sort_order AS sortOrder, active
       FROM applications
       WHERE active = 1
       ORDER BY sort_order ASC, name COLLATE NOCASE`,
    )
    .all();

  const assignedRows = db
    .prepare("SELECT application_id FROM person_applications WHERE person_id = ?")
    .all(personId);
  const assignedIds = new Set(assignedRows.map((row) => row.application_id));
  const isPlatformAdmin = permissionCodes.some((code) => code.startsWith("admin."));
  const restrictByAssignment = assignedIds.size > 0 && !isPlatformAdmin;

  return apps
    .filter((app) => {
      const prefix = app.permissionPrefix || `${app.slug}.`;
      const hasPermission = permissionCodes.some((code) => code.startsWith(prefix));
      if (!hasPermission) return false;
      if (restrictByAssignment) return assignedIds.has(app.id);
      return true;
    })
    .map((app) => ({ ...app, active: Boolean(app.active) }));
}

export function getPersonPermissions(db, personId) {
  const codes = getPersonPermissionCodes(db, personId);
  if (!codes.length) return [];
  const placeholders = codes.map(() => "?").join(", ");
  return db
    .prepare(
      `SELECT id, code, name, description, application, module, action, created_at AS createdAt
       FROM permissions
       WHERE code IN (${placeholders})
       ORDER BY application, module, action`,
    )
    .all(...codes);
}

export function personHasAdminAccess(permissionCodes) {
  const list = permissionCodes instanceof Set ? [...permissionCodes] : permissionCodes || [];
  return list.some((code) => String(code).startsWith("admin."));
}

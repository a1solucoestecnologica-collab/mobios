// Departamentos oficiais da Plataforma (tabela departments).
// Mantém espelho em admin_departments para compatibilidade legada.

function nowIso() {
  return new Date().toISOString();
}

function mapDepartmentRow(row, description = "") {
  return {
    id: row.id,
    name: row.name,
    description,
    active: Boolean(row.active),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function syncAdminDepartmentsToPlatform(db) {
  let rows = [];
  try {
    rows = db.prepare("SELECT * FROM admin_departments ORDER BY name COLLATE NOCASE").all();
  } catch {
    return;
  }
  const now = nowIso();
  for (const row of rows) {
    const exists = db.prepare("SELECT id FROM departments WHERE id = ?").get(row.id);
    if (exists) {
      db.prepare("UPDATE departments SET name = ?, active = ?, updated_at = ? WHERE id = ?").run(
        row.name,
        row.active ?? 1,
        row.updated_at || now,
        row.id,
      );
    } else {
      db.prepare(
        `INSERT INTO departments (id, name, active, sort_order, created_at, updated_at)
         VALUES (?, ?, ?, 0, ?, ?)`,
      ).run(row.id, row.name, row.active ?? 1, row.created_at || now, row.updated_at || now);
    }
  }
}

export function ensureDepartmentInPlatform(db, departmentId) {
  syncAdminDepartmentsToPlatform(db);
  const id = String(departmentId || "").trim();
  if (!id) return null;
  if (db.prepare("SELECT id FROM departments WHERE id = ?").get(id)) return id;

  try {
    const legacy = db.prepare("SELECT * FROM admin_departments WHERE id = ?").get(id);
    if (!legacy) return null;
    const now = nowIso();
    db.prepare(
      `INSERT INTO departments (id, name, active, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, 0, ?, ?)`,
    ).run(legacy.id, legacy.name, legacy.active ?? 1, legacy.created_at || now, legacy.updated_at || now);
    return legacy.id;
  } catch {
    return null;
  }
}

export function resolveDepartmentId(db, departmentId, departmentName) {
  syncAdminDepartmentsToPlatform(db);
  const id = departmentId ? String(departmentId).trim() : "";
  if (id) {
    const resolved = ensureDepartmentInPlatform(db, id);
    if (resolved) return resolved;
  }
  const name = departmentName ? String(departmentName).trim() : "";
  if (!name) return null;

  const byPlatform = db.prepare("SELECT id FROM departments WHERE lower(trim(name)) = lower(?) LIMIT 1").get(name);
  if (byPlatform) return byPlatform.id;

  try {
    const byLegacy = db.prepare("SELECT id FROM admin_departments WHERE lower(trim(name)) = lower(?) LIMIT 1").get(name);
    if (byLegacy) return ensureDepartmentInPlatform(db, byLegacy.id);
  } catch {
    // tabela legada indisponível
  }
  return null;
}

export function listDepartments(db) {
  syncAdminDepartmentsToPlatform(db);
  return db
    .prepare(
      `SELECT id, name, active, created_at, updated_at FROM departments
       ORDER BY name COLLATE NOCASE`,
    )
    .all()
    .map((row) => {
      let description = "";
      try {
        const leg = db.prepare("SELECT description FROM admin_departments WHERE id = ?").get(row.id);
        description = leg?.description || "";
      } catch {
        description = "";
      }
      return mapDepartmentRow(row, description);
    });
}

function upsertLegacyDepartment(db, id, name, description, active, createdAt, updatedAt) {
  try {
    const exists = db.prepare("SELECT id FROM admin_departments WHERE id = ?").get(id);
    if (exists) {
      db.prepare(
        `UPDATE admin_departments SET name = ?, description = ?, active = ?, updated_at = ? WHERE id = ?`,
      ).run(name, description, active, updatedAt, id);
    } else {
      db.prepare(
        `INSERT INTO admin_departments (id, name, description, active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      ).run(id, name, description, active, createdAt, updatedAt);
    }
  } catch {
    // legado opcional
  }
}

export function createDepartment(db, body, createId) {
  const now = nowIso();
  const id = createId("dept");
  const name = String(body.name || "").trim();
  if (!name) {
    const error = new Error("Nome do departamento é obrigatório.");
    error.status = 400;
    throw error;
  }
  const description = String(body.description || "").trim();
  const active = body.active === false ? 0 : 1;

  db.prepare(
    `INSERT INTO departments (id, name, active, sort_order, created_at, updated_at)
     VALUES (?, ?, ?, 0, ?, ?)`,
  ).run(id, name, active, now, now);
  upsertLegacyDepartment(db, id, name, description, active, now, now);

  return mapDepartmentRow(db.prepare("SELECT * FROM departments WHERE id = ?").get(id), description);
}

export function updateDepartment(db, departmentId, body) {
  const current = db.prepare("SELECT * FROM departments WHERE id = ?").get(departmentId);
  if (!current) {
    const error = new Error("Departamento não encontrado.");
    error.status = 404;
    throw error;
  }
  const now = nowIso();
  const name = body.name !== undefined ? String(body.name).trim() : current.name;
  const active = body.active === false ? 0 : body.active === true ? 1 : current.active;
  const description =
    body.description !== undefined ? String(body.description).trim() : (() => {
      try {
        return db.prepare("SELECT description FROM admin_departments WHERE id = ?").get(departmentId)?.description || "";
      } catch {
        return "";
      }
    })();

  db.prepare("UPDATE departments SET name = ?, active = ?, updated_at = ? WHERE id = ?").run(
    name,
    active,
    now,
    departmentId,
  );
  upsertLegacyDepartment(db, departmentId, name, description, active, current.created_at, now);

  return mapDepartmentRow(db.prepare("SELECT * FROM departments WHERE id = ?").get(departmentId), description);
}

export function deleteDepartment(db, departmentId) {
  const current = db.prepare("SELECT id FROM departments WHERE id = ?").get(departmentId);
  if (!current) {
    const error = new Error("Departamento não encontrado.");
    error.status = 404;
    throw error;
  }
  db.prepare("DELETE FROM departments WHERE id = ?").run(departmentId);
  try {
    db.prepare("DELETE FROM admin_departments WHERE id = ?").run(departmentId);
  } catch {
    // legado opcional
  }
  return true;
}

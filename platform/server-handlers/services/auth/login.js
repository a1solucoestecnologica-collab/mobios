import { verifyPassword } from "./crypto.js";
import { mapPerson } from "../identity/index.js";
import { isProduction } from "../bootstrap/index.js";

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function safeQuery(db, sql, param) {
  try {
    return db.prepare(sql).get(param);
  } catch {
    return null;
  }
}

function rowToPerson(db, personId) {
  const row = db.prepare("SELECT * FROM people WHERE id = ?").get(personId);
  return mapPerson(row);
}

export function resolvePersonByEmail(db, email) {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;
  const row = db.prepare("SELECT * FROM people WHERE lower(email) = ?").get(normalized);
  return mapPerson(row);
}

/**
 * Fonte oficial de credenciais: person_access.
 * Tabelas legadas são lidas somente em transição — sem criação automática de People em produção.
 */
export function authenticateCredentials(db, email, password) {
  const normalized = normalizeEmail(email);
  if (!normalized || !password) return null;

  const access = db
    .prepare(
      `SELECT pa.person_id, pa.password_hash, pa.access_status, p.status AS person_status
       FROM person_access pa
       INNER JOIN people p ON p.id = pa.person_id
       WHERE lower(pa.username) = ? OR lower(p.email) = ?`,
    )
    .get(normalized, normalized);

  if (access && access.access_status === "ACTIVE" && access.person_status === "ACTIVE") {
    if (access.password_hash && verifyPassword(password, access.password_hash)) {
      return { person: rowToPerson(db, access.person_id), source: "person_access" };
    }
    if (access.password_hash) return null;
  }

  const platformUser = safeQuery(
    db,
    "SELECT * FROM platform_users WHERE lower(email) = ? AND access_status = 'enabled'",
    normalized,
  );
  if (platformUser && verifyPassword(password, platformUser.password_hash)) {
    const person = resolvePersonByEmail(db, normalized);
    if (!person) return null;
    if (person.status !== "ACTIVE") return null;
    syncLegacyCredentialToPersonAccess(db, person.id, normalized, platformUser.password_hash);
    return { person, source: "platform_users", legacyUserId: platformUser.id };
  }

  const pontoUser = safeQuery(db, "SELECT * FROM ponto_users WHERE lower(email) = ? AND active = 1", normalized);
  if (pontoUser && verifyPassword(password, pontoUser.password_hash)) {
    const person = resolvePersonByPersonIdOrEmail(db, pontoUser);
    if (!person || person.status !== "ACTIVE") return null;
    return { person, source: "ponto_users", legacyUserId: pontoUser.id };
  }

  const adminUser = safeQuery(db, "SELECT * FROM admin_users WHERE lower(email) = ? AND active = 1", normalized);
  if (adminUser && verifyPassword(password, adminUser.password_hash)) {
    const person = resolvePersonByEmail(db, normalized);
    if (!person || person.status !== "ACTIVE") return null;
    syncLegacyCredentialToPersonAccess(db, person.id, normalized, adminUser.password_hash);
    return { person, source: "admin_users", legacyUserId: adminUser.id };
  }

  return null;
}

function resolvePersonByPersonIdOrEmail(db, pontoUser) {
  if (pontoUser.person_id) {
    return rowToPerson(db, pontoUser.person_id);
  }
  return resolvePersonByEmail(db, pontoUser.email);
}

function syncLegacyCredentialToPersonAccess(db, personId, username, passwordHash) {
  const now = new Date().toISOString();
  const existing = db.prepare("SELECT person_id FROM person_access WHERE person_id = ?").get(personId);
  if (existing) return;
  db.prepare(
    `INSERT INTO person_access (person_id, username, password_hash, access_status, mfa_enabled, updated_at)
     VALUES (?, ?, ?, 'ACTIVE', 0, ?)`,
  ).run(personId, username, passwordHash, now);
}

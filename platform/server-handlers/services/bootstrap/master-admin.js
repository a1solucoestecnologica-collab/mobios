import { randomBytes, randomUUID, scryptSync } from "node:crypto";

export const MASTER_PERSON_ID = "person-master-admin";
export const PLATFORM_DEFAULT_PERSON_ID = "person-platform-default";
export const MASTER_ROLE_ID = "role-platform-admin";
export const DEFAULT_MASTER_EMAIL = "admin@admin.com";
export const DEFAULT_MASTER_PASSWORD = "admin";

const ACTIVE_PERMISSION_PREFIXES = ["dashboard.", "tools.", "planner.", "time.", "admin.", "portal."];

export function hashPasswordUnvalidated(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(String(password || ""), salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function ensureAdminApplicationAccess(db, personId, now) {
  const codes = db
    .prepare(
      `SELECT DISTINCT p.code FROM permissions p
       INNER JOIN role_permissions rp ON rp.permission_id = p.id
       INNER JOIN person_roles pr ON pr.role_id = rp.role_id
       WHERE pr.person_id = ?`,
    )
    .all(personId)
    .map((row) => row.code);
  if (!codes.some((code) => code.startsWith("admin."))) return;

  const apps = db.prepare("SELECT id FROM applications WHERE active = 1").all();
  const insert = db.prepare(
    "INSERT OR IGNORE INTO person_applications (person_id, application_id, created_at) VALUES (?, ?, ?)",
  );
  for (const app of apps) {
    insert.run(personId, app.id, now);
  }
}

function ensurePlatformAdminRolePermissions(db, now) {
  const roleId = MASTER_ROLE_ID;
  const role = db.prepare("SELECT id FROM roles WHERE id = ?").get(roleId);
  if (!role) return;

  const perms = db.prepare("SELECT id, code FROM permissions").all();
  for (const perm of perms) {
    if (!ACTIVE_PERMISSION_PREFIXES.some((prefix) => perm.code.startsWith(prefix))) continue;
    const linked = db.prepare("SELECT 1 FROM role_permissions WHERE role_id = ? AND permission_id = ?").get(roleId, perm.id);
    if (!linked) {
      db.prepare("INSERT INTO role_permissions (role_id, permission_id, created_at) VALUES (?, ?, ?)").run(roleId, perm.id, now);
    }
  }
}

function resolvePersonId(db, email) {
  const byEmail = db.prepare("SELECT id FROM people WHERE lower(email) = ?").get(email);
  if (byEmail) return byEmail.id;

  const platformDefault = db.prepare("SELECT id FROM people WHERE id = ?").get(PLATFORM_DEFAULT_PERSON_ID);
  if (platformDefault) return platformDefault.id;

  const master = db.prepare("SELECT id FROM people WHERE id = ?").get(MASTER_PERSON_ID);
  if (master) return master.id;

  return null;
}

function shouldResetCredentials(options) {
  if (options.resetCredentials === true) return true;
  if (options.resetCredentials === false) return false;
  if (process.env.MOBI_ENSURE_MASTER_ADMIN === "1") return true;
  if (process.env.MOBI_ENSURE_MASTER_ADMIN === "0") return false;
  return true;
}

/**
 * Garante conta master com role-platform-admin, credenciais em person_access e todos os apps ativos.
 */
export function ensureMasterAdmin(db, options = {}) {
  const email = String(options.email || process.env.MOBI_MASTER_ADMIN_EMAIL || DEFAULT_MASTER_EMAIL)
    .trim()
    .toLowerCase();
  const password = options.password ?? process.env.MOBI_MASTER_ADMIN_PASSWORD ?? DEFAULT_MASTER_PASSWORD;
  const hashPasswordFn = options.hashPasswordFn || hashPasswordUnvalidated;
  const resetCredentials = shouldResetCredentials(options);
  const now = new Date().toISOString();

  let personId = resolvePersonId(db, email);
  if (!personId) {
    personId = MASTER_PERSON_ID;
    db.prepare(
      `INSERT INTO people (id, uuid, name, email, status, created_at, updated_at)
       VALUES (?, ?, 'Administrador Master', ?, 'ACTIVE', ?, ?)`,
    ).run(personId, randomUUID(), email, now, now);
  } else {
    db.prepare("UPDATE people SET email = ?, name = 'Administrador Master', status = 'ACTIVE', updated_at = ? WHERE id = ?").run(
      email,
      now,
      personId,
    );
  }

  const access = db.prepare("SELECT person_id, password_hash FROM person_access WHERE person_id = ?").get(personId);
  if (resetCredentials || !access) {
    const hash = hashPasswordFn(password);
    if (access) {
      db.prepare(
        "UPDATE person_access SET username = ?, password_hash = ?, access_status = 'ACTIVE', updated_at = ? WHERE person_id = ?",
      ).run(email, hash, now, personId);
    } else {
      db.prepare(
        `INSERT INTO person_access (person_id, username, password_hash, access_status, mfa_enabled, updated_at)
         VALUES (?, ?, ?, 'ACTIVE', 0, ?)`,
      ).run(personId, email, hash, now);
    }
  } else if (access) {
    db.prepare("UPDATE person_access SET username = ?, access_status = 'ACTIVE', updated_at = ? WHERE person_id = ?").run(
      email,
      now,
      personId,
    );
  }

  ensurePlatformAdminRolePermissions(db, now);

  const hasRole = db.prepare("SELECT 1 FROM person_roles WHERE person_id = ? AND role_id = ?").get(personId, MASTER_ROLE_ID);
  if (!hasRole) {
    db.prepare("INSERT INTO person_roles (person_id, role_id, created_at) VALUES (?, ?, ?)").run(personId, MASTER_ROLE_ID, now);
  }

  ensureAdminApplicationAccess(db, personId, now);

  return { personId, email, resetCredentials };
}

export function ensureMasterAdminOnBoot(db) {
  const result = ensureMasterAdmin(db);
  if (result.resetCredentials) {
    console.warn(
      `[MÖBI OS] Conta de recuperação: ${result.email} (senha padrão). ` +
        "Troque a senha e defina MOBI_ENSURE_MASTER_ADMIN=0 no .env.",
    );
  }
  return result;
}

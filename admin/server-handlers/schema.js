// MÖBI Admin — Schema legado (DDL + seeds admin_*).
// Schema da Plataforma: platform/server-handlers/schema.js
// Arquitetura: /docs/BIBLIA_MOBI_OS.md
import { randomBytes, scryptSync } from "node:crypto";

export { initPlatformDatabase } from "../../platform/server-handlers/schema.js";

function adminHashPassword(password) {
  const value = String(password || "");
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(value, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function initLegacyAdminSchema(db) {
  // LEGADO: admin_users será removido após migração completa para people.
  // Ver /docs/IDENTITY_MIGRATION_PLAN.md
  db.exec(`
    CREATE TABLE IF NOT EXISTS admin_roles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      description TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS admin_departments (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS admin_users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT,
      role_id TEXT REFERENCES admin_roles(id) ON DELETE SET NULL,
      department_id TEXT REFERENCES admin_departments(id) ON DELETE SET NULL,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS admin_permissions (
      id TEXT PRIMARY KEY,
      perm_key TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      description TEXT,
      module TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS admin_role_permissions (
      role_id TEXT NOT NULL REFERENCES admin_roles(id) ON DELETE CASCADE,
      permission_id TEXT NOT NULL REFERENCES admin_permissions(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL,
      PRIMARY KEY (role_id, permission_id)
    );

    CREATE TABLE IF NOT EXISTS admin_user_permissions (
      user_id TEXT NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
      permission_id TEXT NOT NULL REFERENCES admin_permissions(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL,
      PRIMARY KEY (user_id, permission_id)
    );

    CREATE TABLE IF NOT EXISTS admin_audit_logs (
      id TEXT PRIMARY KEY,
      action TEXT NOT NULL,
      entity_type TEXT,
      entity_id TEXT,
      user_id TEXT REFERENCES admin_users(id) ON DELETE SET NULL,
      details TEXT,
      ip_address TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS admin_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS admin_settings (
      id TEXT PRIMARY KEY DEFAULT 'default',
      platform_name TEXT NOT NULL DEFAULT 'MÖBI OS',
      support_email TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_admin_users_role ON admin_users(role_id);
    CREATE INDEX IF NOT EXISTS idx_admin_users_department ON admin_users(department_id);
    CREATE INDEX IF NOT EXISTS idx_admin_audit_created ON admin_audit_logs(created_at);
    CREATE INDEX IF NOT EXISTS idx_admin_sessions_user ON admin_sessions(user_id);
  `);

  seedLegacyAdminData(db);
}

function seedLegacyAdminData(db) {
  const now = new Date().toISOString();

  const settings = db.prepare("SELECT id FROM admin_settings WHERE id = 'default'").get();
  if (!settings) {
    db.prepare(
      `INSERT INTO admin_settings (id, platform_name, support_email, created_at, updated_at)
       VALUES ('default', 'MÖBI OS', '', ?, ?)`,
    ).run(now, now);
  }

  let adminRoleId = db.prepare("SELECT id FROM admin_roles WHERE slug = 'admin'").get()?.id;
  if (!adminRoleId) {
    adminRoleId = "role-admin-default";
    db.prepare(
      `INSERT INTO admin_roles (id, name, slug, description, active, created_at, updated_at)
       VALUES (?, 'Administrador', 'admin', 'Acesso total à plataforma (legado)', 1, ?, ?)`,
    ).run(adminRoleId, now, now);
  }

  const adminUser = db.prepare("SELECT id FROM admin_users WHERE lower(email) = 'admin@mobios.com'").get();
  if (!adminUser && process.env.NODE_ENV !== "production") {
    const devPass = String(process.env.MOBI_DEV_ADMIN_PASSWORD || "dev-only-change-me");
    db.prepare(
      `INSERT INTO admin_users (id, name, email, password_hash, role_id, department_id, active, created_at, updated_at)
       VALUES (?, 'Administrador', 'admin@mobios.com', ?, ?, NULL, 1, ?, ?)`,
    ).run("admin-user-default", adminHashPassword(devPass), adminRoleId, now, now);
  }
}

export function initAdminDatabase(db) {
  initLegacyAdminSchema(db);
}

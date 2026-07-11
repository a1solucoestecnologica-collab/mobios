// MÖBI OS — Schema da Plataforma (DDL + seeds).
// Domínio oficial: platform/ · Arquitetura: /docs/BIBLIA_MOBI_OS.md
import { randomBytes, randomUUID, scryptSync } from "node:crypto";
import { syncAdminDepartmentsToPlatform } from "./services/departments/index.js";

const PERMISSION_SEEDS = [
  { code: "dashboard.access", name: "Acessar painel", application: "launcher", module: "dashboard", action: "access" },
  { code: "tools.view", name: "Visualizar ferramentas", application: "tools", module: "tools", action: "view" },
  { code: "tools.create", name: "Criar em ferramentas", application: "tools", module: "tools", action: "create" },
  { code: "tools.edit", name: "Editar em ferramentas", application: "tools", module: "tools", action: "edit" },
  { code: "tools.delete", name: "Excluir em ferramentas", application: "tools", module: "tools", action: "delete" },
  { code: "tools.reserve", name: "Reservar ferramentas", application: "tools", module: "tools", action: "reserve" },
  { code: "planner.view", name: "Visualizar WorkMaps", application: "planner", module: "planner", action: "view" },
  { code: "planner.create", name: "Criar no WorkMaps", application: "planner", module: "planner", action: "create" },
  { code: "planner.execute", name: "Executar no WorkMaps", application: "planner", module: "planner", action: "execute" },
  { code: "planner.delete", name: "Excluir no WorkMaps", application: "planner", module: "planner", action: "delete" },
  { code: "planner.map.create", name: "Criar mapas", application: "planner", module: "map", action: "create" },
  { code: "planner.map.edit", name: "Editar mapas", application: "planner", module: "map", action: "edit" },
  { code: "time.clock", name: "Bater ponto", application: "time", module: "time", action: "clock" },
  { code: "time.adjust", name: "Ajustar ponto", application: "time", module: "time", action: "adjust" },
  { code: "time.report", name: "Relatórios de ponto", application: "time", module: "time", action: "report" },
  { code: "admin.users", name: "Gerenciar pessoas (legado)", application: "admin", module: "users", action: "manage" },
  { code: "admin.users.create", name: "Criar pessoas", application: "admin", module: "users", action: "create" },
  { code: "admin.users.edit", name: "Editar pessoas", application: "admin", module: "users", action: "edit" },
  { code: "admin.roles", name: "Gerenciar funções (legado)", application: "admin", module: "roles", action: "manage" },
  { code: "admin.roles.manage", name: "Administrar funções", application: "admin", module: "roles", action: "manage" },
  { code: "admin.settings", name: "Configurações da plataforma", application: "admin", module: "settings", action: "manage" },
  { code: "portal.access", name: "Acessar Portal", application: "portal", module: "portal", action: "access" },
  { code: "crm.customer.create", name: "Criar clientes", application: "crm", module: "customer", action: "create" },
  { code: "finance.accounts.pay", name: "Registrar pagamentos", application: "finance", module: "accounts", action: "pay" },
  { code: "ai.assistant.use", name: "Usar assistente IA", application: "ai", module: "assistant", action: "use" },
];

const APPLICATION_SEEDS = [
  { id: "app-launcher", slug: "launcher", permission_prefix: "dashboard.", name: "Painel de aplicativos", description: "Central de aplicativos do MÖBI OS", icon: "▦", version: "1.0", sort_order: 0, active: 1 },
  { id: "app-tools", slug: "tools", permission_prefix: "tools.", name: "MÖBI Tools", description: "Cadastro e gestão de ferramentas de obra", icon: "▣", version: "1.0", sort_order: 1, active: 1 },
  { id: "app-planner", slug: "planner", permission_prefix: "planner.", name: "MÖBI WorkMaps", description: "Engine de mapas de trabalho", icon: "▤", version: "1.0", sort_order: 2, active: 1 },
  { id: "app-ponto", slug: "ponto", permission_prefix: "time.", name: "MÖBI Time", description: "Sistema de cartão ponto", icon: "◷", version: "1.0", sort_order: 3, active: 1 },
  { id: "app-admin", slug: "admin", permission_prefix: "admin.", name: "MÖBI Admin", description: "Centro administrativo da plataforma", icon: "◇", version: "1.0", sort_order: 4, active: 1 },
  { id: "app-portal", slug: "portal", permission_prefix: "portal.", name: "Portal do Colaborador", description: "Experiência unificada do colaborador", icon: "○", version: "0.1", sort_order: 5, active: 1 },
  { id: "app-crm", slug: "crm", permission_prefix: "crm.", name: "CRM", description: "Relacionamento com clientes", icon: "◎", version: "0.1", sort_order: 6, active: 0 },
  { id: "app-finance", slug: "finance", permission_prefix: "finance.", name: "Financeiro", description: "Gestão financeira", icon: "₿", version: "0.1", sort_order: 7, active: 0 },
  { id: "app-ia", slug: "ia", permission_prefix: "ai.", name: "IA", description: "Assistentes e automações", icon: "✦", version: "0.1", sort_order: 8, active: 0 },
];

export function initPlatformDatabase(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS people (
      id TEXT PRIMARY KEY,
      uuid TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      email TEXT UNIQUE,
      phone TEXT,
      cpf TEXT,
      photo TEXT,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS roles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      system INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS permissions (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      description TEXT,
      application TEXT NOT NULL,
      module TEXT NOT NULL,
      action TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS role_permissions (
      role_id TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
      permission_id TEXT NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL,
      PRIMARY KEY (role_id, permission_id)
    );

    CREATE TABLE IF NOT EXISTS person_roles (
      person_id TEXT NOT NULL REFERENCES people(id) ON DELETE CASCADE,
      role_id TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL,
      PRIMARY KEY (person_id, role_id)
    );

    CREATE TABLE IF NOT EXISTS person_permissions (
      person_id TEXT NOT NULL REFERENCES people(id) ON DELETE CASCADE,
      permission_id TEXT NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL,
      PRIMARY KEY (person_id, permission_id)
    );

    CREATE TABLE IF NOT EXISTS departments (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      color TEXT,
      icon TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS applications (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      description TEXT,
      icon TEXT,
      version TEXT,
      permission_prefix TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS navigation_items (
      id TEXT PRIMARY KEY,
      application_id TEXT REFERENCES applications(id) ON DELETE CASCADE,
      parent_id TEXT REFERENCES navigation_items(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      route TEXT,
      icon TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      person_id TEXT REFERENCES people(id) ON DELETE SET NULL,
      application TEXT,
      module TEXT,
      entity TEXT,
      entity_id TEXT,
      action TEXT NOT NULL,
      before_json TEXT,
      after_json TEXT,
      ip TEXT,
      device TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS platform_sessions (
      id TEXT PRIMARY KEY,
      person_id TEXT NOT NULL REFERENCES people(id) ON DELETE CASCADE,
      token TEXT NOT NULL UNIQUE,
      device TEXT,
      browser TEXT,
      ip TEXT,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_people_email ON people(email);
    CREATE INDEX IF NOT EXISTS idx_people_status ON people(status);
    CREATE INDEX IF NOT EXISTS idx_permissions_code ON permissions(code);
    CREATE INDEX IF NOT EXISTS idx_permissions_app ON permissions(application);
    CREATE INDEX IF NOT EXISTS idx_applications_slug ON applications(slug);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);
    CREATE INDEX IF NOT EXISTS idx_platform_sessions_person ON platform_sessions(person_id);
    CREATE INDEX IF NOT EXISTS idx_navigation_app ON navigation_items(application_id);
  `);

  migratePlatformSchema(db);
  seedPlatformData(db);
  syncAdminDepartmentsToPlatform(db);
}

function migrateIdentityLinks(db) {
  for (const table of ["ponto_employees", "ponto_users"]) {
    try {
      db.exec(`ALTER TABLE ${table} ADD COLUMN person_id TEXT REFERENCES people(id) ON DELETE SET NULL`);
    } catch (error) {
      if (!String(error.message).includes("duplicate column name")) throw error;
    }
  }

  const people = db.prepare("SELECT id, email FROM people WHERE email IS NOT NULL AND email != ''").all();
  for (const person of people) {
    db.prepare("UPDATE ponto_users SET person_id = ? WHERE lower(email) = lower(?) AND (person_id IS NULL OR person_id = '')").run(
      person.id,
      person.email,
    );
    db.prepare(
      `UPDATE ponto_employees SET person_id = ?
       WHERE id IN (SELECT employee_id FROM ponto_users WHERE person_id = ? AND employee_id IS NOT NULL)
         AND (person_id IS NULL OR person_id = '')`,
    ).run(person.id, person.id);
  }
}

function migratePlatformSchema(db) {
  try {
    db.exec("ALTER TABLE applications ADD COLUMN permission_prefix TEXT");
  } catch (error) {
    if (!String(error.message).includes("duplicate column name")) throw error;
  }

  migratePeopleProfileSchema(db);
  migrateIdentityLinks(db);
}

function migratePeopleProfileSchema(db) {
  const peopleColumns = [
    "social_name TEXT",
    "rg TEXT",
    "rg_issuer TEXT",
    "birth_date TEXT",
    "gender TEXT",
    "marital_status TEXT",
    "nationality TEXT",
    "birthplace TEXT",
    "mobile TEXT",
    "whatsapp TEXT",
  ];
  for (const col of peopleColumns) {
    try {
      db.exec(`ALTER TABLE people ADD COLUMN ${col}`);
    } catch (error) {
      if (!String(error.message).includes("duplicate column name")) throw error;
    }
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS person_addresses (
      person_id TEXT PRIMARY KEY REFERENCES people(id) ON DELETE CASCADE,
      cep TEXT,
      street TEXT,
      number TEXT,
      complement TEXT,
      district TEXT,
      city TEXT,
      state TEXT,
      country TEXT DEFAULT 'Brasil',
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS person_documents (
      person_id TEXT PRIMARY KEY REFERENCES people(id) ON DELETE CASCADE,
      ctps TEXT,
      pis_pasep TEXT,
      cnh TEXT,
      cnh_category TEXT,
      cnh_expiry TEXT,
      voter_registration TEXT,
      military_certificate TEXT,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS person_employment (
      person_id TEXT PRIMARY KEY REFERENCES people(id) ON DELETE CASCADE,
      employee_code TEXT,
      company TEXT,
      department_id TEXT REFERENCES departments(id) ON DELETE SET NULL,
      job_title TEXT,
      manager_person_id TEXT REFERENCES people(id) ON DELETE SET NULL,
      cost_center TEXT,
      contract_type TEXT,
      hired_at TEXT,
      terminated_at TEXT,
      employment_status TEXT DEFAULT 'ACTIVE',
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS person_access (
      person_id TEXT PRIMARY KEY REFERENCES people(id) ON DELETE CASCADE,
      username TEXT UNIQUE,
      password_hash TEXT,
      access_status TEXT NOT NULL DEFAULT 'ACTIVE',
      mfa_enabled INTEGER NOT NULL DEFAULT 0,
      last_access_at TEXT,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS person_applications (
      person_id TEXT NOT NULL REFERENCES people(id) ON DELETE CASCADE,
      application_id TEXT NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL,
      PRIMARY KEY (person_id, application_id)
    );

    CREATE TABLE IF NOT EXISTS person_attachments (
      id TEXT PRIMARY KEY,
      person_id TEXT NOT NULL REFERENCES people(id) ON DELETE CASCADE,
      category TEXT NOT NULL,
      label TEXT,
      file_name TEXT,
      file_path TEXT,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_person_employment_dept ON person_employment(department_id);
    CREATE INDEX IF NOT EXISTS idx_person_employment_manager ON person_employment(manager_person_id);
    CREATE INDEX IF NOT EXISTS idx_person_attachments_person ON person_attachments(person_id);
    CREATE INDEX IF NOT EXISTS idx_person_access_username ON person_access(username);
  `);
}

function seedPlatformData(db) {
  const now = new Date().toISOString();

  for (const app of APPLICATION_SEEDS) {
    const exists = db.prepare("SELECT id FROM applications WHERE slug = ?").get(app.slug);
    if (!exists) {
      db.prepare(
        `INSERT INTO applications (id, slug, name, description, icon, version, sort_order, active, permission_prefix, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        app.id, app.slug, app.name, app.description, app.icon, app.version,
        app.sort_order, app.active ?? 1, app.permission_prefix, now, now,
      );
    } else {
      db.prepare(
        `UPDATE applications SET permission_prefix = ?, name = ?, description = ?, icon = ?, version = ?, sort_order = ?, active = ?, updated_at = ?
         WHERE slug = ?`,
      ).run(app.permission_prefix, app.name, app.description, app.icon, app.version, app.sort_order, app.active ?? 1, now, app.slug);
    }
  }

  for (const perm of PERMISSION_SEEDS) {
    const exists = db.prepare("SELECT id FROM permissions WHERE code = ?").get(perm.code);
    if (!exists) {
      db.prepare(
        `INSERT INTO permissions (id, code, name, description, application, module, action, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        `perm-${perm.code.replace(/\./g, "-")}`,
        perm.code,
        perm.name,
        perm.description || "",
        perm.application,
        perm.module,
        perm.action,
        now,
      );
    }
  }

  const platformAdminRole = db.prepare("SELECT id FROM roles WHERE id = 'role-platform-admin'").get();
  if (!platformAdminRole) {
    db.prepare(
      `INSERT INTO roles (id, name, description, system, created_at)
       VALUES ('role-platform-admin', 'Administrador da Plataforma', 'Função de sistema para gestão do MÖBI OS', 1, ?)`,
    ).run(now);
  }

  seedIdentityFoundation(db, now);
  seedPortalCollaboratorLinks(db, now);
}

function seedPortalCollaboratorLinks(db, now) {
  const personId = "person-platform-default";
  const person = db.prepare("SELECT id, name, email FROM people WHERE id = ?").get(personId);
  if (!person) return;

  const personRow = db.prepare("SELECT id, name, email FROM people WHERE id = ?").get(personId);
  let employee = null;
  try {
    employee = db.prepare("SELECT id FROM ponto_employees WHERE person_id = ?").get(personId);
  } catch {
    employee = null;
  }

  if (!employee) {
    const schedule = db.prepare("SELECT id FROM ponto_work_schedules WHERE active = 1 LIMIT 1").get();
    const empId = "emp-platform-default";
    if (!db.prepare("SELECT id FROM ponto_employees WHERE id = ?").get(empId)) {
      try {
        db.prepare(
          `INSERT INTO ponto_employees (
            id, name, cpf, registration_number, role_name, department, admission_date,
            status, profile_photo_url, work_schedule_id, person_id, created_at, updated_at
          ) VALUES (?, ?, '', '001', 'Colaborador', 'Geral', ?, 'ACTIVE', '', ?, ?, ?, ?)`,
        ).run(empId, personRow.name, now.slice(0, 10), schedule?.id || null, personId, now, now);
      } catch {
        db.prepare(
          `INSERT INTO ponto_employees (
            id, name, cpf, registration_number, role_name, department, admission_date,
            status, profile_photo_url, work_schedule_id, created_at, updated_at
          ) VALUES (?, ?, '', '001', 'Colaborador', 'Geral', ?, 'ACTIVE', '', ?, ?, ?)`,
        ).run(empId, personRow.name, now.slice(0, 10), schedule?.id || null, now, now);
      }
    } else {
      try {
        db.prepare("UPDATE ponto_employees SET person_id = ? WHERE id = ?").run(personId, empId);
      } catch {
        // coluna person_id indisponível
      }
    }
  }
}

function seedIdentityFoundation(db, now) {
  const personId = "person-platform-default";
  let person = db.prepare("SELECT id FROM people WHERE id = ?").get(personId);
  if (!person) {
    db.prepare(
      `INSERT INTO people (id, uuid, name, email, phone, cpf, photo, status, created_at, updated_at)
       VALUES (?, ?, 'Administrador da Plataforma', 'admin@mobios.com', NULL, NULL, NULL, 'ACTIVE', ?, ?)`,
    ).run(personId, randomUUID(), now, now);
  }

  const roleId = "role-platform-admin";
  const hasPersonRole = db.prepare("SELECT 1 FROM person_roles WHERE person_id = ? AND role_id = ?").get(personId, roleId);
  if (!hasPersonRole) {
    db.prepare("INSERT INTO person_roles (person_id, role_id, created_at) VALUES (?, ?, ?)").run(personId, roleId, now);
  }

  const activePrefixes = ["dashboard.", "tools.", "planner.", "time.", "admin.", "portal."];
  const perms = db.prepare("SELECT id, code FROM permissions").all();
  for (const perm of perms) {
    if (!activePrefixes.some((prefix) => perm.code.startsWith(prefix))) continue;
    const linked = db.prepare("SELECT 1 FROM role_permissions WHERE role_id = ? AND permission_id = ?").get(roleId, perm.id);
    if (!linked) {
      db.prepare("INSERT INTO role_permissions (role_id, permission_id, created_at) VALUES (?, ?, ?)").run(roleId, perm.id, now);
    }
  }
}

// Identidade oficial da Plataforma MÖBI OS.
// Domínio: platform/ · Arquitetura: /docs/BIBLIA_MOBI_OS.md
import { getPlatformSession } from "../auth/session.js";

export function mapPerson(row) {
  if (!row) return null;
  return {
    id: row.id,
    uuid: row.uuid,
    name: row.name,
    email: row.email || null,
    phone: row.phone || null,
    cpf: row.cpf || null,
    photo: row.photo || null,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Retorna a Pessoa autenticada via platform_sessions.
 * Nunca aceita personId do cliente — somente a sessão validada.
 */
export function getCurrentPerson(db, req = null) {
  if (!req) return null;
  const session = getPlatformSession(db, req);
  return session?.person || null;
}

export function getPlatformArchitectureSummary(db) {
  return {
    model: [
      { layer: "people", label: "People", description: "Única entidade oficial de Pessoa na plataforma" },
      { layer: "person_roles", label: "Person Roles", description: "Vínculo Pessoa ↔ Função" },
      { layer: "roles", label: "Roles", description: "Funções e papéis de acesso" },
      { layer: "role_permissions", label: "Role Permissions", description: "Vínculo Função ↔ Permissão" },
      { layer: "permissions", label: "Permissions", description: "Padrão aplicativo.modulo.acao" },
      { layer: "applications", label: "Applications", description: "Apps registrados com permission_prefix" },
    ],
    counts: {
      people: db.prepare("SELECT COUNT(*) AS total FROM people").get().total,
      roles: db.prepare("SELECT COUNT(*) AS total FROM roles").get().total,
      permissions: db.prepare("SELECT COUNT(*) AS total FROM permissions").get().total,
      applications: db.prepare("SELECT COUNT(*) AS total FROM applications").get().total,
      navigationItems: db.prepare("SELECT COUNT(*) AS total FROM navigation_items").get().total,
      auditLogs: db.prepare("SELECT COUNT(*) AS total FROM audit_logs").get().total,
      platformSessions: db.prepare("SELECT COUNT(*) AS total FROM platform_sessions").get().total,
    },
    components: [
      { id: "people", name: "People", table: "people", status: "oficial" },
      { id: "roles", name: "Roles", table: "roles", status: "oficial" },
      { id: "permissions", name: "Permissions", table: "permissions", status: "oficial" },
      { id: "applications", name: "Applications", table: "applications", status: "oficial" },
      { id: "navigation", name: "Navigation", table: "navigation_items", status: "preparado" },
      { id: "audit", name: "Audit", table: "audit_logs", status: "oficial" },
      { id: "sessions", name: "Sessions", table: "platform_sessions", status: "preparado" },
    ],
    legacy: [
      { table: "platform_users", domain: "Tools / WorkMaps", status: "legado" },
      { table: "admin_users", domain: "Admin (CRUD temporário)", status: "legado" },
      { table: "ponto_users", domain: "Time", status: "legado" },
      { table: "ponto_employees", domain: "Time", status: "legado" },
    ],
  };
}

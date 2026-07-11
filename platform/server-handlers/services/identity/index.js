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
      { layer: "people", label: "Pessoas", description: "Única entidade oficial de pessoa na plataforma" },
      { layer: "person_roles", label: "Papéis da pessoa", description: "Vínculo pessoa ↔ função" },
      { layer: "roles", label: "Funções", description: "Funções e papéis de acesso" },
      { layer: "role_permissions", label: "Permissões da função", description: "Vínculo função ↔ permissão" },
      { layer: "permissions", label: "Permissões", description: "Padrão aplicativo.módulo.ação" },
      { layer: "applications", label: "Aplicativos", description: "Apps registrados com prefixo de permissão" },
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
      { id: "people", name: "Pessoas", table: "people", status: "oficial" },
      { id: "roles", name: "Funções", table: "roles", status: "oficial" },
      { id: "permissions", name: "Permissões", table: "permissions", status: "oficial" },
      { id: "applications", name: "Aplicativos", table: "applications", status: "oficial" },
      { id: "navigation", name: "Navegação", table: "navigation_items", status: "preparado" },
      { id: "audit", name: "Auditoria", table: "audit_logs", status: "oficial" },
      { id: "sessions", name: "Sessões", table: "platform_sessions", status: "preparado" },
    ],
    legacy: [
      { table: "platform_users", domain: "MÖBI Tools / WorkMaps", status: "legado" },
      { table: "admin_users", domain: "MÖBI Admin (CRUD temporário)", status: "legado" },
      { table: "ponto_users", domain: "Time", status: "legado" },
      { table: "ponto_employees", domain: "Time", status: "legado" },
    ],
  };
}

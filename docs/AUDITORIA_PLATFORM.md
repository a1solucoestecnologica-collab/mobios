# Auditoria — Extração dos Serviços da Plataforma (Fase 3.5)

**Data:** 9 de julho de 2026  
**Versão da Bíblia:** 1.3.0  
**Escopo:** consolidação arquitetural — **sem novas funcionalidades**

---

## 1. Objetivo

Extrair os serviços compartilhados do domínio Admin para o domínio oficial **`platform/`**, pertencente ao Sistema Operacional MÖBI OS — não ao MÖBI Admin.

---

## 2. O que foi movido para Platform

| Serviço | Origem (antes) | Destino (agora) |
|---------|----------------|-----------------|
| Schema da Plataforma (DDL + seeds) | `admin/server-handlers/schema.js` | `platform/server-handlers/schema.js` |
| Identity (`getCurrentPerson`, `mapPerson`, resumo arquitetural) | `admin/server-handlers/platform/identity.js` | `platform/server-handlers/services/identity/index.js` |
| Authorization (`getAccessibleApplications`, `getPersonPermissionCodes`) | idem | `platform/server-handlers/services/authorization/index.js` |
| Applications (listagem) | `admin/server-handlers/applications.js` | `platform/server-handlers/services/applications/index.js` |
| Permissions (listagem) | `admin/server-handlers/permissions.js` | `platform/server-handlers/services/permissions/index.js` |
| People (listagem + stats) | `admin/server-handlers/people.js`, `dashboard.js` | `platform/server-handlers/services/people/index.js` |
| Roles (tabela `roles`) | — (novo serviço) | `platform/server-handlers/services/roles/index.js` |
| Navigation | — (novo serviço) | `platform/server-handlers/services/navigation/index.js` |
| Audit | `admin/server-handlers/audit.js` | `platform/server-handlers/services/audit/index.js` |
| Sessions (`platform_sessions`) | `admin/server-handlers/sessions.js` | `platform/server-handlers/services/sessions/index.js` |
| Settings (lógica) | `admin/server-handlers/settings.js` | `platform/server-handlers/services/settings/index.js` |
| Router oficial | — | `platform/server-handlers/router.js` → `/api/platform/*` |
| Init runtime | `initPlatformSchema` em Admin | `initPlatformDatabase` em Platform |

---

## 3. Estrutura criada

```text
platform/
  server-handlers.js
  server-handlers/
    schema.js
    context.js
    router.js
    index.js
    services/
      identity/
      authorization/
      applications/
      permissions/
      people/
      roles/
      navigation/
      audit/
      sessions/
      settings/
```

---

## 4. APIs oficiais novas (`/api/platform/*`)

| Endpoint | Descrição |
|----------|-----------|
| `GET /api/platform/identity` | Pessoa atual |
| `GET /api/platform/authorization/accessible-apps` | Apps autorizados |
| `GET /api/platform/authorization/permissions` | Permissões da pessoa |
| `GET /api/platform/people` | Lista de pessoas |
| `GET /api/platform/roles` | Funções da plataforma |
| `GET /api/platform/permissions` | Permissões cadastradas |
| `GET /api/platform/applications` | Aplicativos |
| `GET /api/platform/navigation` | Itens de navegação |
| `GET /api/platform/audit` | Logs de auditoria |
| `GET /api/platform/sessions` | Sessões da plataforma |
| `GET /api/platform/settings` | Configurações |
| `PUT /api/platform/settings` | Atualizar configurações |
| `GET /api/platform/architecture` | Resumo arquitetural |
| `GET /api/platform/stats` | Contadores |

Despacho em `server.js`: **`/api/platform/*` antes de `/api/admin/*`**.

---

## 5. Compatibilidade mantida (`/api/admin/*`)

Todos os endpoints Admin existentes **continuam funcionando**. Implementação atual: **wrappers** que chamam os mesmos serviços Platform.

| Endpoint legado | Delega para |
|-----------------|-------------|
| `GET /api/admin/platform/person` | `getCurrentPerson` |
| `GET /api/admin/platform/accessible-apps` | `getAccessibleApplications` |
| `GET /api/admin/platform/architecture` | `getPlatformArchitectureSummary` |
| `GET /api/admin/applications` | `listApplications` |
| `GET /api/admin/permissions` | `listPermissions` |
| `GET /api/admin/people` | `listPeople` |
| `GET /api/admin/audit-logs` | `listAuditLogs` |
| `GET /api/admin/sessions` | `listSessions` |
| `GET/PUT /api/admin/settings` | `getSettings` / `updateSettings` |
| `GET /api/admin/dashboard` | `getPlatformStats` |
| `GET /api/admin/me` | `getCurrentPerson` + contexto Admin legado |

Frontend Admin (`admin/src/api.js`) **não precisou ser alterado** — continua consumindo `/api/admin/*`.

---

## 6. O que permanece temporariamente no Admin

| Item | Motivo |
|------|--------|
| `admin/server-handlers/schema.js` | Schema **legado** `admin_*` (users, roles, departments, sessions, audit legado) |
| `admin/server-handlers/users.js` | CRUD em `admin_users` (legado) |
| `admin/server-handlers/roles.js` | CRUD em `admin_roles` (legado) |
| `admin/server-handlers/departments.js` | CRUD em `admin_departments` (legado) |
| `admin/server-handlers/context.js` | Autenticação Admin via `admin_sessions` / `admin_users` |
| Tabela `admin_settings` | Armazena configurações globais até migração para `platform_settings` |
| `admin/server-handlers/platform/identity.js` | Reexport de compatibilidade interna |

---

## 7. O que **não** foi alterado (conforme regra)

- Launcher, Shell, Dashboard, MÖBI Tools, MÖBI WorkMaps, MÖBI Time
- Login atual (`/api/login`, cookies legados)
- CSS global (`styles.css`)
- Banco existente (sem remoção de tabelas)
- Comportamento funcional dos módulos

---

## 8. Serviços já consumíveis por novos aplicativos

| Necessidade | Como consumir |
|-------------|---------------|
| Pessoa atual | Import `getCurrentPerson` ou `GET /api/platform/identity` |
| Permissões | Import `getPersonPermissionCodes` ou `GET /api/platform/authorization/permissions` |
| Apps autorizados | Import `getAccessibleApplications` ou `GET /api/platform/authorization/accessible-apps` |
| Lista de apps | `GET /api/platform/applications` |
| Auditoria (leitura) | `GET /api/platform/audit` |
| Sessões (leitura) | `GET /api/platform/sessions` |
| Configurações | `GET/PUT /api/platform/settings` |
| Init do banco Platform | `initPlatformDatabase(db)` em `server.js` |

**Regra permanente (Bíblia 1.3.0):** nenhum aplicativo pode implementar identidade, autenticação, autorização, auditoria, sessões ou configurações locais.

**Contrato técnico:** [`API_PLATFORM.md`](./API_PLATFORM.md)

---

## 9. Deploy

Scripts atualizados para copiar **`platform/server-handlers/`** e **`admin/server-handlers/`** recursivamente:

- `install/package-deploy.ps1`
- `install/linux/install.sh`
- `install/windows/install.ps1`

---

## 10. Próximos passos (fora desta fase)

1. **Fase 4:** login único + `platform_sessions` + enforcement de permissões nas APIs.
2. Migrar `admin_settings` → tabela dedicada da Plataforma.
3. CRUD completo de People/Roles/Permissions via Platform (hoje majoritariamente leitura).
4. Launcher dinâmico consumindo `getAccessibleApplications`.
5. Remover wrappers `/api/admin/*` quando todos os consumidores migrarem para `/api/platform/*`.

---

*Gerado na Fase 3.5 — Extração dos Serviços da Plataforma.*

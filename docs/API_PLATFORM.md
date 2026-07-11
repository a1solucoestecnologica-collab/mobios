# API Platform — Contrato Oficial da Plataforma

**Platform API Contract · MÖBI OS**

| Campo | Valor |
|-------|-------|
| **Versão do contrato** | 1.0.0 |
| **Data** | 9 de julho de 2026 |
| **Namespace oficial** | `/api/platform/*` |
| **Status** | Vigente |
| **Autoridade** | Mesma autoridade da [`BIBLIA_MOBI_OS.md`](./BIBLIA_MOBI_OS.md) |

---

## Prefácio

Este documento é o **Contrato Oficial** entre a **Plataforma (Platform)** e **qualquer aplicativo** do MÖBI OS.

Ele **não** descreve implementação interna, estrutura de pastas ou código-fonte da Platform.

Ele define **como conversar** com a Plataforma: serviços disponíveis, rotas HTTP, formatos de resposta, fluxos oficiais, boas práticas e proibições.

**Todo novo aplicativo deve ser desenvolvível consultando apenas:**

1. [`BIBLIA_MOBI_OS.md`](./BIBLIA_MOBI_OS.md) — regras arquiteturais permanentes
2. [`API_PLATFORM.md`](./API_PLATFORM.md) — contrato técnico de consumo da Platform

---

## Histórico de alterações

| Versão | Data | Resumo |
|--------|------|--------|
| 1.0.0 | 2026-07-09 | Publicação inicial do contrato. Documenta todas as rotas `/api/platform/*` existentes na Fase 3.5. |

---

# 1. Objetivo da Platform

## 1.1 O que é a Platform

A **Platform** é o domínio de **infraestrutura compartilhada** do MÖBI OS. Ela pertence ao **Sistema Operacional**, não a nenhum aplicativo individual — inclusive o MÖBI Admin.

A Platform fornece serviços que **todos os aplicativos precisam**, mas que **nenhum aplicativo deve reimplementar**.

## 1.2 O que a Platform fornece

| Área | Serviço |
|------|---------|
| Identidade | Quem é a **Pessoa** no contexto atual |
| Autorização | Quais **permissões** e **aplicativos** a pessoa pode acessar |
| People | Cadastro oficial de pessoas (`people`) |
| Roles | Funções e papéis de acesso |
| Permissions | Permissões no padrão `aplicativo.modulo.acao` |
| Applications | Registro oficial de aplicativos do ecossistema |
| Navigation | Itens de navegação por aplicativo (estrutura preparada) |
| Sessions | Sessões unificadas da plataforma (`platform_sessions`) |
| Audit | Trilha de auditoria centralizada |
| Settings | Configurações globais da instalação |

## 1.3 O que a Platform NÃO faz

A Platform **não** implementa regra de negócio de aplicativos:

- Não cadastra ferramentas (Tools).
- Não desenha mapas de trabalho (WorkMaps).
- Não registra ponto (Time).
- Não emite notas fiscais (Financeiro).
- Não gerencia clientes (CRM).

**Platform fornece infraestrutura. Aplicativos implementam regras de negócio.**

## 1.4 Princípio de consumo

Todo aplicativo do MÖBI OS **consome** a Platform.

Nenhum aplicativo **implementa** identidade, autenticação, autorização, auditoria, sessões ou configurações locais.

---

# 2. Arquitetura Geral

## 2.1 Fluxo permitido

```text
┌─────────────┐
│  Aplicativo │  (Portal, CRM, Time, Tools, Admin, …)
└──────┬──────┘
       │  HTTP /api/platform/*
       ▼
┌─────────────┐
│   Platform  │  (serviços compartilhados)
└──────┬──────┘
       │
       ▼
┌─────────────┐
│    Banco    │  (SQLite — tabelas oficiais da Platform)
└─────────────┘
```

## 2.2 Fluxo proibido

```text
┌─────────────┐         ┌─────────────┐
│  Aplicativo │ ──X──▶  │  Aplicativo │   ← PROIBIDO
│      A      │         │      B      │
└─────────────┘         └─────────────┘
```

Aplicativos **nunca** dependem diretamente uns dos outros.

Comunicação entre domínios passa pela **Platform** (identidade, permissões, auditoria) ou por contratos explícitos futuros de eventos — nunca por acoplamento direto.

## 2.3 Base URL e formato

| Item | Valor |
|------|-------|
| **Base URL** | Mesma origem do MÖBI OS (ex.: `http://localhost:4173`) |
| **Prefixo** | `/api/platform/` |
| **Formato** | JSON (`Content-Type: application/json`) |
| **Métodos** | Conforme documentado por rota |

## 2.4 Autenticação (Fase 4 — produção)

| Item | Valor |
|------|-------|
| **Credenciais oficiais** | Tabela `person_access` (hash scrypt) vinculada a `people.id` |
| **Cookie oficial** | `platform_session` (HttpOnly, SameSite=Lax, Secure em produção) |
| **Bootstrap produção** | `MOBI_BOOTSTRAP_ADMIN_EMAIL` + `MOBI_BOOTSTRAP_ADMIN_PASSWORD` |
| **Login** | `POST /api/platform/login` ou `POST /api/login` (fachada Shell) |
| **Identidade** | `GET /api/platform/identity` — somente via sessão validada |

`platform_users` permanece legado (Tools/WorkMaps admin) — leitura em transição; novas credenciais devem ir para `person_access`.

Sessões legadas (`moble_session`, `ponto_session`) mantidas temporariamente para painéis administrativos.

Diagnóstico de vínculos: `GET /api/platform/diagnostics/identity-links` (admin).

---

# 3. Serviços Oficiais

Para cada serviço: objetivo, responsabilidade, quem consome e quem **nunca** deve reimplementar.

---

## 3.1 Identity

| Campo | Descrição |
|-------|-----------|
| **Objetivo** | Resolver **quem é a Pessoa** no contexto da requisição atual |
| **Responsabilidade** | Entidade oficial `people`; função `getCurrentPerson` |
| **Quem consome** | Todos os aplicativos — Portal, Time, CRM, Admin, Launcher (futuro) |
| **Quem nunca implementa** | Qualquer app que crie tabela `*_users` ou cadastro paralelo de pessoa |

**Estado:** operacional (leitura). Resolução via sessão unificada: **planejado**.

---

## 3.2 Authorization

| Campo | Descrição |
|-------|-----------|
| **Objetivo** | Determinar **o que a pessoa pode fazer** e **quais apps pode acessar** |
| **Responsabilidade** | Cálculo de permissões efetivas e descoberta de aplicativos via `permission_prefix` |
| **Quem consome** | Launcher, Portal, Admin, qualquer app que precise gate de acesso |
| **Quem nunca implementa** | Apps com permissões locais, roles próprias ou ACL siloed |

**Estado:** operacional (leitura). Enforcement nas APIs dos apps: **planejado**.

---

## 3.3 People

| Campo | Descrição |
|-------|-----------|
| **Objetivo** | Cadastro único oficial de **Pessoas** na plataforma |
| **Responsabilidade** | Tabela `people` — colaboradores, gestores, admins, futuros clientes |
| **Quem consome** | Admin (gestão), Portal (perfil), apps que exibem dados de pessoa |
| **Quem nunca implementa** | `platform_users`, `admin_users`, `ponto_users`, `crm_users`, etc. |

**Estado:** operacional (listagem GET). CRUD completo via Platform API: **planejado**.

---

## 3.4 Roles

| Campo | Descrição |
|-------|-----------|
| **Objetivo** | Agrupar permissões em **funções** atribuíveis a pessoas |
| **Responsabilidade** | Tabela `roles`, vínculos `person_roles`, `role_permissions` |
| **Quem consome** | Admin, apps que precisam saber o papel da pessoa |
| **Quem nunca implementa** | `admin_roles` ou papéis locais por aplicativo |

**Estado:** operacional (listagem GET). CRUD via Platform API: **planejado**.

---

## 3.5 Permissions

| Campo | Descrição |
|-------|-----------|
| **Objetivo** | Definir ações permitidas no padrão `aplicativo.modulo.acao` |
| **Responsabilidade** | Tabela `permissions` e vínculos com roles/pessoas |
| **Quem consome** | Todos os apps para verificar acesso a funcionalidades |
| **Quem nunca implementa** | Permissões baseadas em telas, menus ou flags locais permanentes |

**Estado:** operacional (listagem GET + permissões efetivas por pessoa). CRUD via Platform API: **planejado**.

---

## 3.6 Applications

| Campo | Descrição |
|-------|-----------|
| **Objetivo** | Registrar oficialmente cada aplicativo do ecossistema MÖBI OS |
| **Responsabilidade** | Tabela `applications` com `slug`, `permission_prefix`, metadados de launcher |
| **Quem consome** | Launcher (futuro dinâmico), Admin, Portal |
| **Quem nunca implementa** | Registro hardcoded permanente sem entrada em `applications` |

**Estado:** operacional (listagem GET). CRUD via Platform API: **planejado**.

---

## 3.7 Navigation

| Campo | Descrição |
|-------|-----------|
| **Objetivo** | Registrar itens de menu/navegação por aplicativo |
| **Responsabilidade** | Tabela `navigation_items` vinculada a `applications` |
| **Quem consome** | Shell, Launcher, Portal, apps com menu dinâmico |
| **Quem nunca implementa** | Árvore de navegação duplicada por app sem registro central |

**Estado:** operacional (listagem GET; tabela preparada, pode estar vazia). CRUD via Platform API: **planejado**.

---

## 3.8 Sessions

| Campo | Descrição |
|-------|-----------|
| **Objetivo** | Sessões unificadas vinculadas a `people` |
| **Responsabilidade** | Tabela `platform_sessions` |
| **Quem consome** | Login único, Admin (visualização), apps autenticados |
| **Quem nunca implementa** | `sessions` (Tools), `admin_sessions`, `ponto_sessions` como destino final |

**Estado:** operacional (listagem GET). Criação, validação e revogação de sessão: **planejado** (Fase 4).

---

## 3.9 Audit

| Campo | Descrição |
|-------|-----------|
| **Objetivo** | Trilha centralizada de ações relevantes na plataforma |
| **Responsabilidade** | Tabela `audit_logs` |
| **Quem consome** | Admin (consulta), apps que registram ações (futuro) |
| **Quem nunca implementa** | Tabela de auditoria própria por aplicativo |

**Estado:** operacional (listagem GET). Gravação via Platform API: **planejado**.

---

## 3.10 Settings

| Campo | Descrição |
|-------|-----------|
| **Objetivo** | Configurações globais da instalação MÖBI OS |
| **Responsabilidade** | Nome da plataforma, e-mail de suporte, parâmetros globais |
| **Quem consome** | Admin, Shell (título), apps que exibem branding global |
| **Quem nunca implementa** | Arquivo de config local por app para dados que são da instalação |

**Estado:** operacional (GET e PUT). Tabela dedicada `platform_settings`: **planejado** (hoje persiste em `admin_settings` legado).

---

# 4. Contrato das APIs

Todas as rotas abaixo **existem hoje** em `/api/platform/*`.

Respostas de erro para rota inexistente:

```json
{ "error": "Rota da Plataforma não encontrada." }
```

HTTP **404**.

---

## 4.1 Identity e sessão

### `POST /api/platform/login`

Autentica credenciais (`person_access` oficial ou fontes legadas em transição), cria `platform_sessions` e define cookie `platform_session`.

**Body:** `{ "email": "...", "password": "..." }`

**Resposta 200:** `{ "ok": true, "person": { ... } }`

---

### `POST /api/platform/logout`

Invalida a sessão atual e remove o cookie.

---

### `GET /api/platform/identity`

| Campo | Valor |
|-------|-------|
| **Objetivo** | Obter a **Pessoa autenticada** e contexto de autorização |
| **Autenticação** | Cookie `platform_session` obrigatório |
| **Query params** | **Nenhum** — `personId` do cliente é ignorado |

**Resposta 200:**

```json
{
  "person": { "id": "person-platform-default", "name": "…", "email": "…", "status": "ACTIVE" },
  "permissions": ["portal.access", "time.clock", "time.report", "planner.execute"],
  "accessibleApplications": [ { "slug": "portal", "name": "Portal do Colaborador" } ],
  "session": { "id": "…", "personId": "person-platform-default", "expiresAt": "…" }
}
```

**401** se sessão ausente, expirada ou inválida.

---

## 4.2 Authorization

### `GET /api/platform/authorization/accessible-apps`

| Campo | Valor |
|-------|-------|
| **Objetivo** | Listar **aplicativos autorizados** para uma pessoa |
| **Quando utilizar** | Launcher dinâmico, Portal, menu de apps do colaborador |
| **Query params** | `personId` (opcional — se omitido, usa pessoa do contexto atual) |

**Lógica:** uma pessoa acessa um app quando possui ao menos uma permissão cujo `code` começa com o `permissionPrefix` daquele aplicativo.

**Resposta 200:**

```json
{
  "applications": [
    {
      "id": "app-tools",
      "slug": "tools",
      "name": "MÖBI Tools",
      "description": "…",
      "icon": "▣",
      "version": "1.0",
      "permissionPrefix": "tools.",
      "sortOrder": 1,
      "active": true
    }
  ]
}
```

---

### `GET /api/platform/authorization/permissions`

| Campo | Valor |
|-------|-------|
| **Objetivo** | Listar **permissões efetivas** de uma pessoa (via roles + diretas) |
| **Quando utilizar** | Verificar acesso a módulo/ação antes de exibir UI ou executar operação |
| **Query params** | `personId` (opcional) |

**Resposta 200:**

```json
{
  "permissions": [
    {
      "id": "perm-tools-view",
      "code": "tools.view",
      "name": "Visualizar Tools",
      "description": "",
      "application": "tools",
      "module": "tools",
      "action": "view",
      "createdAt": "2026-07-09T…"
    }
  ]
}
```

---

## 4.3 People

### `GET /api/platform/people`

| Campo | Valor |
|-------|-------|
| **Objetivo** | Listar todas as pessoas cadastradas na plataforma |
| **Quando utilizar** | Telas administrativas, seleção de responsáveis, listagens de colaboradores |
| **Query params** | Nenhum |

**Resposta 200:**

```json
{
  "people": [
    {
      "id": "person-platform-default",
      "uuid": "…",
      "name": "Administrador da Plataforma",
      "email": "admin@mobios.com",
      "phone": null,
      "cpf": null,
      "photo": null,
      "status": "ACTIVE",
      "createdAt": "2026-07-09T…",
      "updatedAt": "2026-07-09T…"
    }
  ]
}
```

### `POST /api/platform/people`

| Campo | Valor |
|-------|-------|
| **Objetivo** | Criar pessoa no cadastro oficial |
| **Body** | `personal`, `address`, `documents`, `employment`, `access`, `applicationIds`, `roleIds` |

**Resposta 201:** `{ "person": { …perfil completo… } }`

### `GET /api/platform/people/:id`

| Campo | Valor |
|-------|-------|
| **Objetivo** | Obter perfil completo da pessoa (todas as seções do cadastro) |

**Resposta 200:** `{ "person": { … } }` — inclui `address`, `documents`, `employment`, `access`, `applicationIds`, `roleIds`, `attachments`.

### `PUT /api/platform/people/:id`

| Campo | Valor |
|-------|-------|
| **Objetivo** | Atualizar seções do cadastro oficial |

### `DELETE /api/platform/people/:id`

| Campo | Valor |
|-------|-------|
| **Objetivo** | Excluir pessoa (cascade nas tabelas `person_*`) |

### `POST /api/platform/people/:id/attachments`

| Campo | Valor |
|-------|-------|
| **Objetivo** | Registrar anexo (metadados: `category`, `label`, `fileName`, `filePath`) |

### `DELETE /api/platform/people/:id/attachments/:attachId`

| Campo | Valor |
|-------|-------|
| **Objetivo** | Remover anexo da pessoa |

**Wrappers Admin:** mesmas rotas sob `/api/admin/platform/people` (requer sessão admin).

---

## 4.4 Roles

### `GET /api/platform/roles`

| Campo | Valor |
|-------|-------|
| **Objetivo** | Listar funções oficiais da plataforma |
| **Quando utilizar** | Atribuição de papéis, telas Admin, diagnóstico de acesso |
| **Query params** | Nenhum |

**Resposta 200:**

```json
{
  "roles": [
    {
      "id": "role-platform-admin",
      "name": "Administrador da Plataforma",
      "description": "Função de sistema para gestão do MÖBI OS",
      "system": true,
      "createdAt": "2026-07-09T…"
    }
  ]
}
```

---

## 4.5 Permissions

### `GET /api/platform/permissions`

| Campo | Valor |
|-------|-------|
| **Objetivo** | Listar **todas** as permissões cadastradas no catálogo da plataforma |
| **Quando utilizar** | Administração de acesso, seeds de novos apps, documentação de capabilities |
| **Query params** | Nenhum |

**Resposta 200:**

```json
{
  "permissions": [
    {
      "id": "perm-tools-view",
      "code": "tools.view",
      "name": "Visualizar Tools",
      "description": "",
      "application": "tools",
      "module": "tools",
      "action": "view",
      "createdAt": "2026-07-09T…"
    }
  ]
}
```

> Diferente de `/authorization/permissions`, esta rota retorna o **catálogo completo**, não apenas as permissões efetivas de uma pessoa.

---

## 4.6 Applications

### `GET /api/platform/applications`

| Campo | Valor |
|-------|-------|
| **Objetivo** | Listar todos os aplicativos registrados (ativos e inativos) |
| **Quando utilizar** | Admin, registro de novos apps, Launcher futuro |
| **Query params** | Nenhum |

**Resposta 200:**

```json
{
  "applications": [
    {
      "id": "app-tools",
      "slug": "tools",
      "name": "MÖBI Tools",
      "description": "…",
      "icon": "▣",
      "version": "1.0",
      "permissionPrefix": "tools.",
      "sortOrder": 1,
      "active": true,
      "createdAt": "2026-07-09T…",
      "updatedAt": "2026-07-09T…"
    }
  ]
}
```

---

## 4.7 Navigation

### `GET /api/platform/navigation`

| Campo | Valor |
|-------|-------|
| **Objetivo** | Listar itens de navegação registrados |
| **Quando utilizar** | Menus dinâmicos por app, Portal, Shell evoluído |
| **Query params** | Nenhum |

**Resposta 200:**

```json
{
  "items": [
    {
      "id": "…",
      "applicationId": "app-portal",
      "parentId": null,
      "title": "Meu perfil",
      "route": "/portal/profile",
      "icon": "○",
      "sortOrder": 0,
      "active": true,
      "createdAt": "2026-07-09T…"
    }
  ]
}
```

Pode retornar `"items": []` — estrutura pronta, conteúdo ainda em evolução.

---

## 4.8 Sessions

### `GET /api/platform/sessions`

| Campo | Valor |
|-------|-------|
| **Objetivo** | Listar sessões ativas/registradas da plataforma |
| **Quando utilizar** | Admin (monitoramento), segurança, diagnóstico |
| **Query params** | Nenhum (limite interno: 200 registros mais recentes) |

**Resposta 200:**

```json
{
  "sessions": [
    {
      "id": "…",
      "personId": "person-platform-default",
      "personName": "Administrador da Plataforma",
      "personEmail": "admin@mobios.com",
      "device": null,
      "browser": null,
      "ip": null,
      "createdAt": "2026-07-09T…",
      "expiresAt": "2026-07-10T…"
    }
  ]
}
```

Pode retornar `"sessions": []` até a Fase 4 (login único).

---

## 4.9 Audit

### `GET /api/platform/audit`

| Campo | Valor |
|-------|-------|
| **Objetivo** | Consultar trilha de auditoria centralizada |
| **Quando utilizar** | Admin, compliance, investigação de ações |
| **Query params** | Nenhum (limite interno: 200 registros mais recentes) |

**Resposta 200:**

```json
{
  "logs": [
    {
      "id": "…",
      "personId": "person-platform-default",
      "personName": "Administrador da Plataforma",
      "application": "admin",
      "module": "users",
      "entity": "person",
      "entityId": "…",
      "action": "UPDATE",
      "beforeJson": null,
      "afterJson": null,
      "ip": null,
      "device": null,
      "createdAt": "2026-07-09T…"
    }
  ]
}
```

Gravação de audit via API: **planejado**.

---

## 4.10 Settings

### `GET /api/platform/settings`

| Campo | Valor |
|-------|-------|
| **Objetivo** | Obter configurações globais da instalação |
| **Quando utilizar** | Exibir nome da plataforma, e-mail de suporte, branding no Shell |
| **Query params** | Nenhum |

**Resposta 200:**

```json
{
  "platformName": "MÖBI OS",
  "supportEmail": ""
}
```

---

### `PUT /api/platform/settings`

| Campo | Valor |
|-------|-------|
| **Objetivo** | Atualizar configurações globais |
| **Quando utilizar** | Tela Admin de configurações, setup inicial |
| **Body** | JSON |

**Corpo da requisição:**

```json
{
  "platformName": "MÖBI OS",
  "supportEmail": "suporte@empresa.com"
}
```

**Resposta 200:**

```json
{ "ok": true }
```

---

## 4.11 Rotas complementares (existentes)

Estas rotas existem e fazem parte do contrato, embora sejam mais administrativas/diagnósticas.

### `GET /api/platform/architecture`

| Campo | Valor |
|-------|-------|
| **Objetivo** | Resumo arquitetural: camadas, contadores, componentes e legados |
| **Quando utilizar** | Diagnóstico, tela Admin de arquitetura |

**Resposta 200:** objeto com `model`, `counts`, `components`, `legacy`.

---

### `GET /api/platform/stats`

| Campo | Valor |
|-------|-------|
| **Objetivo** | Contadores agregados da plataforma |
| **Quando utilizar** | Dashboard Admin |

**Resposta 200:**

```json
{
  "users": 1,
  "roles": 1,
  "departments": 0,
  "applications": 5,
  "sessions": 0,
  "auditLogs": 0
}
```

---

# 5. Fluxo Oficial de Login

> **Estado:** fluxo **definitivo** (arquitetura). Implementação completa: **Fase 4 (planejado)**.

```text
Pessoa (people)
      │
      ▼
Sessão (platform_sessions)     ← login único (planejado)
      │
      ▼
Permissões efetivas
      │
      ▼
Aplicativos autorizados
      │
      ▼
Launcher (filtra apps visíveis)
      │
      ▼
Usuário abre Aplicativo
      │
      ▼
Aplicativo consulta Platform   ← identity + authorization
```

### Comportamento hoje (transição)

1. Login legado ainda ocorre via `/api/login` (Tools) — **não faz parte deste contrato**.
2. `GET /api/platform/identity` retorna a pessoa padrão seedada.
3. Sessões unificadas ainda não governam o contexto de identidade.

### Comportamento futuro (Fase 4)

1. Pessoa autentica uma vez.
2. Platform cria sessão em `platform_sessions`.
3. Toda requisição resolve identidade via sessão.
4. Apps consultam Platform — nunca validam credenciais localmente.

---

# 6. Fluxo Oficial de Permissões

```text
People
   │
   ▼
Person_Roles  ──►  Roles
                       │
                       ▼
                 Role_Permissions
                       │
                       ▼
                 Permissions
                       │
                       ▼
                 Applications (permission_prefix)
                       │
                       ▼
                 Launcher (apps visíveis)
```

## 6.1 Regra de descoberta de aplicativos

1. Cada registro em `applications` possui um **`permissionPrefix`** (ex.: `tools.`, `crm.`, `finance.`).
2. A Platform calcula todas as permissões efetivas da pessoa.
3. Um aplicativo aparece no Launcher quando a pessoa possui **ao menos uma permissão** cujo `code` **começa com** o `permissionPrefix` daquele app.
4. Exemplo: permissão `crm.customer.create` autoriza acesso ao app com prefixo `crm.`.

## 6.2 Estado do Launcher

Hoje o Launcher é **estático** (HTML + `data-launch`).

Consumo de `GET /api/platform/authorization/accessible-apps` no Launcher: **planejado** (Fase 6).

---

# 7. Fluxo Oficial para Novos Aplicativos

## 7.1 Checklist obrigatório

Quando nasce um aplicativo novo (Portal, CRM, Financeiro, RH, IA, …):

| # | Ação | Obrigatório |
|---|------|-------------|
| 1 | Registrar-se em `applications` (via seed Platform ou Admin) | Sim |
| 2 | Definir `permission_prefix` único (ex.: `portal.`, `crm.`) | Sim |
| 3 | Criar permissões no catálogo (`permissions`) no padrão `{prefixo}modulo.acao` | Sim |
| 4 | Consumir Platform para identidade e autorização | Sim |
| 5 | Integrar Shell (launcher, nav, build, deploy) | Sim |
| 6 | Expor APIs próprias em `/api/{app}/*` | Sim |
| 7 | **Nunca** criar tabela de usuários | Sim |
| 8 | **Nunca** criar login local | Sim |
| 9 | **Nunca** criar auditoria própria | Sim |
| 10 | **Nunca** criar sessões próprias | Sim |
| 11 | **Nunca** criar identidade paralela | Sim |

## 7.2 Registro mínimo de um app

Exemplo conceitual para um app **CRM**:

| Campo | Valor exemplo |
|-------|---------------|
| `slug` | `crm` |
| `permission_prefix` | `crm.` |
| Permissões | `crm.customer.create`, `crm.customer.view`, `crm.deal.edit`, … |

---

# 8. Exemplos de Utilização

Exemplos **sem código interno** — apenas chamadas HTTP e intenção.

---

## 8.1 Portal — consultar pessoa atual

**Cenário:** Portal abre e precisa exibir nome e e-mail do colaborador.

1. `GET /api/platform/identity`
### Cadastro oficial de colaborador (fluxo obrigatório)

1. **Platform:** `POST /api/platform/people` — cria `people`, `person_access`, `person_roles`, etc.
2. **Wizard UI:** `Admin → Pessoas → Novo Colaborador` (`CollaboratorWizard.jsx`).
3. **Por aplicativo:** se MÖBI Time selecionado → `POST /api/ponto/time-employees` com `{ personId, workScheduleId, shiftPlanId }`.
4. **Proibido no Time:** `POST /api/ponto/onboarding`, criação de `people`/`person_access`/`ponto_users`.

### `POST /api/ponto/time-employees` (MÖBI Time — vínculo operacional)

| Campo | Tipo | Obrigatório |
|-------|------|-------------|
| `personId` | string | Sim — `people.id` existente |
| `workScheduleId` | string | Não |
| `shiftPlanId` | string | Não |
| `operationalStatus` | `ACTIVE` \| `INACTIVE` | Não |

**Resposta 201:** `{ "employee": { …, "personId", "workScheduleId", … } }` — dados pessoais enriquecidos via join em `people`.

**Depreciados (compatibilidade temporária):** `POST /api/ponto/employees`, `POST /api/ponto/onboarding` — retornam `deprecated: true` ou erro 400.

---

2. Usar `person.name` e `person.email` na UI.
3. Guardar `person.id` para chamadas subsequentes.

---

## 8.2 Portal — verificar permissões

**Cenário:** Portal exibe módulo "Solicitações" apenas se autorizado.

1. `GET /api/platform/identity` → obter `personId`.
2. `GET /api/platform/authorization/permissions?personId={id}`
3. Verificar se existe permissão com `code` igual a `portal.requests.view` (ou prefixo `portal.`).
4. Exibir ou ocultar módulo conforme resultado.

---

## 8.3 CRM — consultar permissões antes de ação

**Cenário:** Botão "Criar cliente" no CRM.

1. `GET /api/platform/authorization/permissions?personId={id}`
2. Confirmar presença de `crm.customer.create`.
3. Se ausente, ocultar botão ou retornar erro amigável na ação.

---

## 8.4 Financeiro — consultar Settings

**Cenário:** App Financeiro exibe nome da empresa/plataforma no cabeçalho.

1. `GET /api/platform/settings`
2. Usar `platformName` no título.
3. Usar `supportEmail` em link "Precisa de ajuda?".

---

## 8.5 Time — consultar Identity

**Cenário:** MÖBI Time precisa associar registro de ponto à Pessoa oficial (futuro).

1. `GET /api/platform/identity`
2. Usar `person.id` como referência oficial — **não** `ponto_users.id`.
3. Durante migração, mapeamento legado permanece; destino é `people`.

---

## 8.6 Launcher — listar apps do colaborador (futuro)

**Cenário:** Launcher dinâmico após Fase 6.

1. `GET /api/platform/identity`
2. `GET /api/platform/authorization/accessible-apps?personId={id}`
3. Renderizar apenas os apps retornados, ordenados por `sortOrder`.

---

# 9. Boas Práticas

| Prática | Descrição |
|---------|-----------|
| **Consumir Platform** | Toda necessidade de identidade, permissão, sessão, audit ou settings passa pela Platform |
| **Namespace próprio** | Regras de negócio ficam em `/api/{seu-app}/*` |
| **Isolamento de banco** | App acessa apenas suas tabelas + Platform (via API) |
| **Permissões semânticas** | Usar `app.modulo.acao`, nunca nomes de tela |
| **Registro antes de código** | Registrar app e permissões antes de implementar gates de acesso |
| **Respeitar transição** | Cadastros legados existem; novos apps **não** os estendem |

---

# 10. Antipadrões (Proibidos)

| Antipadrão | Por que é proibido |
|------------|-------------------|
| Criar `portal_users`, `crm_users`, etc. | Duplica identidade — destino é `people` |
| Implementar login local no app | Login único é responsabilidade da Platform (Fase 4) |
| Criar tabela `crm_permissions` | Permissões são centralizadas em `permissions` |
| Gravar audit em `crm_audit_log` | Auditoria é centralizada em `audit_logs` |
| Criar sessão própria no app | Sessões unificadas em `platform_sessions` |
| Chamar API do Time a partir do CRM | Apps não dependem uns dos outros |
| Ler tabela `ponto_employees` de outro domínio | Viola isolamento de banco |
| Hardcodar lista de apps no Launcher permanentemente | Destino é `applications` + authorization |
| Implementar config global em `.env` do app | Settings globais pertencem à Platform |

---

# 11. Roadmap de Serviços (Planejados)

Serviços **não implementados**. Registrados aqui para orientar evolução — **não inventar implementação local**.

| Serviço | Descrição | Fase estimada |
|---------|-----------|---------------|
| **Login único** | Autenticação + `platform_sessions` + cookie/token unificado | Fase 4 |
| **Enforcement** | Bloqueio de APIs por permissão | Fase 4 |
| **CRUD People/Roles/Permissions** | Gestão completa via `/api/platform/*` | Pós-Fase 4 |
| **Gravação de Audit** | `POST /api/platform/audit` ou helper oficial | Pós-Fase 4 |
| **Notificações** | Push/e-mail/in-app centralizado | Futuro |
| **Arquivos** | Storage compartilhado de anexos | Futuro |
| **Mensageria** | Filas e entrega entre domínios | Futuro |
| **Eventos** | Pub/sub de domínio (ex.: `person.created`) | Futuro |
| **Integrações** | Conectores externos (ERP, folha, etc.) | Futuro |
| **Feature Flags** | Liga/desliga funcionalidades por tenant/pessoa | Futuro |
| **Licenciamento** | Planos, limites, módulos contratados | Futuro |

---

# 12. Compatibilidade e Legado

## 12.1 Cadastros legados (transição)

Estas tabelas **existem hoje** por compatibilidade. **Não fazem parte da arquitetura definitiva.**

| Tabela | Domínio atual | Destino |
|--------|---------------|---------|
| `platform_users` | Tools / WorkMaps | `people` |
| `admin_users` | Admin (CRUD temporário) | `people` |
| `ponto_users` | Time | `people` |
| `ponto_employees` | Time | `people` |

Novos aplicativos **não devem** ler nem escrever nessas tabelas.

## 12.2 APIs legadas Admin (`/api/admin/*`)

Wrappers de compatibilidade que delegam aos mesmos serviços Platform.

Exemplos:

| Legado | Equivalente Platform |
|--------|---------------------|
| `GET /api/admin/platform/person` | `GET /api/platform/identity` |
| `GET /api/admin/platform/accessible-apps` | `GET /api/platform/authorization/accessible-apps` |
| `GET /api/admin/applications` | `GET /api/platform/applications` |
| `GET /api/admin/permissions` | `GET /api/platform/permissions` |
| `GET /api/admin/people` | `GET /api/platform/people` |
| `GET /api/admin/audit-logs` | `GET /api/platform/audit` |
| `GET /api/admin/sessions` | `GET /api/platform/sessions` |
| `GET/PUT /api/admin/settings` | `GET/PUT /api/platform/settings` |

**Novos aplicativos devem usar `/api/platform/*`**, não `/api/admin/*`.

## 12.3 Plano de migração

Detalhes em [`IDENTITY_MIGRATION_PLAN.md`](./IDENTITY_MIGRATION_PLAN.md).

Estado arquitetural em [`AUDITORIA_PLATFORM.md`](./AUDITORIA_PLATFORM.md).

---

# 13. Regras Permanentes

1. **Qualquer novo aplicativo do MÖBI OS deverá obrigatoriamente utilizar os serviços da Platform.**

2. **É proibido implementar novamente qualquer serviço já fornecido pela Platform** (identidade, autenticação, autorização, auditoria, sessões, configurações globais, registro de apps, navegação central).

3. **Caso exista necessidade de ampliar a infraestrutura compartilhada:**
   - Primeiro a **Platform evolui** (contrato atualizado neste documento + Bíblia).
   - Depois os **aplicativos passam a consumir** a nova funcionalidade.
   - **Nunca o contrário** (app implementa localmente e depois "migra").

4. **Em caso de conflito** entre implementação ad hoc e este contrato, **prevalecem** [`BIBLIA_MOBI_OS.md`](./BIBLIA_MOBI_OS.md) e [`API_PLATFORM.md`](./API_PLATFORM.md) até decisão formal registrada no histórico de versões.

---

# 14. Documentos Relacionados

| Documento | Papel |
|-----------|-------|
| [`BIBLIA_MOBI_OS.md`](./BIBLIA_MOBI_OS.md) | Constituição arquitetural — regras permanentes |
| [`API_PLATFORM.md`](./API_PLATFORM.md) | Contrato técnico Platform ↔ Aplicativos |
| [`AUDITORIA_PLATFORM.md`](./AUDITORIA_PLATFORM.md) | Estado atual da extração e implementação |
| [`IDENTITY_MIGRATION_PLAN.md`](./IDENTITY_MIGRATION_PLAN.md) | Plano de migração de identidade |

---

*Contrato vivo. Última revisão: versão 1.0.0 — 9 de julho de 2026.*

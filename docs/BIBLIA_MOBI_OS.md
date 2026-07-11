# Bíblia do MÖBI OS

**A Constituição Arquitetural da Plataforma**

| Campo | Valor |
|-------|-------|
| **Versão da Bíblia** | 1.3.1 |
| **Data** | 9 de julho de 2026 |
| **Autor** | MÖBI OS — decisão coletiva da plataforma |
| **Status** | Vigente |

---

## Prefácio

Este documento é a **fonte oficial** das decisões arquitetônicas do MÖBI OS.

Ele não substitui o README operacional da raiz do projeto. Ele não descreve código linha a linha. Ele define **filosofia, limites, responsabilidades e regras permanentes** para que a plataforma possa crescer por muitos anos sem perder coerência.

O contrato técnico de consumo da Plataforma está em **[`API_PLATFORM.md`](./API_PLATFORM.md)**. A Bíblia define **as regras da arquitetura**; a API Platform define **o contrato entre Platform e aplicativos**. **Ambos possuem a mesma autoridade** dentro do projeto.

**Toda nova funcionalidade começa pela leitura destes dois documentos.**

---

## Histórico de alterações

| Versão | Data | Autor | Resumo |
|--------|------|-------|--------|
| 1.3.1 | 2026-07-09 | MÖBI OS | Publicação de `API_PLATFORM.md` — contrato oficial Platform ↔ Aplicativos. |
| 1.3.0 | 2026-07-09 | MÖBI OS | Fase 3.5: domínio `platform/` extraído do Admin; APIs `/api/platform/*`; Admin passa a consumir serviços compartilhados. |
| 1.2.0 | 2026-07-09 | MÖBI OS | Fase 3 Identidade: `people` oficial, `permission_prefix`, `getCurrentPerson`, `getAccessibleApplications`, capítulo de identidade e autorização. |
| 1.0.0 | 2026-07-09 | MÖBI OS | Publicação inicial da Bíblia. Documenta arquitetura real: Shell, Launcher, Tools, WorkMaps, Time, Admin, Plataforma, banco, APIs, build e deploy. |

---

# 1. Filosofia do Projeto

## 1.1 O que é o MÖBI OS

O MÖBI OS é um **Sistema Operacional Empresarial**.

Assim como um sistema operacional de computador fornece ambiente, navegação e serviços comuns para que programas executem de forma independente, o MÖBI OS fornece **infraestrutura compartilhada** para que **aplicativos empresariais** coexistam na mesma empresa, na mesma interface e na mesma base tecnológica — sem se tornarem um único monólito de negócio.

## 1.2 Como a plataforma cresce

O crescimento do MÖBI OS ocorre pela **adição de aplicativos**, não pela inflação de um único módulo.

Cada aplicativo:

- Resolve um **domínio de negócio** específico.
- Possui **frontend e backend próprios** (organizados em pasta dedicada).
- Integra-se ao **Shell** e ao **Launcher** sem alterar os demais aplicativos.
- Compartilha apenas o que é **infraestrutura de plataforma** (identidade futura, permissões, auditoria, registro de apps, etc.).

## 1.3 O papel da Plataforma

A **Plataforma** é a camada que administra o que é comum a todos os aplicativos:

- Quem são as pessoas (futuro cadastro único).
- Quais papéis e permissões existem.
- Quais aplicativos estão disponíveis.
- Como a navegação será registrada (futuro).
- Como ações são auditadas.
- Como sessões serão centralizadas (futuro).

A Plataforma **não executa regra de negócio** de ferramentas, mapas de trabalho, ponto eletrônico ou CRM. Ela **administra o ecossistema**.

## 1.4 O papel do Shell

O **Shell** é a casca visual e de navegação: header global, sidebar, launcher, troca entre aplicativos. Ele **orquestra a experiência**, mas **não é dono de domínio de negócio**.

## 1.5 O papel do MÖBI Admin

O **MÖBI Admin** é o **Centro Administrativo da Plataforma**. Ele **administra** identidade, segurança, aplicativos, auditoria e configurações — mas **não é proprietário** desses serviços. A lógica pertence ao domínio **`platform/`** do Sistema Operacional; o Admin apenas consome e expõe telas de gestão.

---

# 2. Visão Geral da Arquitetura

## 2.1 Camadas

```
┌─────────────────────────────────────────────────────────────┐
│                         SHELL                                │
│  Header · Sidebar · Launcher · Troca de aplicativos         │
│  (index.html · app.js · styles.css)                           │
└──────────────────────────┬──────────────────────────────────┘
                           │
         ┌─────────────────┼─────────────────┐
         ▼                 ▼                 ▼
   ┌───────────┐    ┌───────────┐    ┌───────────┐
   │ MÖBI Tools│    │ WorkMaps  │    │ MÖBI Time │  …
   │ (vanilla) │    │ (React)   │    │ (React)   │
   └─────┬─────┘    └─────┬─────┘    └─────┬─────┘
         │                │                │
         └────────────────┼────────────────┘
                          ▼
              ┌───────────────────────┐
              │   RUNTIME (server.js)  │
              │   Porta única · HTTP   │
              │   APIs por namespace   │
              └───────────┬───────────┘
                          ▼
              ┌───────────────────────┐
              │   PLATFORM (platform/) │
              │  identity · auth ·     │
              │  people · roles ·      │
              │  permissions · apps ·  │
              │  audit · sessions ·    │
              │  settings · navigation │
              └───────────┬───────────┘
                          ▼
              ┌───────────────────────┐
              │   MÖBI Admin (admin/)  │
              │   Consome Platform ·   │
              │   telas de gestão      │
              └───────────┬───────────┘
                          ▼
              ┌───────────────────────┐
              │   BANCO (SQLite)       │
              │   moble-tools.sqlite   │
              │   Tabelas por domínio  │
              └───────────┬───────────┘
                          ▼
              ┌───────────────────────┐
              │   INFRAESTRUTURA       │
              │   Deploy · uploads ·   │
              │   scripts install/     │
              └───────────────────────┘
```

## 2.2 Estado atual (runtime)

Hoje o MÖBI OS opera como **monólito de execução**:

- **Um processo Node** (`server.js`, porta 4173).
- **Um banco SQLite** (`data/moble-tools.sqlite`).
- **Uma página HTML** com launcher e shells por aplicativo.

A **independência** está na **organização do código-fonte** (pastas e namespaces), preparando evolução futura sem reestruturação traumática.

## 2.3 Fluxo do usuário

1. Acesso à URL da plataforma.
2. **Launcher** — escolha do aplicativo (Dashboard de apps).
3. **Shell** — header e sidebar do app selecionado.
4. **Aplicativo** — conteúdo montado na área de trabalho (`workspace`, `planner-shell`, `ponto-shell`, `admin-shell`, etc.).
5. **APIs** — comunicação com backend via `/api/...` namespaced.

## 2.4 Aplicativos vigentes

| Aplicativo | Pasta | Frontend | API | Mount global |
|------------|-------|----------|-----|--------------|
| **MÖBI Tools** | raiz (`app.js`) | Vanilla JS embutido no Shell | `/api/*` (exceto namespaces) | `switchView()` |
| **MÖBI WorkMaps** | `planner/` | React + Vite | `/api/planner/*` | `window.MooblePlanner` |
| **MÖBI Time** | `ponto/` | React + Vite | `/api/ponto/*` | `window.MoobleTime` |
| **MÖBI Admin** | `admin/` | React + Vite | `/api/admin/*` | `window.MoobleAdmin` |

---

# 3. Princípios Permanentes

Estes princípios **não são sugestões**. São leis da plataforma.

## 3.1 Shell e navegação

1. **O Shell nunca contém regra de negócio.** Apenas orquestra layout, launcher, troca de produto e elementos globais de UI.
2. **O Launcher apenas registra e abre aplicativos.** No futuro lerá a tabela `applications`; hoje o registro é HTML + `data-launch`, evoluindo sem quebrar o contrato.
3. **Cada aplicativo é plugável** — entra pelo launcher, monta em shell dedicado, expõe API namespaced.

## 3.2 Isolamento entre aplicativos

4. **Aplicativos nunca dependem diretamente entre si.** Tools não importa código do Time; WorkMaps não chama handlers do Admin.
5. **Nenhum aplicativo altera outro aplicativo** ao ser desenvolvido ou deployado.
6. **Toda nova funcionalidade pertence a um único domínio.** Se não cabe em um domínio, cria-se um novo aplicativo — não se espalha.

## 3.3 Plataforma e identidade

7. **Toda identidade pertence à Plataforma** (entidade `people` — meta arquitetural). Cadastros legados (`platform_users`, `ponto_users`, `admin_users`) são **transição**, não destino.
8. **Toda permissão pertence à Plataforma** (tabela `permissions`, padrão `app.modulo.acao`). Aplicativos **consomem** permissões; não as inventam em silos permanentes.
9. **Nenhum aplicativo duplica** responsabilidades de People, Roles, Permissions, Applications, Navigation, Audit, Sessions ou Settings da Plataforma.
10. **Nenhum aplicativo implementa serviços de identidade, autenticação, autorização, auditoria, sessões ou configurações locais.** Todos esses serviços pertencem exclusivamente ao domínio **`platform/`**.

## 3.4 Backend e frontend

11. **Cada aplicativo possui frontend e backend próprios** (pasta dedicada; handlers separados ou módulo claro no caso legado do Tools).
12. **Handlers de negócio não crescem sem limite em `server.js`.** Novos apps usam `server-handlers/` e registro mínimo no servidor principal.
13. **APIs usam namespace obrigatório:** `/api/{dominio}/...`. Nunca misturar rotas de domínios diferentes no mesmo handler ambíguo.

## 3.5 Evolução e compatibilidade

14. **Nunca quebrar aplicativos em produção** para conveniência de desenvolvimento.
15. **Migrações são explícitas e faseadas.** Tabelas legadas permanecem até migração autorizada e documentada na Bíblia.
16. **O acoplamento só diminui com o tempo.** Novos módulos seguem o padrão mais desacoplado existente (Admin / Time como referência).

## 3.6 Design e experiência

17. **Um único Design System visual** (`styles.css` na raiz). Aplicativos React usam classes globais; CSS complementar apenas em `{app}.css`.
18. **O usuário deve sentir que sempre existiu no MÖBI OS** — novos apps não criam identidade visual paralela.

---

# 4. Domínios Oficiais

## 4.1 Plataforma

**Responsabilidade:** infraestrutura comum — identidade futura, permissões, registro de aplicativos, navegação futura, auditoria central, sessões futuras, configurações globais.

**Onde vive hoje:** domínio **`platform/`** (`platform/server-handlers/`) — schema, serviços e APIs `/api/platform/*`. Tabelas: `people`, `roles`, `permissions`, `role_permissions`, `person_roles`, `person_permissions`, `departments`, `applications`, `navigation_items`, `audit_logs`, `platform_sessions`. O **MÖBI Admin** consome esses serviços para telas de gestão.

**O que não faz:** cadastrar ferramentas, desenhar mapas, bater ponto, emitir nota fiscal.

---

## 4.2 Shell

**Responsabilidade:** login (quando ativo), launcher, header, sidebar por app, chip de usuário, busca global (Tools), troca `body.product-*`, montagem dos bundles React.

**Artefatos:** `index.html`, `app.js`, `styles.css`.

**O que não faz:** persistir regras de negócio; substituir APIs de aplicativos.

---

## 4.3 MÖBI Tools

**Responsabilidade:** gestão de ferramentas de obra — cadastro, categorias, listas requeridas, caixas de obra, separações, colaboradores operacionais (`platform_users` no contexto Tools).

**Artefatos:** views no `index.html`, lógica em `app.js`, APIs `/api/tools`, `/api/jobs`, `/api/categories`, etc. em `server.js`.

**Estado arquitetural:** núcleo histórico acoplado ao monólito; **novos apps não replicam este padrão**.

---

## 4.4 MÖBI WorkMaps (Planner)

**Responsabilidade:** engine de mapas de trabalho — mapas, blocos, conexões, colaboradores em execução, listas e comentários.

**Artefatos:** `planner/`, APIs `/api/planner/*`, tabelas `planner_*`.

**Acoplamento conhecido (transição):** colaboradores leem `platform_users` do Tools.

---

## 4.5 MÖBI Time

**Responsabilidade:** cartão ponto — jornadas, escalas, registros, espelho, relatórios, vínculo operacional `ponto_employees.person_id`.

**Cadastro de colaboradores:** **não** pertence ao Time. Use a Platform (`POST /api/platform/people`) e vincule via `POST /api/ponto/time-employees`.

**Artefatos:** `ponto/`, `ponto/server-handlers.js`, APIs `/api/ponto/*`, tabelas `ponto_*`, uploads em `uploads/ponto/`.

**Acoplamento conhecido (transição):** `ponto_users` legado (somente leitura); `ponto_employees.name` etc. mantidos para compatibilidade — fonte mestre é `people`.

---

## 4.6 MÖBI Admin

**Responsabilidade:** centro administrativo — dashboard da plataforma, governança de apps, preparação de identidade única, permissões, auditoria e sessões centralizadas.

**Artefatos:** `admin/`, `admin/server-handlers/`, APIs `/api/admin/*`.

**O que não faz:** substituir telas operacionais do Tools, WorkMaps ou Time.

---

## 4.7 Domínios futuros (oficiais na visão, não implementados)

| Domínio | Responsabilidade prevista |
|---------|---------------------------|
| **Portal do Colaborador** | experiência unificada do colaborador (ponto, tarefas, comunicados) |
| **CRM** | relacionamento com clientes e oportunidades |
| **Financeiro** | contas, fluxo de caixa, integrações fiscais |
| **Inventário / Estoque** | materiais além do escopo operacional do Tools |
| **Compras** | requisições, cotações, pedidos |
| **RH** | admissão, férias, documentos trabalhistas |
| **Documentos** | GED corporativo |
| **Treinamentos** | capacitação e certificações |
| **IA** | assistentes e automações transversais (sem dono de negócio único) |

Cada domínio futuro **nascerá como aplicativo** seguindo o padrão oficial da seção 5.

---

# 5. Estrutura Oficial dos Aplicativos

Todo **novo** aplicativo do MÖBI OS **deve** seguir este padrão.

```
{app}/
├── package.json          # dependências e scripts do frontend
├── vite.config.js        # build → {app}/dist/{app}.js + .css
├── server-handlers.js    # barrel (reexporta server-handlers/)
├── server-handlers/      # lógica de API dividida por domínio
│   ├── index.js
│   ├── schema.js         # DDL e seeds do domínio + plataforma se aplicável
│   ├── router.js
│   └── *.js              # um arquivo por área (dashboard, users, etc.)
├── src/
│   ├── main.jsx          # expõe window.Mooble{App}
│   ├── App.jsx
│   ├── *Views.jsx
│   ├── api.js
│   └── {app}.css         # apenas complementos ao design system
└── dist/                 # artefato de produção (build)
    ├── {app}.js
    └── {app}.css
```

## 5.1 Contrato de montagem (frontend)

Cada aplicativo React expõe um objeto global:

```text
window.Mooble{AppName} = {
  mount(element),
  navigate(view),    // opcional, sincroniza com sidebar do Shell
  unmount(element),  // opcional
}
```

O Shell chama `mount` ao abrir o app via `switchProduct()` em `app.js`.

## 5.2 Contrato de integração (Shell)

Para cada novo app, **apenas acrescentar**:

1. Botão no **Launcher** (`data-launch="{slug}"`).
2. **Nav** lateral (`#{app}NavList`, `data-{app}-view`).
3. **Shell** de conteúdo (`#{app}Shell`, `#{app}Root`).
4. Links para `dist/{app}.js` e `dist/{app}.css` no `index.html`.
5. Regras CSS **aditivas** `body.product-{slug}` em `styles.css`.
6. Ramo em `switchProduct()` — sem alterar comportamento dos apps existentes.

## 5.3 Contrato de integração (backend)

1. `init{App}Database(db)` — cria tabelas do domínio (prefixo ou namespace claro).
2. `create{App}Handlers(deps)` — retorna `handle{App}Api`.
3. Em `server.js`, **somente**:
   - import do módulo;
   - chamada de init;
   - despacho `if (pathname.startsWith("/api/{app}/"))` **antes** de rotas genéricas.

**Proibido:** adicionar centenas de linhas de regra de negócio diretamente em `server.js` para novos apps.

---

# 6. Plataforma

## 6.1 Entidades oficiais da Plataforma

| Entidade | Tabela | Status |
|----------|--------|--------|
| **People** | `people` | Fundação criada; migração pendente |
| **Roles** | `roles` | Fundação criada |
| **Permissions** | `permissions` | Seed com padrão `app.modulo.acao` |
| **Role ↔ Permission** | `role_permissions` | Estrutura pronta |
| **Person ↔ Role** | `person_roles` | Estrutura pronta |
| **Person ↔ Permission** | `person_permissions` | Estrutura pronta |
| **Departments** | `departments` | Fundação criada |
| **Applications** | `applications` | Seed dos 5 apps atuais |
| **Navigation** | `navigation_items` | Estrutura pronta; launcher ainda estático |
| **Audit** | `audit_logs` | Auditoria centralizada futura |
| **Sessions** | `platform_sessions` | Sessão unificada futura (não confundir com `sessions` legado do Tools) |
| **Settings** | `admin_settings` + evolução | Configurações administrativas |

## 6.2 Cadastros legados (transição)

Existem hoje **múltiplas representações de pessoa/usuário**. Isso é **dívida consciente**, não modelo final:

| Legado | Domínio | Destino |
|--------|---------|---------|
| `platform_users` | Tools / WorkMaps | `people` |
| `ponto_users` + `ponto_employees` | Time | `people` |
| `admin_users` | Admin (temporário) | `people` |
| `sessions` | Tools | `platform_sessions` |
| `admin_sessions` | Admin legado | `platform_sessions` |
| `ponto_sessions` | Time | `platform_sessions` |

**Nenhum desenvolvedor cria um quinto cadastro.** Novos vínculos devem apontar para a Plataforma ou permanecer no domínio do app até migração aprovada.

## 6.3 Responsabilidade do MÖBI Admin sobre a Plataforma

O Admin **administra** a Plataforma via telas e rotas `/api/admin/*` (wrappers de compatibilidade). A **lógica e a propriedade** dos serviços compartilhados pertencem ao domínio **`platform/`**. Os demais apps **consomem** identidade e permissões quando o login único estiver ativo.

## 6.4 Domínio Platform (Fase 3.5)

A Plataforma possui pasta dedicada na raiz do repositório:

```text
platform/
  server-handlers.js          ← barrel (importado por server.js)
  server-handlers/
    schema.js                 ← DDL + seeds da Plataforma
    context.js
    router.js                 ← /api/platform/*
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

**Pertence à Plataforma:** People, Roles, Permissions, Applications, Navigation, Audit, Platform Sessions, Settings, Identity, Authorization.

**Pertence aos Aplicativos:** regra de negócio do domínio (ferramentas, mapas, ponto, CRM, etc.), tabelas prefixadas do app, UI e APIs `/api/{app}/*`.

## 6.5 APIs oficiais da Plataforma

Namespace: **`/api/platform/*`**

| Rota | Método | Serviço |
|------|--------|---------|
| `/api/platform/identity` | GET | Pessoa atual (`getCurrentPerson`) |
| `/api/platform/authorization/accessible-apps` | GET | Apps autorizados |
| `/api/platform/authorization/permissions` | GET | Permissões da pessoa |
| `/api/platform/people` | GET, POST | Lista e criação de pessoas |
| `/api/platform/people/:id` | GET, PUT, DELETE | Perfil completo do cadastro oficial |
| `/api/platform/people/:id/attachments` | POST | Anexos da pessoa |
| `/api/platform/people/:id/attachments/:attachId` | DELETE | Remover anexo |
| `/api/platform/roles` | GET | Funções da plataforma |
| `/api/platform/permissions` | GET | Permissões cadastradas |
| `/api/platform/applications` | GET | Aplicativos registrados |
| `/api/platform/navigation` | GET | Itens de navegação |
| `/api/platform/audit` | GET | Logs de auditoria |
| `/api/platform/sessions` | GET | Sessões da plataforma |
| `/api/platform/settings` | GET, PUT | Configurações globais |
| `/api/platform/architecture` | GET | Resumo arquitetural |
| `/api/platform/stats` | GET | Contadores da plataforma |

Rotas legadas **`/api/admin/*`** permanecem como **wrappers** que delegam aos mesmos serviços — compatibilidade total com o frontend Admin atual.

> **Contrato técnico completo:** [`API_PLATFORM.md`](./API_PLATFORM.md) — rotas, respostas, fluxos, exemplos, antipadrões e roadmap de serviços.

## 6.6 Como um aplicativo consome a Plataforma

1. **Importar serviços** de `platform/server-handlers/services/*` no handler do app (server-side), ou chamar **`/api/platform/*`** (client-side).
2. **Obter pessoa atual:** `getCurrentPerson(db, req)` — resolve via cookie `platform_session` e tabela `platform_sessions` (Fase 3 ativa no Portal).
3. **Obter permissões:** `getPersonPermissionCodes(db, personId)` ou GET `/api/platform/authorization/permissions?personId=`.
4. **Obter aplicativos autorizados:** `getAccessibleApplications(db, personId)` ou GET `/api/platform/authorization/accessible-apps`.
5. **Registrar auditoria:** gravar em `audit_logs` via serviço `platform/.../audit` (fase futura: helper `recordAudit()`).
6. **Nunca** criar tabelas locais de usuário, sessão ou permissão.

## 6.7 Como um novo aplicativo se registra

1. Inserir registro em `applications` (seed em `platform/server-handlers/schema.js` ou migração).
2. Definir `permission_prefix` único (ex.: `crm.`).
3. Inserir permissões em `permissions` no padrão `{prefixo}modulo.acao`.
4. Integrar Shell (launcher, nav, build, deploy).
5. Consumir Platform para identidade e autorização — **nunca reimplementar**.

---

# 7. Banco de Dados

## 7.1 Regras permanentes

1. **Um arquivo SQLite** por instalação: `data/moble-tools.sqlite` (estado atual).
2. **Toda tabela pertence a um domínio** — identificável por prefixo (`ponto_`, `planner_`, `admin_`) ou por convenção documentada (`people`, `tools`, `jobs`).
3. **Nunca misturar responsabilidades** na mesma tabela.
4. **Nunca apagar tabela em uso** sem migração e atualização desta Bíblia.
5. **Schema por módulo** — `CREATE IF NOT EXISTS` no init do domínio (`server-handlers/schema.js` ou equivalente).
6. **Foreign keys** entre domínios são exceção e devem ser documentadas (ex.: WorkMaps → `platform_users`).

## 7.2 Mapa de domínios no banco (resumo)

| Domínio | Prefixo / tabelas principais |
|---------|-------------------------------|
| Tools | `tools`, `categories`, `jobs`, `work_boxes`, `platform_users`, `sessions` |
| WorkMaps | `planner_*` |
| Time | `ponto_*` |
| Admin (legado) | `admin_*` |
| Plataforma | `people`, `roles`, `permissions`, `applications`, `navigation_items`, `audit_logs`, `platform_sessions`, `departments` |

---

# 8. Permissões

## 8.1 Padrão obrigatório

Toda permissão da Plataforma segue:

```text
aplicacao.modulo.acao
```

- **aplicacao** — slug do app (`tools`, `planner`, `time`, `admin`, …).
- **modulo** — área funcional dentro do app.
- **acao** — verbo em inglês no imperativo (`view`, `create`, `edit`, `delete`, `execute`, `clock`, `adjust`, `report`, `manage`, …).

## 8.2 Exemplos oficiais

| Código | Significado |
|--------|-------------|
| `tools.view` | Visualizar ferramentas |
| `tools.create` | Criar ferramentas |
| `planner.execute` | Executar mapas de trabalho |
| `time.clock` | Registrar ponto |
| `time.adjust` | Ajustar registros de ponto |
| `admin.users` | Gerenciar usuários da plataforma |
| `admin.roles` | Gerenciar funções |
| `admin.settings` | Configurações da plataforma |

## 8.3 Proibições

- **Nunca** permissões baseadas em telas (`tela_dashboard`, `menu_funcionarios`).
- **Nunca** permissões sem aplicação explícita.
- **Nunca** duplicar a mesma ação com códigos diferentes.

## 8.4 Estado atual

A estrutura e o seed existem. **Enforcement** nas APIs dos apps é fase futura (ver capítulo 9).

---

# 9. Modelo Oficial de Identidade e Autorização

> **Decisão permanente (Fase 3):** a entidade oficial de pessoa na plataforma é **`people`**. O termo **Pessoa** substitui “usuário” como conceito de negócio. “Usuário” refere-se apenas a quem está autenticado em uma sessão.

## 9.1 Fluxo oficial

```
PEOPLE
   │
   ▼
PERSON_ROLES
   │
   ▼
ROLES
   │
   ▼
ROLE_PERMISSIONS
   │
   ▼
PERMISSIONS
   │
   ▼
APPLICATIONS (permission_prefix)
```

## 9.2 Entidades e responsabilidades

| Entidade | Tabela | Função |
|----------|--------|--------|
| **Pessoa** | `people` | Única entidade oficial de pessoa (colaborador, gestor, admin, futuro cliente) |
| **Função** | `roles` | Papéis atribuíveis |
| **Permissão** | `permissions` | Ações no padrão `app.modulo.acao` |
| **Vínculo pessoa-função** | `person_roles` | Quais funções a pessoa possui |
| **Vínculo função-permissão** | `role_permissions` | O que cada função pode fazer |
| **Permissão direta** | `person_permissions` | Exceções por pessoa |
| **Aplicativo** | `applications` | App registrado com `permission_prefix` |

## 9.3 permission_prefix

Cada registro em `applications` possui `permission_prefix` (ex.: `tools.`, `planner.`, `time.`, `admin.`, `portal.`, `crm.`, `finance.`, `ai.`).

Uma pessoa tem acesso a um aplicativo quando possui **ao menos uma permissão** cujo `code` começa com o `permission_prefix` daquele app.

## 9.4 Funções oficiais da Plataforma

| Função | Implementação | Uso |
|--------|---------------|-----|
| `getCurrentPerson(req)` | `platform/server-handlers/services/identity/index.js` | Retorna a Pessoa da Plataforma no contexto atual |
| `getAccessibleApplications(personId)` | `platform/server-handlers/services/authorization/index.js` | Lista apps autorizados via permissões + prefixos |
| `getPersonPermissionCodes(personId)` | idem | Códigos de permissão efetivos da pessoa |

O **Launcher** passará a consumir `getAccessibleApplications` na fase de launcher dinâmico. **Hoje permanece estático** por compatibilidade.

## 9.5 Portal do Colaborador

O Portal será um aplicativo como os demais. Utilizará `people` como identidade, `permissions` para o que o colaborador pode ver, e `getAccessibleApplications` para menu de apps. **Não terá tabela própria de usuários.**

## 9.6 Registro de novos aplicativos

Todo novo app **deve**:

1. Registrar-se em `applications` com `permission_prefix` único.
2. Inserir permissões em `permissions` (`{prefixo}modulo.acao`).
3. **Nunca** criar tabela `*_users`.
4. Consumir `people`, `roles` e `permissions` quando integrado ao login único.

## 9.7 Tabelas legadas (transição)

| Tabela | Status |
|--------|--------|
| `platform_users` | LEGADO — Tools / WorkMaps |
| `admin_users` | LEGADO — Admin temporário |
| `ponto_users` | LEGADO — Time |
| `ponto_employees` | LEGADO — Time |

Permanecem até a **Fase 4** do [`IDENTITY_MIGRATION_PLAN.md`](./IDENTITY_MIGRATION_PLAN.md). **Proibido** criar novas tabelas de usuário.

## 9.8 Sessões

- **Legado:** `sessions` (Tools), `admin_sessions`, `ponto_sessions`
- **Oficial (ativo):** `platform_sessions` vinculada a `people`, cookie `platform_session`

---

# 10. Aplicativos — Nascimento de um novo app

## 10.1 Checklist oficial

| Etapa | Ação |
|-------|------|
| 1 | Ler esta Bíblia e validar o domínio |
| 2 | Criar pasta `{app}/` conforme seção 5 |
| 3 | Definir tabelas com prefixo ou domínio claro |
| 4 | Implementar `server-handlers/` + APIs `/api/{app}/*` |
| 5 | Registrar init e dispatch em `server.js` (mínimo) |
| 6 | Build Vite → `dist/` |
| 7 | Integrar Shell (launcher, nav, shell, app.js, CSS aditivo) |
| 8 | Inserir registro em `applications` (seed Admin) |
| 9 | Definir permissões seed em `permissions` |
| 10 | Atualizar `install/package-deploy.ps1` e scripts `install/` |
| 11 | Atualizar histórico da Bíblia se houver decisão nova |

## 10.2 Build

```bash
cd {app}
npm install
npm run build
```

Produção consome **apenas** `{app}/dist/*`. O servidor não executa Vite em runtime.

## 10.3 Deploy

Empacotamento via `install/package-deploy.ps1` — inclui `dist/` buildado e `server-handlers.js` (e pasta se aplicável).

**Regra:** deploy sem build = aplicativo quebrado no launcher.

## 10.4 Ordem de despacho de APIs em `server.js`

```text
/api/platform/* → Platform (domínio compartilhado)
/api/admin/*    → Admin (wrappers + legado)
/api/ponto/*    → Time
/api/planner/*  → WorkMaps
/api/*          → Tools e plataforma legada
```

Novos namespaces inseridos **acima** das rotas genéricas.

---

# 11. Evolução

## 11.1 Como crescer sem aumentar acoplamento

```
Ano 1 (hoje)     → Monólito modular: um processo, pastas separadas
Ano 2            → Login único + migração people + enforcement de permissões
Ano 3            → Launcher dinâmico (tabela applications)
Ano 4+           → Novos apps (Portal, CRM, Financeiro…) plugados pelo mesmo contrato
```

## 11.2 O que nunca fazer ao crescer

- Transformar o Tools em “super-app” que absorve tudo.
- Mover regra de negócio para o Shell “temporariamente”.
- Criar microserviços sem necessidade antes de esgotar o modularismo atual.
- Unificar bancos por app antes de unificar **identidade**.

## 11.3 Direção da identidade

```text
Hoje:     N cadastros legados coexistem
Meta:     people + roles + permissions + platform_sessions
Caminho:  migrações explícitas, faseadas, documentadas na Bíblia
```

---

# 12. Regras para Desenvolvedores

1. **Leia `/docs/BIBLIA_MOBI_OS.md` antes de qualquer código.**
2. **Nunca quebre a arquitetura existente** para ganhar velocidade pontual.
3. **Nunca remova módulos ou tabelas** sem aprovação e entrada no histórico da Bíblia.
4. **Nunca crie dependência direta** entre aplicativos (import cruzado, API implícita).
5. **Nunca duplique identidade** — use Plataforma ou cadastro legado do domínio até migração.
6. **Nunca coloque regra de negócio na Plataforma** — apenas governança e infraestrutura.
7. **Nunca coloque regra de negócio no Shell.**
8. **Nunca altere CSS global** para necessidade de um único app — use CSS complementar do app.
9. **Nunca altere comportamento de outro app** ao entregar o seu.
10. **Sempre use namespace de API** próprio.
11. **Sempre divida handlers** em módulos quando o domínio crescer.
12. **Sempre atualize a Bíblia** quando uma decisão arquitetural mudar.
13. **Em dúvida, pare e pergunte** — a Bíblia prevalece sobre suposição.

---

# 13. Regras para Inteligências Artificiais

Toda IA que modifica o MÖBI OS **deve** obedecer:

## 12.1 Antes de codificar

1. **Ler `/docs/BIBLIA_MOBI_OS.md` integralmente.**
2. **Inspecionar a arquitetura real** — não assumir padrões de outros projetos.
3. **Identificar o domínio** da tarefa (Shell, Plataforma, Tools, WorkMaps, Time, Admin, novo app).

## 12.2 Em caso de conflito

Se o pedido do usuário **contradiz** esta Bíblia:

1. **PARAR.**
2. **Explicar o conflito** com citação da seção relevante.
3. **Aguardar decisão explícita** do responsável.
4. Só então implementar — e, se for mudança permanente, **propor atualização da Bíblia**.

## 12.3 Proibições para IA

- **Nunca** refatorar o projeto inteiro sem autorização.
- **Nunca** mover arquivos por preferência estética.
- **Nunca** substituir padrões oficiais (mount, handlers, namespace).
- **Nunca** “modernizar” código legado que funciona quando a tarefa é aditiva.
- **Nunca** unificar usuários ou auth sem tarefa explícita de migração.
- **Nunca** remover código ou tabelas “por limpeza”.
- **Nunca** inventar arquitetura diferente da documentada aqui.

## 12.4 Padrão de tarefa aditiva (padrão ouro)

Quando a tarefa é **adicionar** algo:

- Copiar o padrão do aplicativo **mais recente e modular** (hoje: **MÖBI Admin** / **MÖBI Time**).
- Alterar **somente o mínimo** no Shell e `server.js`.
- Manter todos os apps existentes **byte-a-byte funcionais** em comportamento.

---

# 14. Roadmap Arquitetural

Visão oficial — **não é compromisso de prazo**. É direção.

| Fase | Entrega arquitetural |
|------|----------------------|
| **Fase 1** ✅ | Shell + Launcher + Tools + WorkMaps + Time como apps no monólito modular |
| **Fase 2** ✅ | MÖBI Admin + tabelas de Plataforma |
| **Fase 3** ✅ | Identidade oficial: `people`, `permission_prefix`, funções de plataforma |
| **Fase 3.5** ✅ | Domínio `platform/` extraído; APIs `/api/platform/*`; Admin consumidor |
| **Fase 4** | Login único + `platform_sessions` + enforcement de `permissions` |
| **Fase 5** | Migração Identity (`people` substitui cadastros legados, faseada) |
| **Fase 6** | Launcher dinâmico lendo `applications` + `getAccessibleApplications` |
| **Fase 7** | Portal do Colaborador |
| **Fase 8** | CRM |
| **Fase 9** | Financeiro |
| **Fase 10** | Inventário / Estoque |
| **Fase 11** | Compras |
| **Fase 12** | RH |
| **Fase 13** | Documentos |
| **Fase 14** | Treinamentos |
| **Fase 15** | IA (camada transversal, sem violar domínios) |

Cada fase **adiciona**; não reescreve o passado sem decisão registrada.

---

# 15. Versionamento desta Bíblia

| Versão | Data | Autor | Alteração |
|--------|------|-------|-----------|
| **1.3.1** | 2026-07-09 | MÖBI OS | Publicação de API_PLATFORM.md — contrato oficial Platform ↔ Aplicativos. |
| **1.3.0** | 2026-07-09 | MÖBI OS | Fase 3.5: domínio platform/, APIs /api/platform/*, Admin consumidor. |
| **1.2.0** | 2026-07-09 | MÖBI OS | Fase 3 Identidade: people oficial, permission_prefix, funções de plataforma, capítulo 9. |
| **1.0.0** | 2026-07-09 | MÖBI OS | Publicação inicial |

## 14.1 Como atualizar

Qualquer mudança arquitetural permanente **deve**:

1. Incrementar versão (semver: `MAJOR` = quebra de princípio; `MINOR` = novo domínio/regra; `PATCH` = clarificação).
2. Adicionar linha no **Histórico de alterações**.
3. Registrar data e responsável.
4. Comunicar à equipe e às IAs (referência em prompts e regras do projeto).

---

# 16. Mensagem Final

A **Bíblia do MÖBI OS** é a **única fonte oficial** das decisões arquitetônicas da plataforma.

O README explica **como rodar**. O código mostra **o que existe hoje**. Esta Bíblia define **como deve ser e como deve evoluir**.

**Nenhuma implementação pode contrariar este documento sem uma decisão explícita** registrada em seu histórico.

O MÖBI OS foi concebido para durar. Aplicaativos vêm e vão; domínios se especializam; a Plataforma permanece. Construa como quem está edificando um sistema operacional empresarial — **com disciplina, com fronteiras e com respeito às regras que mantêm a suíte inteira de pé.**

---

*Documento vivo. Última revisão: versão 1.3.1 — 9 de julho de 2026.*

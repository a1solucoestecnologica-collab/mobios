# Plano de Migração de Identidade — MÖBI OS

Documento oficial do caminho de migração das tabelas legadas para o modelo **`people`**.

**Autoridade arquitetural:** [`BIBLIA_MOBI_OS.md`](./BIBLIA_MOBI_OS.md)

---

## Modelo oficial (destino)

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

**Regra permanente (Fase 3):** `people` é a **única** entidade oficial de Pessoa. Nenhum novo módulo cria tabela de usuários.

---

## Tabelas legadas

| Tabela | Domínio atual | Destino |
|--------|---------------|---------|
| `platform_users` | MÖBI Tools, MÖBI WorkMaps | `people` + `person_roles` |
| `admin_users` | MÖBI Admin (CRUD temporário) | `people` |
| `ponto_users` | MÖBI Time (login) | `people` |
| `ponto_employees` | MÖBI Time (dados RH) | `people` (+ atributos de domínio em tabelas `time_*` se necessário) |
| `sessions` | Tools (`moble_session`) | `platform_sessions` |
| `admin_sessions` | Admin legado | `platform_sessions` |
| `ponto_sessions` | Time | `platform_sessions` |

**Nenhuma tabela legada será apagada antes da Fase 4.**

---

## Fases

### Fase 1 — Coexistência ✅

- `people` oficialmente definida como entidade única.
- Tabelas legadas **continuam em uso** pelos módulos existentes.

**Critério de conclusão:** estrutura DDL, seeds, funções e documentação prontos. ✅

---

### Fase 2 — Sincronização (parcial ✅)

- Vínculo `person_id` em `ponto_employees` / `ponto_users` (migração por e-mail).
- `person_access` espelha credenciais do `platform_users` principal.
- Funcionário seed `emp-platform-default` vinculado a `person-platform-default`.

**Critério de conclusão:** toda pessoa operacional existente tem registro em `people`. *Em progresso para bases legadas heterogêneas.*

---

### Fase 4 — Hardening e produção (ATUAL)

- Credenciais padrão removidas; bootstrap seguro por variáveis de ambiente.
- `person_access` é a **fonte oficial** de credenciais da Platform.
- Vínculos operacionais por `people.id` (Time e WorkMaps).
- `planner_executions.person_id` ativo; `collaborator_id` legado preservado.
- Portal sem mocks em produção; telas sem API marcadas/ocultas.
- Verificação de segurança na inicialização (`assertProductionSecurity`).

---

### Fase 5 — Cadastro oficial unificado ✅ (em vigor)

- **Único ponto de criação de colaboradores:** Wizard `Admin → Pessoas → Novo Colaborador` (`CollaboratorWizard`).
- API oficial de pessoa: `POST /api/platform/people` (ou wrapper Admin).
- Vínculo Time: `POST /api/ponto/time-employees` com `personId` — **sem** criar `people` no Time.
- **Depreciados:** `POST /api/ponto/onboarding`, `POST /api/ponto/employees` (criação legada).
- **`ponto_users`:** não recebe novos registros; leitura legada até remoção na Fase 4 final.
- **`ponto_employees`:** tabela operacional (`person_id`, jornada, escala, status); dados mestres via join em `people`.

**Critério de conclusão:** nenhum fluxo novo cria identidade fora da Platform. ✅

---

### Fase 4 — Remoção do legado

- Período de observação com legado em somente-leitura.
- Remoção de tabelas legadas após aprovação explícita e atualização da Bíblia.
- Migração final de dados históricos para `audit_logs`.

**Critério de conclusão:** banco contém apenas modelo oficial de identidade.

---

## O que NÃO fazer nesta fase

- Não executar migração automática de dados.
- Não apagar tabelas legadas.
- Não alterar login atual do Tools / Time / Shell.
- Não forçar apps a consumir `people` antes da Fase 3.

---

## Registro de um novo aplicativo (obrigatório)

1. Inserir em `applications` com `permission_prefix` (ex.: `crm.`).
2. Registrar permissões em `permissions` (`crm.modulo.acao`).
3. **Nunca** criar tabela `*_users`.
4. Consumir `people`, `roles`, `permissions` quando entrar em produção.

---

## Referências no código

| Artefato | Local |
|----------|-------|
| Funções de identidade | `admin/server-handlers/platform/identity.js` |
| Schema e seeds | `admin/server-handlers/schema.js` |
| Comentários LEGADO | `server.js`, `ponto/server-handlers.js`, `admin/server-handlers/users.js` |

---

*Última atualização: Fase 1 concluída — 2026-07-09*

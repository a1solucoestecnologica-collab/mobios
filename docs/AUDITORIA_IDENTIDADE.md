# Auditoria de Identidade — MÖBI OS

**Data:** 9 de julho de 2026  
**Fase:** 3 — Arquitetura definitiva de identidade (fundação)  
**Autoridade:** [`BIBLIA_MOBI_OS.md`](./BIBLIA_MOBI_OS.md) v1.2.0

---

## Resumo executivo

A arquitetura de identidade do MÖBI OS está **oficialmente definida**. A entidade `people` é a única fonte futura de Pessoa. Funções de plataforma (`getCurrentPerson`, `getAccessibleApplications`) estão implementadas. Tabelas legadas permanecem por compatibilidade. **Nenhum módulo existente foi quebrado.**

---

## O que está pronto

| Item | Status | Detalhe |
|------|--------|---------|
| Tabela `people` | ✅ Oficial | DDL + seed pessoa padrão |
| `roles`, `permissions`, vínculos | ✅ Oficial | DDL + seeds |
| `applications.permission_prefix` | ✅ Oficial | Migração ALTER + seeds 9 apps |
| Permissões `app.modulo.acao` | ✅ Seed | 25+ permissões incluindo futuros (crm, finance, ai) |
| `getCurrentPerson()` | ✅ Implementado | `admin/server-handlers/platform/identity.js` |
| `getAccessibleApplications(personId)` | ✅ Implementado | Via prefixos de permissão |
| APIs `/api/admin/platform/*` | ✅ Expostas | person, accessible-apps, architecture |
| Tela Admin **Arquitetura da Plataforma** | ✅ Informativa | Visualiza componentes oficiais |
| `IDENTITY_MIGRATION_PLAN.md` | ✅ Publicado | 4 fases documentadas |
| Bíblia capítulo 9 | ✅ v1.2.0 | Modelo oficial de identidade |
| Comentários LEGADO no código | ✅ | server.js, ponto, admin/users |

---

## O que permanece legado (em uso)

| Tabela | Módulo que ainda usa | Remoção prevista |
|--------|----------------------|------------------|
| `platform_users` | MÖBI Tools, WorkMaps | Fase 4 migração |
| `sessions` (Tools) | Shell / Tools login | Fase 4 → `platform_sessions` |
| `admin_users` | Admin CRUD Usuários | Fase 4 migração |
| `admin_sessions` | Admin auth legado | Fase 4 |
| `ponto_users` | Time API auth | Fase 4 migração |
| `ponto_employees` | Time cadastro | Fase 4 migração |
| `ponto_sessions` | Time sessões | Fase 4 |

---

## O que falta migrar

| Entrega | Fase plano | Descrição |
|---------|------------|-----------|
| Sincronização legado → `people` | Fase 2 | Scripts de espelhamento |
| Apps consumindo `getCurrentPerson()` | Fase 3 migração | Tools, Time, WorkMaps, Shell |
| Enforcement de permissões nas APIs | Fase 4 | Login único |
| Launcher dinâmico | Fase 6 roadmap | `getAccessibleApplications` |
| Remoção tabelas legadas | Fase 4 plano | Após período de observação |
| `navigation_items` em uso | Futuro | Navegação dinâmica por app |
| `audit_logs` populado | Futuro | Auditoria transversal automática |

---

## Compatibilidade por módulo

| Módulo | Usa identidade oficial? | Depende de legado? | Compatível com Fase 3? |
|--------|-------------------------|--------------------|-------------------------|
| **Shell** | Parcial (`/api/admin/me` expõe `person`) | `platform_users` via chip | ✅ Funciona |
| **Launcher** | Preparado (função existe, não usada) | HTML estático | ✅ Funciona |
| **MÖBI Tools** | Não | `platform_users`, `sessions` | ✅ Funciona |
| **MÖBI WorkMaps** | Não | `platform_users` (colaboradores) | ✅ Funciona |
| **MÖBI Time** | Não | `ponto_users`, `ponto_employees` | ✅ Funciona |
| **MÖBI Admin** | **Sim** (governança + funções) | `admin_users` CRUD temporário | ✅ Funciona |

---

## Novos desenvolvimentos (regra a partir de Fase 3)

- ✅ **Permitido:** registrar app em `applications`, permissões em `permissions`, consumir `people`
- ❌ **Proibido:** criar tabela `*_users`, duplicar identidade, permissões por tela

---

## Referências

- [`BIBLIA_MOBI_OS.md`](./BIBLIA_MOBI_OS.md) — Capítulo 9
- [`IDENTITY_MIGRATION_PLAN.md`](./IDENTITY_MIGRATION_PLAN.md)
- Código: `admin/server-handlers/platform/identity.js`

---

*Gerado ao concluir a Fase 3 de identidade.*

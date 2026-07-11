# MÖBI Portal do Colaborador

Interface de **execução e consulta** para colaboradores. Não possui regras de negócio próprias.

## Princípios

- Identidade: `/api/platform/*` (People, Roles, Permissions, Applications)
- Ponto: `/api/ponto/*` (MÖBI Time)
- Tarefas: `/api/planner/*` (MÖBI WorkMaps)
- Sem login próprio, sem tabelas `portal_users`

## Desenvolvimento

```bash
cd portal
npm install
npm run build
```

## Integração Shell

- `window.MooblePortal.mount(#portalRoot)`
- Launcher: `data-launch="portal"` (uso interno / administradores)

## Rota do colaborador (produção)

**URL exclusiva:** `/portal`

- Login próprio, sem launcher nem MÖBI Admin
- Colaboradores devem receber apenas `https://{seu-dominio}/portal`
- Requer permissão `portal.access`

## Sessão e login (Fase 4)

- **Credenciais oficiais:** `person_access` (não usar senhas padrão em produção)
- Bootstrap: `MOBI_BOOTSTRAP_ADMIN_EMAIL` + `MOBI_BOOTSTRAP_ADMIN_PASSWORD`
- Login: `POST /api/platform/login` ou `POST /api/login` (Shell)
- Cookie: `platform_session` (HttpOnly, Secure em produção)
- Identidade: `GET /api/platform/identity`
- Demo: `VITE_PORTAL_DEMO_MODE=false` (padrão); nunca `true` em produção

## APIs consumidas

| Domínio | Endpoints |
|---------|-----------|
| Platform | `/api/platform/identity`, `/api/platform/authorization/*` |
| MÖBI Time | `/api/ponto/punch/status`, `/api/ponto/punch`, `/api/ponto/hour-bank`, `/api/ponto/timesheet`, `/api/ponto/profile` |
| WorkMaps | `/api/planner/portal/summary` |

## Permissões

- `portal.access` — acesso ao Portal
- Demais telas usam permissões dos apps (`time.*`, `planner.*`)

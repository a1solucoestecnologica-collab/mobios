# Auditoria — Portal em Produção (Fase 4)

Data: 2026-07-10

## Identidade oficial

| Domínio | Vínculo oficial | Legado (somente leitura/admin) |
|---------|-----------------|--------------------------------|
| Platform | `person_access` → `people.id` | `platform_users` (Tools) |
| MÖBI Time | `ponto_employees.person_id` | `ponto_users` |
| WorkMaps | `planner_executions.person_id` | `planner_executions.collaborator_id` |

E-mail **não** é usado em operações normais do Portal — apenas em migração/backfill.

## Credenciais

- **Fonte oficial:** `person_access` (hash scrypt)
- **Removido:** seed `admin@moble.tools` / `admin123`
- **Produção:** exige `MOBI_BOOTSTRAP_ADMIN_EMAIL` + `MOBI_BOOTSTRAP_ADMIN_PASSWORD` (mín. 10 chars, sem senhas conhecidas)
- **Migração:** `MOBI_ALLOW_INSECURE_BOOT=1` temporário se ainda existirem hashes fracos — alterar senhas imediatamente após

## Sessões

| Cookie | Status |
|--------|--------|
| `platform_session` | Oficial (HttpOnly, Secure em produção) |
| `moble_session` | Legado Tools — compatibilidade |
| `ponto_session` | Legado Time admin — compatibilidade |

## Modo demonstração

- `VITE_PORTAL_DEMO_MODE=false` por padrão
- Build de produção nunca ativa mocks silenciosamente
- Banner visível quando demo ativo em desenvolvimento

## Telas indisponíveis (produção)

- Avisos, Solicitações, Documentos — ocultas até API oficial

## Deploy

```bash
NODE_ENV=production
PORTAL_DEMO_MODE=false
MOBI_BOOTSTRAP_ADMIN_EMAIL=...
MOBI_BOOTSTRAP_ADMIN_PASSWORD=...
```

### Rollback

1. Restaurar backup de `data/moble-tools.sqlite`
2. Reverter pacote deploy anterior
3. Reiniciar serviço (PM2/systemd)

### Health

- `GET /api/portal/health`
- `GET /api/platform/identity` (autenticado)

## Diagnóstico de vínculos

`GET /api/platform/diagnostics/identity-links` (requer `admin.settings` ou `admin.users`)

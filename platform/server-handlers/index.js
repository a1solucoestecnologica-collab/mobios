// MÖBI OS — Plataforma (domínio do Sistema Operacional).
// APIs oficiais: /api/platform/*
// Arquitetura: /docs/BIBLIA_MOBI_OS.md
import { initPlatformDatabase } from "./schema.js";
import { createPlatformRouter } from "./router.js";
import { createAuthorize } from "./services/auth/context.js";

export { initPlatformDatabase };

export function createPlatformHandlers(deps) {
  const authorize = deps.authorize || createAuthorize(deps.db, deps.HttpError);
  const handlePlatformApi = createPlatformRouter({ ...deps, authorize });
  return { handlePlatformApi, authorize };
}

// MÖBI Admin — handlers e API /api/admin/* (consumidor da Plataforma).
// Serviços compartilhados: platform/server-handlers/
// Arquitetura oficial: /docs/BIBLIA_MOBI_OS.md
import { initAdminDatabase } from "./schema.js";
import { createAdminRouter } from "./router.js";

export { initAdminDatabase };

export function createAdminHandlers(deps) {
  const handleAdminApi = createAdminRouter(deps);
  return { handleAdminApi };
}

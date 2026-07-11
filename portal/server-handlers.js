// MÖBI Portal — handlers mínimos (sem regra de negócio, sem acesso a banco).
// Identidade e autorização: /api/platform/*
// Regras de negócio: APIs dos aplicativos (Time, WorkMaps, etc.)

export function initPortalDatabase() {
  // v1: nenhuma tabela portal_* — Portal apenas consome APIs oficiais.
}

export function createPortalHandlers({ sendJson }) {
  return async function handlePortalApi(req, res, url) {
    if (url.pathname === "/api/portal/health" && req.method === "GET") {
      sendJson(res, 200, {
        ok: true,
        app: "portal",
        message: "Portal do Colaborador — consumidor de APIs oficiais.",
      });
      return true;
    }
    return false;
  };
}

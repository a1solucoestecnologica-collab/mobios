/**
 * Modo demonstração — desativado por padrão.
 * Só ativa com VITE_PORTAL_DEMO_MODE=true em build de desenvolvimento.
 */
export const PORTAL_DEMO_MODE =
  typeof import.meta !== "undefined" &&
  import.meta.env?.MODE !== "production" &&
  String(import.meta.env?.VITE_PORTAL_DEMO_MODE || "false") === "true";

/** Rotas do Portal — visibilidade controlada por permissões da Platform. */
export const PORTAL_ROUTES = [
  {
    id: "home",
    label: "Início",
    shortLabel: "Início",
    icon: "🏠",
    permission: "portal.access",
    primary: true,
  },
  {
    id: "punch",
    label: "Registrar Ponto",
    shortLabel: "Ponto",
    icon: "⏰",
    permission: "time.clock",
    app: "time",
    primary: true,
  },
  {
    id: "timesheet",
    label: "Meu Espelho de Ponto",
    shortLabel: "Espelho",
    icon: "📅",
    permission: "time.report",
    app: "time",
  },
  {
    id: "hour-bank",
    label: "Banco de Horas",
    shortLabel: "Banco",
    icon: "🕒",
    permission: "time.report",
    app: "time",
  },
  {
    id: "schedule",
    label: "Minha Escala",
    shortLabel: "Escala",
    icon: "📆",
    permission: "time.report",
    app: "time",
  },
  {
    id: "tasks",
    label: "Minhas Tarefas",
    shortLabel: "Tarefas",
    icon: "📋",
    permission: "planner.execute",
    app: "planner",
    primary: true,
  },
  {
    id: "checklists",
    label: "Meus Checklists",
    shortLabel: "Checklists",
    icon: "✅",
    permission: "planner.execute",
    app: "planner",
  },
  {
    id: "documents",
    label: "Meus Documentos",
    shortLabel: "Documentos",
    icon: "📄",
    permission: "portal.access",
    app: "time",
  },
  {
    id: "requests",
    label: "Minhas Solicitações",
    shortLabel: "Ajustes",
    icon: "📝",
    permission: "time.adjust",
    app: "time",
  },
  {
    id: "notices",
    label: "Avisos",
    shortLabel: "Avisos",
    icon: "🔔",
    permission: "portal.access",
    primary: true,
  },
  {
    id: "profile",
    label: "Meu Perfil",
    shortLabel: "Perfil",
    icon: "👤",
    permission: "portal.access",
  },
];

export const DEFAULT_VIEW = "home";

/** Ordem fixa da barra inferior no mobile (máx. 3 + “Mais”). */
export const MOBILE_BOTTOM_NAV_ORDER = ["home", "punch", "tasks"];

export function filterRoutesByPermissions(routes, permissionCodes, { demoMode = false } = {}) {
  const codes = new Set(permissionCodes || []);
  return routes.filter((route) => {
    if (!codes.has(route.permission)) return false;
    if (route.unavailable && !demoMode) return false;
    return true;
  });
}

export function getUnavailableRoutes(routes, permissionCodes) {
  const codes = new Set(permissionCodes || []);
  return routes.filter((route) => codes.has(route.permission) && route.unavailable);
}

// Reexporta serviços oficiais da Plataforma (compatibilidade interna do Admin).
export {
  mapPerson,
  getCurrentPerson,
  getPlatformArchitectureSummary,
} from "../../../platform/server-handlers/services/identity/index.js";

export {
  getPersonPermissionCodes,
  getAccessibleApplications,
  getPersonPermissions,
} from "../../../platform/server-handlers/services/authorization/index.js";

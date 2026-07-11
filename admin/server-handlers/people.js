export { listPeople } from "../../platform/server-handlers/services/people/index.js";
import { listPeople } from "../../platform/server-handlers/services/people/index.js";

export function handlePeopleRoute(ctx, req, res, pathname, method, sendJson) {
  if (pathname === "/api/admin/people" && method === "GET") {
    ctx.requireAdmin(req);
    sendJson(res, 200, { people: listPeople(ctx.db) });
    return true;
  }
  return false;
}

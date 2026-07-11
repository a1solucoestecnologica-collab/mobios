import {
  listPeople,
  getPersonProfile,
  createPersonProfile,
  updatePersonProfile,
  deletePersonProfile,
  addPersonAttachment,
  removePersonAttachment,
} from "../../platform/server-handlers/services/people/index.js";

export async function handlePlatformPeopleRoute(ctx, req, res, pathname, method, sendJson, readJson) {
  if (pathname === "/api/admin/platform/people") {
    ctx.requireAdmin(req);
    if (method === "GET") {
      sendJson(res, 200, { people: listPeople(ctx.db) });
      return true;
    }
    if (method === "POST") {
      try {
        const body = await readJson(req);
        const person = createPersonProfile(ctx.db, body);
        sendJson(res, 201, { person });
      } catch (error) {
        throw new ctx.HttpError(error.status || 500, error.message);
      }
      return true;
    }
  }

  const attachDelMatch = pathname.match(/^\/api\/admin\/platform\/people\/([^/]+)\/attachments\/([^/]+)$/);
  if (attachDelMatch && method === "DELETE") {
    ctx.requireAdmin(req);
    const ok = removePersonAttachment(ctx.db, attachDelMatch[1], attachDelMatch[2]);
    if (!ok) throw new ctx.HttpError(404, "Anexo não encontrado.");
    sendJson(res, 200, { ok: true });
    return true;
  }

  const attachPostMatch = pathname.match(/^\/api\/admin\/platform\/people\/([^/]+)\/attachments$/);
  if (attachPostMatch && method === "POST") {
    ctx.requireAdmin(req);
    try {
      const body = await readJson(req);
      const attachment = addPersonAttachment(ctx.db, attachPostMatch[1], body);
      sendJson(res, 201, { attachment });
    } catch (error) {
      throw new ctx.HttpError(error.status || 500, error.message);
    }
    return true;
  }

  const personMatch = pathname.match(/^\/api\/admin\/platform\/people\/([^/]+)$/);
  if (personMatch) {
    ctx.requireAdmin(req);
    const personId = personMatch[1];
    if (method === "GET") {
      const person = getPersonProfile(ctx.db, personId);
      if (!person) throw new ctx.HttpError(404, "Pessoa não encontrada.");
      sendJson(res, 200, { person });
      return true;
    }
    if (method === "PUT") {
      try {
        const body = await readJson(req);
        const person = updatePersonProfile(ctx.db, personId, body);
        sendJson(res, 200, { person });
      } catch (error) {
        throw new ctx.HttpError(error.status || 500, error.message);
      }
      return true;
    }
    if (method === "DELETE") {
      try {
        if (!deletePersonProfile(ctx.db, personId)) throw new ctx.HttpError(404, "Pessoa não encontrada.");
        sendJson(res, 200, { ok: true });
      } catch (error) {
        if (error.status) throw error;
        throw new ctx.HttpError(400, error.message);
      }
      return true;
    }
  }

  return false;
}

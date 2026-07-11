import { isProduction } from "../bootstrap/index.js";

export function assertSafeMutation(req, HttpError) {
  if (!isProduction()) return;

  const method = String(req.method || "GET").toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") return;

  const origin = req.headers?.origin;
  const referer = req.headers?.referer;
  const host = req.headers?.host;

  if (!host) return;

  const allowedHost = host.split(":")[0];
  const sources = [origin, referer].filter(Boolean);

  if (sources.length === 0) return;

  const allowed = sources.every((source) => {
    try {
      const url = new URL(source);
      return url.hostname === allowedHost || url.host === host;
    } catch {
      return false;
    }
  });

  if (!allowed) {
    throw new HttpError(403, "Origem da requisição não permitida.");
  }
}

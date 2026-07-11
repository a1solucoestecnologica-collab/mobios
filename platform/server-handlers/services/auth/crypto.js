import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

export const PLATFORM_SESSION_COOKIE = "platform_session";
export const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 14;

export function parseCookies(cookieHeader = "") {
  return Object.fromEntries(
    cookieHeader
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const index = part.indexOf("=");
        if (index === -1) return [part, ""];
        return [part.slice(0, index), decodeURIComponent(part.slice(index + 1))];
      }),
  );
}

export function hashPassword(password) {
  const value = String(password || "");
  if (value.length < 6) {
    const error = new Error("A senha deve ter pelo menos 6 caracteres.");
    error.status = 400;
    throw error;
  }
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(value, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password, storedHash) {
  if (!storedHash) return false;
  const [salt, hash] = String(storedHash).split(":");
  if (!salt || !hash) return false;
  const attempt = scryptSync(String(password || ""), salt, 64).toString("hex");
  try {
    return timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(attempt, "hex"));
  } catch {
    return false;
  }
}

export function getPlatformSessionId(req) {
  const cookies = parseCookies(req?.headers?.cookie || "");
  return cookies[PLATFORM_SESSION_COOKIE] || "";
}

/** Cookies Secure só em HTTPS (ou MOBI_COOKIE_SECURE=1). HTTP na VM não grava sessão com Secure. */
export function shouldUseSecureCookies(req) {
  const forced = String(process.env.MOBI_COOKIE_SECURE || "").trim().toLowerCase();
  if (forced === "1" || forced === "true" || forced === "yes") return true;
  if (forced === "0" || forced === "false" || forced === "no") return false;
  const forwarded = String(req?.headers?.["x-forwarded-proto"] || "")
    .split(",")[0]
    .trim()
    .toLowerCase();
  if (forwarded) return forwarded === "https";
  return false;
}

export function setPlatformSessionCookie(res, sessionId, { secure = false } = {}) {
  const parts = [
    `${PLATFORM_SESSION_COOKIE}=${sessionId}`,
    "HttpOnly",
    "SameSite=Lax",
    "Path=/",
    `Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}`,
  ];
  if (secure) parts.push("Secure");
  res.setHeader("Set-Cookie", parts.join("; "));
}

export function clearPlatformSessionCookie(res, { secure = false } = {}) {
  const parts = [`${PLATFORM_SESSION_COOKIE}=`, "HttpOnly", "SameSite=Lax", "Path=/", "Max-Age=0"];
  if (secure) parts.push("Secure");
  res.setHeader("Set-Cookie", parts.join("; "));
}

export function createId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

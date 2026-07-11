import { verifyPassword } from "../auth/crypto.js";

export function isProduction() {
  return process.env.NODE_ENV === "production";
}

export function isDevSeedAllowed() {
  return !isProduction() && process.env.MOBI_ALLOW_DEV_SEED !== "false";
}

const KNOWN_WEAK_PASSWORDS = ["admin123", "123456", "password", "senha123"];

const KNOWN_INSECURE_EMAILS = new Set(["admin@moble.tools", "admin@a1ponto.com"]);

export function getBootstrapCredentials() {
  const email = String(process.env.MOBI_BOOTSTRAP_ADMIN_EMAIL || "").trim().toLowerCase();
  const password = String(process.env.MOBI_BOOTSTRAP_ADMIN_PASSWORD || "");
  return { email, password };
}

export function hasWeakPassword(password) {
  const value = String(password || "");
  if (value.length < 10) return true;
  return KNOWN_WEAK_PASSWORDS.includes(value);
}

function rowUsesWeakPassword(password, hash) {
  if (!hash) return false;
  return KNOWN_WEAK_PASSWORDS.some((candidate) => verifyPassword(candidate, hash));
}

export function assertProductionSecurity(db) {
  if (!isProduction()) return;
  if (process.env.MOBI_ALLOW_INSECURE_BOOT === "1") {
    console.warn("[MÖBI OS] AVISO: MOBI_ALLOW_INSECURE_BOOT=1 — verificação de credenciais inseguras desativada.");
    return;
  }

  const issues = [];

  try {
    const platformUsers = db.prepare("SELECT email, password_hash FROM platform_users WHERE password_hash IS NOT NULL").all();
    for (const user of platformUsers) {
      if (KNOWN_INSECURE_EMAILS.has(String(user.email || "").toLowerCase()) && rowUsesWeakPassword(null, user.password_hash)) {
        issues.push(`platform_users:${user.email}`);
      }
    }
  } catch {
    // tabela legada pode não existir em ambientes mínimos
  }

  try {
    const accessRows = db.prepare("SELECT username, password_hash FROM person_access WHERE password_hash IS NOT NULL").all();
    for (const row of accessRows) {
      if (rowUsesWeakPassword(null, row.password_hash)) {
        issues.push(`person_access:${row.username || "?"}`);
      }
    }
  } catch {
    // person_access indisponível
  }

  if (issues.length > 0) {
    throw new Error(
      `Produção bloqueada: credenciais inseguras conhecidas detectadas (${issues.join(", ")}). ` +
        "Altere as senhas ou defina MOBI_ALLOW_INSECURE_BOOT=1 temporariamente para migração.",
    );
  }

  if (process.env.PORTAL_DEMO_MODE === "true") {
    throw new Error("Produção bloqueada: PORTAL_DEMO_MODE=true não é permitido.");
  }
}

export function bootstrapPlatformAdmin(db, hashPasswordFn) {
  const { email, password } = getBootstrapCredentials();
  if (!email || !password) {
    if (isProduction()) {
      console.warn(
        "[MÖBI OS] Nenhum administrador Tools encontrado. Defina MOBI_BOOTSTRAP_ADMIN_EMAIL e MOBI_BOOTSTRAP_ADMIN_PASSWORD para o primeiro acesso.",
      );
    }
    return null;
  }
  if (hasWeakPassword(password)) {
    throw new Error("MOBI_BOOTSTRAP_ADMIN_PASSWORD não atende requisitos mínimos de segurança (mín. 10 caracteres, sem senhas conhecidas).");
  }

  const now = new Date().toISOString();
  const hash = hashPasswordFn(password);
  const existing = db.prepare("SELECT id FROM platform_users WHERE lower(email) = ?").get(email);
  if (existing) return existing.id;

  const userId = "usr-bootstrap";
  db.prepare(
    `INSERT INTO platform_users (
      id, name, email, phone, role, manager_id, access_status, permissions, password_hash, notes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(userId, "Administrador", email, "", "owner", null, "enabled", JSON.stringify(["tools", "users", "reports"]), hash, "Bootstrap seguro.", now, now);

  return userId;
}

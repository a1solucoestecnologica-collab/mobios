#!/usr/bin/env node
/**
 * Aplica credenciais do administrador no banco apos instalacao na VM.
 * Uso: node apply-admin-credentials.mjs --db PATH --email X --password Y
 */
import { DatabaseSync } from "node:sqlite";
import { hashPassword, verifyPassword } from "../../platform/server-handlers/services/auth/crypto.js";

const KNOWN_WEAK = ["admin123", "123456", "password", "senha123"];

function parseArgs(argv) {
  const out = { db: "", email: "", password: "" };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--db") out.db = argv[++i] || "";
    else if (arg === "--email") out.email = String(argv[++i] || "").trim().toLowerCase();
    else if (arg === "--password") out.password = String(argv[++i] || "");
  }
  return out;
}

function isWeakHash(hash) {
  if (!hash) return false;
  return KNOWN_WEAK.some((candidate) => verifyPassword(candidate, hash));
}

const { db: dbPath, email, password } = parseArgs(process.argv);
if (!dbPath || !email || !password) {
  console.error("Uso: node apply-admin-credentials.mjs --db PATH --email EMAIL --password SENHA");
  process.exit(1);
}

if (password.length < 10) {
  console.error("ERRO: senha deve ter pelo menos 10 caracteres.");
  process.exit(1);
}

const db = new DatabaseSync(dbPath);
db.exec("PRAGMA foreign_keys = ON;");

const now = new Date().toISOString();
const personId = "person-platform-default";
const hash = hashPassword(password);

const person = db.prepare("SELECT id FROM people WHERE id = ?").get(personId);
if (person) {
  db.prepare("UPDATE people SET email = ?, updated_at = ? WHERE id = ?").run(email, now, personId);
} else {
  db.prepare(
    `INSERT INTO people (id, uuid, name, email, status, created_at, updated_at)
     VALUES (?, lower(hex(randomblob(16))), 'Administrador', ?, 'ACTIVE', ?, ?)`,
  ).run(personId, email, now, now);
}

const access = db.prepare("SELECT person_id FROM person_access WHERE person_id = ?").get(personId);
if (access) {
  db.prepare(
    "UPDATE person_access SET username = ?, password_hash = ?, access_status = 'ACTIVE', updated_at = ? WHERE person_id = ?",
  ).run(email, hash, now, personId);
} else {
  db.prepare(
    `INSERT INTO person_access (person_id, username, password_hash, access_status, mfa_enabled, updated_at)
     VALUES (?, ?, ?, 'ACTIVE', 0, ?)`,
  ).run(personId, email, hash, now);
}

const weakRows = db.prepare("SELECT person_id, username, password_hash FROM person_access").all();
for (const row of weakRows) {
  if (row.person_id === personId) continue;
  if (isWeakHash(row.password_hash)) {
    db.prepare("DELETE FROM person_access WHERE person_id = ?").run(row.person_id);
    console.log(`Removido acesso inseguro: ${row.username || row.person_id}`);
  }
}

db.close();
console.log(`Administrador configurado: ${email}`);

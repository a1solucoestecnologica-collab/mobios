#!/usr/bin/env node
/**
 * Garante usuario master com acesso total (admin@admin.com / admin por padrao).
 * Uso: node scripts/ensure-master-admin.mjs --db PATH [--email X] [--password Y]
 */
import { DatabaseSync } from "node:sqlite";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { ensureMasterAdmin } from "../platform/server-handlers/services/bootstrap/master-admin.js";

const rootDir = join(dirname(fileURLToPath(import.meta.url)), "..");

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

const { db: dbPath, email, password } = parseArgs(process.argv);
const resolvedDb = dbPath || join(rootDir, "data", "moble-tools.sqlite");

if (!resolvedDb) {
  console.error("Uso: node scripts/ensure-master-admin.mjs --db PATH [--email EMAIL] [--password SENHA]");
  process.exit(1);
}

const db = new DatabaseSync(resolvedDb);
db.exec("PRAGMA foreign_keys = ON;");

const result = ensureMasterAdmin(db, {
  email: email || undefined,
  password: password || undefined,
});

db.close();
console.log(`Master admin configurado: ${result.email} (person_id=${result.personId})`);
console.log(`Banco: ${resolvedDb}`);

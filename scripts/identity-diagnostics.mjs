/**
 * Diagnóstico de registros legados — cadastro de colaboradores.
 * Executar: node scripts/identity-diagnostics.mjs
 */
import { DatabaseSync } from "node:sqlite";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = fileURLToPath(new URL("..", import.meta.url));
const dbPath = join(rootDir, "data", "moble-tools.sqlite");

let db;
try {
  db = new DatabaseSync(dbPath);
} catch (e) {
  console.error("Banco não encontrado:", dbPath);
  process.exit(1);
}

const report = {
  database: dbPath,
  generatedAt: new Date().toISOString(),
  pontoEmployeesWithoutPersonId: [],
  pontoUsers: [],
  duplicateCpfs: [],
  duplicateEmails: [],
  duplicateTimeLinks: [],
  credentialOverlap: [],
};

report.pontoEmployeesWithoutPersonId = db
  .prepare(
    `SELECT id, name, status FROM ponto_employees
     WHERE person_id IS NULL OR person_id = ''`,
  )
  .all();

report.pontoUsers = db
  .prepare(`SELECT id, email, employee_id, active FROM ponto_users ORDER BY email`)
  .all();

report.duplicateCpfs = db
  .prepare(
    `SELECT cpf, COUNT(*) AS total FROM people
     WHERE cpf IS NOT NULL AND cpf != '' GROUP BY cpf HAVING COUNT(*) > 1`,
  )
  .all();

report.duplicateEmails = db
  .prepare(
    `SELECT lower(email) AS email, COUNT(*) AS total FROM people
     WHERE email IS NOT NULL AND email != '' GROUP BY lower(email) HAVING COUNT(*) > 1`,
  )
  .all();

report.duplicateTimeLinks = db
  .prepare(
    `SELECT person_id, COUNT(*) AS total FROM ponto_employees
     WHERE person_id IS NOT NULL AND person_id != ''
     GROUP BY person_id HAVING COUNT(*) > 1`,
  )
  .all();

report.credentialOverlap = db
  .prepare(
    `SELECT pu.email AS ponto_email, pa.username AS platform_username, pu.employee_id, pa.person_id
     FROM ponto_users pu
     LEFT JOIN person_access pa ON lower(pa.username) = lower(pu.email)
     WHERE pu.active = 1`,
  )
  .all();

console.log(JSON.stringify(report, null, 2));

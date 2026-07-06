import { existsSync, readFileSync, unlinkSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";

const rootDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = join(rootDir, "data");
const dbPath = join(dataDir, "moble-tools.sqlite");
const walPath = `${dbPath}-wal`;
const shmPath = `${dbPath}-shm`;

function isLfsPointer(filePath) {
  if (!existsSync(filePath)) return false;
  const head = readFileSync(filePath, "utf8", { start: 0, end: 64 });
  return head.startsWith("version https://git-lfs.github.com/spec/v1");
}

function removeSidecars() {
  for (const filePath of [walPath, shmPath]) {
    if (!existsSync(filePath)) continue;
    try {
      unlinkSync(filePath);
    } catch (error) {
      if (error.code === "EBUSY" || error.code === "EPERM") {
        console.warn(`AVISO: nao foi possivel remover ${filePath}. Pare o servidor antes de empacotar.`);
      } else {
        throw error;
      }
    }
  }
}

if (!existsSync(dbPath)) {
  console.error("ERRO: Banco nao encontrado em data/moble-tools.sqlite");
  console.error("Coloque o arquivo SQLite real antes de empacotar.");
  process.exit(1);
}

if (isLfsPointer(dbPath)) {
  console.error("ERRO: data/moble-tools.sqlite e um ponteiro Git LFS, nao o banco real.");
  console.error("Baixe o arquivo com: git lfs pull");
  console.error("Ou copie manualmente o .sqlite de producao para data/.");
  process.exit(1);
}

const db = new DatabaseSync(dbPath);
db.exec("PRAGMA wal_checkpoint(TRUNCATE);");
db.close();

removeSidecars();

const verifyDb = new DatabaseSync(dbPath);
const stats = {
  tools: verifyDb.prepare("SELECT COUNT(*) AS total FROM tools").get().total,
  categories: verifyDb.prepare("SELECT COUNT(*) AS total FROM categories").get().total,
  jobs: verifyDb.prepare("SELECT COUNT(*) AS total FROM jobs").get().total,
  users: verifyDb.prepare("SELECT COUNT(*) AS total FROM platform_users").get().total,
  workBoxes: verifyDb.prepare("SELECT COUNT(*) AS total FROM work_boxes").get().total,
};
verifyDb.close();

console.log("Banco preparado para deploy:");
console.log(`  Arquivo: ${dbPath}`);
console.log(`  Ferramentas: ${stats.tools}`);
console.log(`  Categorias: ${stats.categories}`);
console.log(`  Listas (jobs): ${stats.jobs}`);
console.log(`  Usuarios: ${stats.users}`);
console.log(`  Caixas de obra: ${stats.workBoxes}`);

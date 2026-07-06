import { createServer } from "node:http";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { readFile } from "node:fs/promises";
import { existsSync, mkdirSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";
import QRCode from "qrcode";

const rootDir = fileURLToPath(new URL(".", import.meta.url));
const dataDir = join(rootDir, "data");
const dbPath = join(dataDir, "moble-tools.sqlite");
const port = Number(process.env.PORT || 4173);
const host = process.env.HOST || "0.0.0.0";

if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });

const db = new DatabaseSync(dbPath);
db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS subcategories (
    id TEXT PRIMARY KEY,
    category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL,
    UNIQUE(category_id, name)
  );

  CREATE TABLE IF NOT EXISTS tools (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    internal_code TEXT NOT NULL UNIQUE,
    category_id TEXT NOT NULL REFERENCES categories(id),
    subcategory TEXT,
    loaned_to TEXT,
    current_job_id TEXT,
    current_job_label TEXT,
    owner TEXT NOT NULL DEFAULT 'MÃ¶ble',
    control_model TEXT NOT NULL CHECK(control_model IN ('individual', 'quantity')),
    quantity INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL CHECK(status IN ('active', 'maintenance', 'inactive', 'broken', 'in_work', 'loaned', 'lost')),
    qr_ready INTEGER NOT NULL DEFAULT 1,
    notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS history (
    id TEXT PRIMARY KEY,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    action TEXT NOT NULL,
    description TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS jobs (
    id TEXT PRIMARY KEY,
    client_name TEXT NOT NULL,
    work_name TEXT NOT NULL,
    scheduled_date TEXT,
    responsible TEXT,
    status TEXT NOT NULL CHECK(status IN ('draft', 'preparing', 'ready', 'blocked')),
    notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS required_items (
    id TEXT PRIMARY KEY,
    job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    tool_id TEXT NOT NULL REFERENCES tools(id),
    quantity INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL CHECK(status IN ('pending', 'separated', 'missing')),
    notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE(job_id, tool_id)
  );

  CREATE TABLE IF NOT EXISTS job_work_boxes (
    id TEXT PRIMARY KEY,
    job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    box_id TEXT NOT NULL REFERENCES work_boxes(id),
    created_at TEXT NOT NULL,
    UNIQUE(job_id, box_id)
  );

  CREATE TABLE IF NOT EXISTS job_work_box_items (
    id TEXT PRIMARY KEY,
    job_box_id TEXT NOT NULL REFERENCES job_work_boxes(id) ON DELETE CASCADE,
    box_item_id TEXT NOT NULL REFERENCES work_box_items(id),
    tool_id TEXT NOT NULL REFERENCES tools(id),
    quantity INTEGER NOT NULL DEFAULT 1,
    required INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL CHECK(status IN ('pending', 'ok', 'missing', 'substituted')),
    notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE(job_box_id, box_item_id)
  );

  CREATE TABLE IF NOT EXISTS job_departures (
    id TEXT PRIMARY KEY,
    job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    responsible TEXT,
    notes TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS job_departure_items (
    id TEXT PRIMARY KEY,
    departure_id TEXT NOT NULL REFERENCES job_departures(id) ON DELETE CASCADE,
    source_type TEXT NOT NULL CHECK(source_type IN ('tool', 'box_item')),
    source_id TEXT NOT NULL,
    tool_id TEXT NOT NULL REFERENCES tools(id),
    quantity INTEGER NOT NULL DEFAULT 1,
    status_at_departure TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS job_departure_boxes (
    id TEXT PRIMARY KEY,
    departure_id TEXT NOT NULL REFERENCES job_departures(id) ON DELETE CASCADE,
    job_box_id TEXT NOT NULL REFERENCES job_work_boxes(id) ON DELETE CASCADE,
    box_id TEXT NOT NULL REFERENCES work_boxes(id),
    status_at_departure TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS platform_users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    role TEXT NOT NULL CHECK(role IN ('owner', 'manager', 'supervisor', 'operator', 'viewer')),
    manager_id TEXT REFERENCES platform_users(id) ON DELETE SET NULL,
    access_status TEXT NOT NULL CHECK(access_status IN ('enabled', 'disabled')),
    permissions TEXT NOT NULL,
    notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES platform_users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS work_boxes (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    responsible TEXT,
    status TEXT NOT NULL CHECK(status IN ('active', 'inactive')),
    notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS work_box_items (
    id TEXT PRIMARY KEY,
    box_id TEXT NOT NULL REFERENCES work_boxes(id) ON DELETE CASCADE,
    tool_id TEXT NOT NULL REFERENCES tools(id),
    quantity INTEGER NOT NULL DEFAULT 1,
    required INTEGER NOT NULL DEFAULT 1,
    notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE(box_id, tool_id)
  );

  CREATE TABLE IF NOT EXISTS work_box_checks (
    id TEXT PRIMARY KEY,
    box_id TEXT NOT NULL REFERENCES work_boxes(id) ON DELETE CASCADE,
    checked_by TEXT,
    status TEXT NOT NULL CHECK(status IN ('complete', 'pending')),
    notes TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS work_box_check_items (
    id TEXT PRIMARY KEY,
    check_id TEXT NOT NULL REFERENCES work_box_checks(id) ON DELETE CASCADE,
    box_item_id TEXT NOT NULL REFERENCES work_box_items(id),
    tool_id TEXT NOT NULL REFERENCES tools(id),
    status TEXT NOT NULL CHECK(status IN ('ok', 'missing', 'substituted')),
    notes TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS separation_templates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS separation_template_items (
    id TEXT PRIMARY KEY,
    template_id TEXT NOT NULL REFERENCES separation_templates(id) ON DELETE CASCADE,
    tool_id TEXT NOT NULL REFERENCES tools(id),
    quantity INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE(template_id, tool_id)
  );

  CREATE TABLE IF NOT EXISTS separation_template_boxes (
    id TEXT PRIMARY KEY,
    template_id TEXT NOT NULL REFERENCES separation_templates(id) ON DELETE CASCADE,
    box_id TEXT NOT NULL REFERENCES work_boxes(id),
    created_at TEXT NOT NULL,
    UNIQUE(template_id, box_id)
  );
`);

try {
  db.exec("ALTER TABLE tools ADD COLUMN photo_data TEXT");
} catch (error) {
  if (!String(error.message).includes("duplicate column name")) throw error;
}

try {
  db.exec("ALTER TABLE tools ADD COLUMN owner TEXT NOT NULL DEFAULT 'MÃ¶ble'");
} catch (error) {
  if (!String(error.message).includes("duplicate column name")) throw error;
}

db.exec("UPDATE tools SET owner = 'MÃ¶ble' WHERE owner IS NULL OR trim(owner) = ''");

try {
  db.exec("ALTER TABLE tools ADD COLUMN loaned_to TEXT");
} catch (error) {
  if (!String(error.message).includes("duplicate column name")) throw error;
}

try {
  db.exec("ALTER TABLE tools ADD COLUMN current_job_id TEXT");
} catch (error) {
  if (!String(error.message).includes("duplicate column name")) throw error;
}

try {
  db.exec("ALTER TABLE tools ADD COLUMN current_job_label TEXT");
} catch (error) {
  if (!String(error.message).includes("duplicate column name")) throw error;
}

try {
  db.exec("ALTER TABLE platform_users ADD COLUMN password_hash TEXT");
} catch (error) {
  if (!String(error.message).includes("duplicate column name")) throw error;
}

migrateToolsStatusConstraint();
seedDefaultCategories();
seedDefaultAdmin();
seedDefaultWorkBoxes();
backfillJobWorkBoxItems();

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (url.pathname.startsWith("/api/")) {
      await handleApi(req, res, url);
      return;
    }

    await serveStatic(res, url.pathname);
  } catch (error) {
    console.error(error);
    if (error instanceof HttpError) {
      sendJson(res, error.status, { error: error.message });
      return;
    }
    sendJson(res, 500, { error: "Erro interno do servidor." });
  }
});

server.listen(port, host, () => {
  console.log(`Moble Tools rodando em http://localhost:${port}`);
  console.log(`Na rede local, acesse pelo IP deste computador na porta ${port}.`);
  console.log(`Banco SQLite: ${dbPath}`);
});

async function handleApi(req, res, url) {
  if (req.method === "POST" && url.pathname === "/api/login") {
    const body = await readJson(req);
    sendJson(res, 200, loginUser(res, body));
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/logout") {
    logoutUser(req, res);
    sendJson(res, 200, { ok: true });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/me") {
    sendJson(res, 200, { authenticated: true, user: null });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/state") {
    sendJson(res, 200, getState());
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/export") {
    sendJson(res, 200, getState({ includePhotos: true }));
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/seed") {
    seedExampleTools();
    sendJson(res, 200, getState());
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/categories") {
    const body = await readJson(req);
    createCategory(body);
    sendJson(res, 201, getState());
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/tools") {
    const body = await readJson(req);
    createTool(body);
    sendJson(res, 201, getState());
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/jobs") {
    const body = await readJson(req);
    createJob(body);
    sendJson(res, 201, getState());
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/work-boxes") {
    const body = await readJson(req);
    createWorkBox(body);
    sendJson(res, 201, getState());
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/separation-templates") {
    const body = await readJson(req);
    createSeparationTemplate(body);
    sendJson(res, 201, getState());
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/users") {
    const body = await readJson(req);
    createUser(body);
    sendJson(res, 201, getState());
    return;
  }

  const userMatch = url.pathname.match(/^\/api\/users\/([^/]+)(?:\/([^/]+))?$/);
  if (userMatch) {
    const [, id, action] = userMatch;

    if (req.method === "PUT" && !action) {
      const body = await readJson(req);
      updateUser(id, body);
      sendJson(res, 200, getState());
      return;
    }

    if (req.method === "PATCH" && action === "access") {
      const body = await readJson(req);
      updateUserAccess(id, body);
      sendJson(res, 200, getState());
      return;
    }
  }

  const templateMatch = url.pathname.match(/^\/api\/separation-templates\/([^/]+)$/);
  if (templateMatch) {
    const [, id] = templateMatch;

    if (req.method === "PUT") {
      const body = await readJson(req);
      updateSeparationTemplate(id, body);
      sendJson(res, 200, getState());
      return;
    }

    if (req.method === "DELETE") {
      deleteSeparationTemplate(id);
      sendJson(res, 200, getState());
      return;
    }
  }

  const jobMatch = url.pathname.match(/^\/api\/jobs\/([^/]+)(?:\/([^/]+))?$/);
  if (jobMatch) {
    const [, id, action] = jobMatch;

    if (req.method === "PUT" && !action) {
      const body = await readJson(req);
      updateJob(id, body);
      sendJson(res, 200, getState());
      return;
    }

    if (req.method === "DELETE" && !action) {
      deleteJob(id);
      sendJson(res, 200, getState());
      return;
    }

    if (req.method === "POST" && action === "departures") {
      const body = await readJson(req);
      createJobDeparture(id, body);
      sendJson(res, 201, getState());
      return;
    }
  }

  const workBoxMatch = url.pathname.match(/^\/api\/work-boxes\/([^/]+)(?:\/([^/]+))?$/);
  if (workBoxMatch) {
    const [, id, action] = workBoxMatch;

    if (req.method === "PUT" && !action) {
      const body = await readJson(req);
      updateWorkBox(id, body);
      sendJson(res, 200, getState());
      return;
    }

    if (req.method === "DELETE" && !action) {
      deleteWorkBox(id);
      sendJson(res, 200, getState());
      return;
    }

    if (req.method === "POST" && action === "checks") {
      const body = await readJson(req);
      createWorkBoxCheck(id, body, null);
      sendJson(res, 201, getState());
      return;
    }
  }

  const requiredItemMatch = url.pathname.match(/^\/api\/required-items\/([^/]+)$/);
  if (requiredItemMatch && req.method === "PATCH") {
    const body = await readJson(req);
    updateRequiredItem(requiredItemMatch[1], body);
    sendJson(res, 200, getState());
    return;
  }

  const jobBoxItemMatch = url.pathname.match(/^\/api\/job-box-items\/([^/]+)$/);
  if (jobBoxItemMatch && req.method === "PATCH") {
    const body = await readJson(req);
    updateJobBoxItem(jobBoxItemMatch[1], body);
    sendJson(res, 200, getState());
    return;
  }

  const toolMatch = url.pathname.match(/^\/api\/tools\/([^/]+)(?:\/([^/]+))?$/);
  if (toolMatch) {
    const [, id, action] = toolMatch;

    if (req.method === "GET" && !action) {
      sendJson(res, 200, getTool(id));
      return;
    }

    if (req.method === "PUT" && !action) {
      const body = await readJson(req);
      updateTool(id, body);
      sendJson(res, 200, getState());
      return;
    }

    if (req.method === "DELETE" && !action) {
      deleteTool(id);
      sendJson(res, 200, getState());
      return;
    }

    if (req.method === "POST" && action === "duplicate") {
      duplicateTool(id);
      sendJson(res, 201, getState());
      return;
    }

    if (req.method === "PATCH" && action === "inactivate") {
      inactivateTool(id);
      sendJson(res, 200, getState());
      return;
    }

    if (req.method === "GET" && action === "qr") {
      const qr = await generateToolQr(id);
      sendJson(res, 200, qr);
      return;
    }

    if (req.method === "GET" && action === "photo") {
      sendToolPhoto(res, id);
      return;
    }

    if (req.method === "GET" && action === "history") {
      sendJson(res, 200, getToolHistory(id));
      return;
    }
  }

  sendJson(res, 404, { error: "Rota nao encontrada." });
}

function loginUser(res, input) {
  const email = String(input.email || "").trim().toLowerCase();
  const password = String(input.password || "");
  if (!email || !password) throw new HttpError(400, "Informe e-mail e senha.");

  const user = db
    .prepare(
      `SELECT id, name, email, role, access_status AS accessStatus, permissions, password_hash AS passwordHash
       FROM platform_users
       WHERE lower(email) = ?`,
    )
    .get(email);

  if (!user || user.accessStatus !== "enabled" || !verifyPassword(password, user.passwordHash)) {
    throw new HttpError(401, "E-mail ou senha invalidos.");
  }

  const sessionId = createSession(user.id);
  setSessionCookie(res, sessionId);
  return { user: publicUser(user) };
}

function logoutUser(req, res) {
  const sessionId = getSessionId(req);
  if (sessionId) db.prepare("DELETE FROM sessions WHERE id = ?").run(sessionId);
  res.setHeader("Set-Cookie", "moble_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0");
}

function getAuthenticatedUser(req) {
  const sessionId = getSessionId(req);
  if (!sessionId) return null;

  const user = db
    .prepare(
      `SELECT
        u.id,
        u.name,
        u.email,
        u.role,
        u.access_status AS accessStatus,
        u.permissions,
        s.expires_at AS expiresAt
      FROM sessions s
      JOIN platform_users u ON u.id = s.user_id
      WHERE s.id = ?`,
    )
    .get(sessionId);

  if (!user || user.accessStatus !== "enabled" || new Date(user.expiresAt).getTime() <= Date.now()) {
    if (sessionId) db.prepare("DELETE FROM sessions WHERE id = ?").run(sessionId);
    return null;
  }

  return publicUser(user);
}

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    accessStatus: user.accessStatus,
    permissions: Array.isArray(user.permissions) ? user.permissions : safeJsonParse(user.permissions || "[]", []),
  };
}

function createSession(userId) {
  const id = randomBytes(32).toString("hex");
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 14);
  db.prepare("INSERT INTO sessions (id, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)").run(id, userId, now.toISOString(), expiresAt.toISOString());
  db.prepare("DELETE FROM sessions WHERE expires_at <= ?").run(now.toISOString());
  return id;
}

function setSessionCookie(res, sessionId) {
  res.setHeader("Set-Cookie", `moble_session=${sessionId}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${60 * 60 * 24 * 14}`);
}

function getSessionId(req) {
  const cookies = parseCookies(req.headers.cookie || "");
  return cookies.moble_session || "";
}

function parseCookies(cookieHeader) {
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

function hashPassword(password) {
  const value = String(password || "");
  if (value.length < 6) throw new HttpError(400, "A senha deve ter pelo menos 6 caracteres.");
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(value, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password, storedHash) {
  if (!storedHash || !storedHash.includes(":")) return false;
  const [salt, hash] = storedHash.split(":");
  const expected = Buffer.from(hash, "hex");
  const actual = scryptSync(String(password || ""), salt, 64);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function getTool(id) {
  const tool = db
    .prepare(
      `SELECT
        id,
        name,
        internal_code AS internalCode,
        category_id AS categoryId,
        subcategory,
        owner,
        loaned_to AS loanedTo,
        current_job_id AS currentJobId,
        current_job_label AS currentJobLabel,
        control_model AS controlModel,
        quantity,
        status,
        qr_ready AS qrReady,
        photo_data AS photoData,
        notes,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM tools
      WHERE id = ?`,
    )
    .get(id);

  if (!tool) throw new HttpError(404, "Ferramenta nao encontrada.");
  return {
    ...tool,
    qrReady: Boolean(tool.qrReady),
    hasPhoto: Boolean(tool.photoData),
    photoUrl: tool.photoData ? `/api/tools/${tool.id}/photo` : "",
  };
}

function sendToolPhoto(res, id) {
  const tool = db.prepare("SELECT photo_data AS photoData FROM tools WHERE id = ?").get(id);
  if (!tool?.photoData) {
    sendText(res, 404, "Foto nao encontrada.");
    return;
  }

  const match = String(tool.photoData).match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    sendText(res, 422, "Formato de foto invalido.");
    return;
  }

  const [, mimeType, base64] = match;
  const buffer = Buffer.from(base64, "base64");
  res.writeHead(200, {
    "content-type": mimeType,
    "cache-control": "no-store, must-revalidate",
  });
  res.end(buffer);
}

async function generateToolQr(id) {
  const tool = db
    .prepare("SELECT id, name, internal_code AS internalCode, control_model AS controlModel, qr_ready AS qrReady FROM tools WHERE id = ?")
    .get(id);

  if (!tool) throw new HttpError(404, "Ferramenta nao encontrada.");
  if (tool.controlModel !== "individual") throw new HttpError(400, "QR Code e permitido apenas para ferramentas individuais.");

  const payload = JSON.stringify({
    type: "moble-tools-tool",
    id: tool.id,
    code: tool.internalCode,
    name: tool.name,
  });

  const dataUrl = await QRCode.toDataURL(payload, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 320,
  });

  return {
    toolId: tool.id,
    name: tool.name,
    internalCode: tool.internalCode,
    payload,
    dataUrl,
  };
}

async function serveStatic(res, pathname) {
  const requestedPath = pathname === "/" ? "index.html" : decodeURIComponent(pathname).replace(/^[/\\]+/, "");
  const safePath = normalize(requestedPath).replace(/^(\.\.[/\\])+/, "");
  const filePath = join(rootDir, safePath);

  if (!filePath.startsWith(rootDir)) {
    sendText(res, 403, "Acesso negado.");
    return;
  }

  try {
    const content = await readFile(filePath);
    res.writeHead(200, {
      "content-type": getContentType(filePath),
      "cache-control": "no-store, must-revalidate",
    });
    res.end(content);
  } catch (error) {
    if (error.code === "ENOENT" || error.code === "EISDIR") {
      sendText(res, 404, "Arquivo nao encontrado.");
      return;
    }
    throw error;
  }
}

function getState(options = {}) {
  const includePhotos = Boolean(options.includePhotos);
  const categories = db
    .prepare("SELECT id, name, created_at AS createdAt, updated_at AS updatedAt FROM categories ORDER BY name")
    .all()
    .map((category) => ({
      ...category,
      subcategories: db
        .prepare("SELECT name FROM subcategories WHERE category_id = ? ORDER BY name")
        .all(category.id)
        .map((row) => row.name),
    }));

  const tools = db
    .prepare(
      `SELECT
        id,
        name,
        internal_code AS internalCode,
        category_id AS categoryId,
        subcategory,
        owner,
        loaned_to AS loanedTo,
        current_job_id AS currentJobId,
        current_job_label AS currentJobLabel,
        control_model AS controlModel,
        quantity,
        status,
        qr_ready AS qrReady,
        ${includePhotos ? "photo_data AS photoData," : "photo_data IS NOT NULL AND photo_data != '' AS hasPhoto,"}
        notes,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM tools
      ORDER BY updated_at DESC`,
    )
    .all()
    .map((tool) => ({
      ...tool,
      qrReady: Boolean(tool.qrReady),
      hasPhoto: includePhotos ? Boolean(tool.photoData) : Boolean(tool.hasPhoto),
      photoUrl: includePhotos || !tool.hasPhoto ? "" : `/api/tools/${tool.id}/photo`,
    }));

  const jobs = db
    .prepare(
      `SELECT
        id,
        client_name AS clientName,
        work_name AS workName,
        scheduled_date AS scheduledDate,
        responsible,
        status,
        notes,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM jobs
      ORDER BY updated_at DESC`,
    )
    .all()
    .map((job) => ({
      ...job,
      items: db
        .prepare(
          `SELECT
            ri.id,
            ri.tool_id AS toolId,
            ri.quantity,
            ri.status,
            ri.notes,
            ri.created_at AS createdAt,
            ri.updated_at AS updatedAt,
            t.name AS toolName,
            t.internal_code AS internalCode,
            t.control_model AS controlModel,
            ${includePhotos ? "t.photo_data AS photoData," : "t.photo_data IS NOT NULL AND t.photo_data != '' AS hasPhoto,"}
            t.status AS toolStatus,
            c.name AS categoryName
          FROM required_items ri
          JOIN tools t ON t.id = ri.tool_id
          LEFT JOIN categories c ON c.id = t.category_id
          WHERE ri.job_id = ?
          ORDER BY t.name`,
        )
        .all(job.id)
        .map((item) => ({
          ...item,
          hasPhoto: includePhotos ? Boolean(item.photoData) : Boolean(item.hasPhoto),
          photoUrl: includePhotos || !item.hasPhoto ? "" : `/api/tools/${item.toolId}/photo`,
        })),
      boxes: db
        .prepare(
          `SELECT
            jwb.id,
            jwb.box_id AS boxId,
            jwb.created_at AS createdAt,
            wb.name,
            wb.responsible,
            wb.status
          FROM job_work_boxes jwb
          JOIN work_boxes wb ON wb.id = jwb.box_id
          WHERE jwb.job_id = ?
          ORDER BY wb.name`,
        )
        .all(job.id)
        .map((box) => ({
          ...box,
          items: db
            .prepare(
              `SELECT
                jwbi.id,
                jwbi.box_item_id AS boxItemId,
                jwbi.tool_id AS toolId,
                jwbi.quantity,
                jwbi.required,
                jwbi.status,
                jwbi.notes,
                jwbi.created_at AS createdAt,
                jwbi.updated_at AS updatedAt,
                t.name AS toolName,
                t.internal_code AS internalCode,
                ${includePhotos ? "t.photo_data AS photoData," : "t.photo_data IS NOT NULL AND t.photo_data != '' AS hasPhoto,"}
                c.name AS categoryName
              FROM job_work_box_items jwbi
              JOIN tools t ON t.id = jwbi.tool_id
              LEFT JOIN categories c ON c.id = t.category_id
              WHERE jwbi.job_box_id = ?
              ORDER BY t.name`,
            )
            .all(box.id)
            .map((item) => ({
              ...item,
              required: Boolean(item.required),
              hasPhoto: includePhotos ? Boolean(item.photoData) : Boolean(item.hasPhoto),
              photoUrl: includePhotos || !item.hasPhoto ? "" : `/api/tools/${item.toolId}/photo`,
            })),
        })),
      departures: db
        .prepare(
          `SELECT
            id,
            responsible,
            notes,
            created_at AS createdAt
          FROM job_departures
          WHERE job_id = ?
          ORDER BY created_at DESC`,
        )
        .all(job.id)
        .map((departure) => ({
          ...departure,
          items: db
            .prepare(
              `SELECT
                jdi.id,
                jdi.source_type AS sourceType,
                jdi.source_id AS sourceId,
                jdi.tool_id AS toolId,
                jdi.quantity,
                jdi.status_at_departure AS statusAtDeparture,
                jdi.created_at AS createdAt,
                t.name AS toolName,
                t.internal_code AS internalCode,
                ${includePhotos ? "t.photo_data AS photoData," : "t.photo_data IS NOT NULL AND t.photo_data != '' AS hasPhoto,"}
                c.name AS categoryName
              FROM job_departure_items jdi
              JOIN tools t ON t.id = jdi.tool_id
              LEFT JOIN categories c ON c.id = t.category_id
              WHERE jdi.departure_id = ?
              ORDER BY t.name`,
            )
            .all(departure.id)
            .map((item) => ({
              ...item,
              hasPhoto: includePhotos ? Boolean(item.photoData) : Boolean(item.hasPhoto),
              photoUrl: includePhotos || !item.hasPhoto ? "" : `/api/tools/${item.toolId}/photo`,
            })),
          boxes: db
            .prepare(
              `SELECT
                jdb.id,
                jdb.job_box_id AS jobBoxId,
                jdb.box_id AS boxId,
                jdb.status_at_departure AS statusAtDeparture,
                jdb.created_at AS createdAt,
                wb.name,
                wb.responsible,
                wb.status
              FROM job_departure_boxes jdb
              JOIN work_boxes wb ON wb.id = jdb.box_id
              WHERE jdb.departure_id = ?
              ORDER BY wb.name`,
            )
            .all(departure.id),
        })),
    }));

  const users = db
    .prepare(
      `SELECT
        u.id,
        u.name,
        u.email,
        u.phone,
        u.role,
        u.manager_id AS managerId,
        m.name AS managerName,
        u.access_status AS accessStatus,
        u.permissions,
        u.password_hash AS passwordHash,
        u.notes,
        u.created_at AS createdAt,
        u.updated_at AS updatedAt
      FROM platform_users u
      LEFT JOIN platform_users m ON m.id = u.manager_id
      ORDER BY
        CASE u.role
          WHEN 'owner' THEN 1
          WHEN 'manager' THEN 2
          WHEN 'supervisor' THEN 3
          WHEN 'operator' THEN 4
          ELSE 5
        END,
        u.name`,
    )
    .all()
    .map((user) => ({
      ...user,
      permissions: safeJsonParse(user.permissions, []),
      hasPassword: Boolean(user.passwordHash),
      passwordHash: undefined,
    }));

  const workBoxes = db
    .prepare(
      `SELECT
        id,
        name,
        responsible,
        status,
        notes,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM work_boxes
      ORDER BY status, name`,
    )
    .all()
    .map((box) => ({
      ...box,
      items: db
        .prepare(
          `SELECT
            wbi.id,
            wbi.tool_id AS toolId,
            wbi.quantity,
            wbi.required,
            wbi.notes,
            wbi.created_at AS createdAt,
            wbi.updated_at AS updatedAt,
            t.name AS toolName,
            t.internal_code AS internalCode,
            t.control_model AS controlModel,
            ${includePhotos ? "t.photo_data AS photoData," : "t.photo_data IS NOT NULL AND t.photo_data != '' AS hasPhoto,"}
            t.status AS toolStatus,
            c.name AS categoryName
          FROM work_box_items wbi
          JOIN tools t ON t.id = wbi.tool_id
          LEFT JOIN categories c ON c.id = t.category_id
          WHERE wbi.box_id = ?
          ORDER BY t.name`,
        )
        .all(box.id)
        .map((item) => ({
          ...item,
          required: Boolean(item.required),
          hasPhoto: includePhotos ? Boolean(item.photoData) : Boolean(item.hasPhoto),
          photoUrl: includePhotos || !item.hasPhoto ? "" : `/api/tools/${item.toolId}/photo`,
        })),
      checks: db
        .prepare(
          `SELECT
            id,
            checked_by AS checkedBy,
            status,
            notes,
            created_at AS createdAt
          FROM work_box_checks
          WHERE box_id = ?
          ORDER BY created_at DESC
          LIMIT 5`,
        )
        .all(box.id),
    }));

  const separationTemplates = db
    .prepare(
      `SELECT
        id,
        name,
        notes,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM separation_templates
      ORDER BY name`,
    )
    .all()
    .map((template) => ({
      ...template,
      items: db
        .prepare(
          `SELECT
            sti.id,
            sti.tool_id AS toolId,
            sti.quantity,
            sti.created_at AS createdAt,
            sti.updated_at AS updatedAt,
            t.name AS toolName,
            t.internal_code AS internalCode,
            t.control_model AS controlModel,
            ${includePhotos ? "t.photo_data AS photoData," : "t.photo_data IS NOT NULL AND t.photo_data != '' AS hasPhoto,"}
            t.status AS toolStatus,
            c.name AS categoryName
          FROM separation_template_items sti
          JOIN tools t ON t.id = sti.tool_id
          LEFT JOIN categories c ON c.id = t.category_id
          WHERE sti.template_id = ?
          ORDER BY t.name`,
        )
        .all(template.id)
        .map((item) => ({
          ...item,
          hasPhoto: includePhotos ? Boolean(item.photoData) : Boolean(item.hasPhoto),
          photoUrl: includePhotos || !item.hasPhoto ? "" : `/api/tools/${item.toolId}/photo`,
        })),
      boxes: db
        .prepare(
          `SELECT
            stb.id,
            stb.box_id AS boxId,
            stb.created_at AS createdAt,
            wb.name,
            wb.responsible,
            wb.status
          FROM separation_template_boxes stb
          JOIN work_boxes wb ON wb.id = stb.box_id
          WHERE stb.template_id = ?
          ORDER BY wb.name`,
        )
        .all(template.id),
    }));

  return { categories, tools, jobs, users, workBoxes, separationTemplates };
}

function createCategory(input) {
  const now = new Date().toISOString();
  const id = createId("cat");
  const name = required(input.name, "Nome da categoria");

  db.prepare("INSERT INTO categories (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)").run(id, name, now, now);

  for (const subcategory of input.subcategories || []) {
    const value = String(subcategory).trim();
    if (value) {
      db.prepare("INSERT INTO subcategories (id, category_id, name, created_at) VALUES (?, ?, ?, ?)").run(
        createId("sub"),
        id,
        value,
        now,
      );
    }
  }

  addHistory("category", id, "create", `Categoria criada: ${name}`);
}

function createTool(input) {
  const now = new Date().toISOString();
  const tool = normalizeToolInput(input, createId("tool"), now, now);

  db.prepare(
    `INSERT INTO tools (
      id, name, internal_code, category_id, subcategory, owner, loaned_to, current_job_id, current_job_label,
      control_model, quantity, status, qr_ready, photo_data, notes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    tool.id,
    tool.name,
    tool.internalCode,
    tool.categoryId,
    tool.subcategory,
    tool.owner,
    tool.loanedTo,
    tool.currentJobId,
    tool.currentJobLabel,
    tool.controlModel,
    tool.quantity,
    tool.status,
    tool.qrReady ? 1 : 0,
    tool.photoData,
    tool.notes,
    tool.createdAt,
    tool.updatedAt,
  );

  addHistory("tool", tool.id, "create", `Ferramenta criada: ${tool.name}`);
}

function createJob(input) {
  const now = new Date().toISOString();
  const id = createId("job");
  const job = normalizeJobInput(input);
  const items = Array.isArray(input.items) ? input.items : [];
  const boxes = Array.isArray(input.boxes) ? input.boxes : [];

  if (items.length === 0 && boxes.length === 0) throw new HttpError(400, "Selecione pelo menos uma ferramenta ou caixa.");

  db.prepare(
    `INSERT INTO jobs (id, client_name, work_name, scheduled_date, responsible, status, notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(id, job.clientName, job.workName, job.scheduledDate, job.responsible, "draft", job.notes, now, now);

  replaceRequiredItems(id, items, new Map());
  replaceJobWorkBoxes(id, boxes);
  addHistory("job", id, "create", `Lista requerida criada: ${job.workName} / ${job.clientName}`);
}

function createSeparationTemplate(input) {
  const now = new Date().toISOString();
  const id = createId("tpl");
  const template = normalizeSeparationTemplateInput(input);
  const items = Array.isArray(input.items) ? input.items : [];
  const boxes = Array.isArray(input.boxes) ? input.boxes : [];

  if (items.length === 0 && boxes.length === 0) throw new HttpError(400, "Selecione pelo menos uma ferramenta ou caixa.");

  db.prepare(
    `INSERT INTO separation_templates (id, name, notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?)`,
  ).run(id, template.name, template.notes, now, now);

  replaceSeparationTemplateItems(id, items);
  replaceSeparationTemplateBoxes(id, boxes);
  addHistory("separation_template", id, "create", `Separacao predeterminada criada: ${template.name}`);
}

function updateSeparationTemplate(id, input) {
  const existing = db.prepare("SELECT id FROM separation_templates WHERE id = ?").get(id);
  if (!existing) throw new HttpError(404, "Separacao predeterminada nao encontrada.");

  const template = normalizeSeparationTemplateInput(input);
  const items = Array.isArray(input.items) ? input.items : [];
  const boxes = Array.isArray(input.boxes) ? input.boxes : [];
  if (items.length === 0 && boxes.length === 0) throw new HttpError(400, "Selecione pelo menos uma ferramenta ou caixa.");

  db.prepare("UPDATE separation_templates SET name = ?, notes = ?, updated_at = ? WHERE id = ?").run(
    template.name,
    template.notes,
    new Date().toISOString(),
    id,
  );
  db.prepare("DELETE FROM separation_template_items WHERE template_id = ?").run(id);
  db.prepare("DELETE FROM separation_template_boxes WHERE template_id = ?").run(id);
  replaceSeparationTemplateItems(id, items);
  replaceSeparationTemplateBoxes(id, boxes);
  addHistory("separation_template", id, "update", `Separacao predeterminada atualizada: ${template.name}`);
}

function deleteSeparationTemplate(id) {
  const template = db.prepare("SELECT name FROM separation_templates WHERE id = ?").get(id);
  if (!template) throw new HttpError(404, "Separacao predeterminada nao encontrada.");

  db.prepare("DELETE FROM separation_templates WHERE id = ?").run(id);
  addHistory("separation_template", id, "delete", `Separacao predeterminada excluida: ${template.name}`);
}

function normalizeSeparationTemplateInput(input) {
  return {
    name: required(input.name, "Nome da separacao"),
    notes: String(input.notes || "").trim(),
  };
}

function replaceSeparationTemplateItems(templateId, items) {
  const now = new Date().toISOString();
  for (const item of items) {
    const toolId = required(item.toolId, "Ferramenta");
    const tool = db.prepare("SELECT id, control_model AS controlModel FROM tools WHERE id = ?").get(toolId);
    if (!tool) throw new HttpError(404, "Ferramenta do modelo nao encontrada.");

    const quantity = Math.max(1, Number(item.quantity || 1));
    db.prepare(
      `INSERT INTO separation_template_items (id, template_id, tool_id, quantity, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).run(createId("tplitem"), templateId, toolId, tool.controlModel === "quantity" ? quantity : 1, now, now);
  }
}

function replaceSeparationTemplateBoxes(templateId, boxes) {
  const now = new Date().toISOString();
  for (const item of boxes) {
    const boxId = typeof item === "string" ? item : item.boxId;
    const box = db.prepare("SELECT id FROM work_boxes WHERE id = ?").get(required(boxId, "Caixa de obra"));
    if (!box) throw new HttpError(404, "Caixa de obra do modelo nao encontrada.");

    db.prepare("INSERT INTO separation_template_boxes (id, template_id, box_id, created_at) VALUES (?, ?, ?, ?)").run(
      createId("tplbox"),
      templateId,
      box.id,
      now,
    );
  }
}

function updateJob(id, input) {
  const existing = db.prepare("SELECT id, work_name AS workName FROM jobs WHERE id = ?").get(id);
  if (!existing) throw new HttpError(404, "Lista requerida nao encontrada.");

  const job = normalizeJobInput(input);
  const items = Array.isArray(input.items) ? input.items : [];
  const boxes = Array.isArray(input.boxes) ? input.boxes : [];
  if (items.length === 0 && boxes.length === 0) throw new HttpError(400, "Selecione pelo menos uma ferramenta ou caixa.");

  const currentStatusByTool = new Map(
    db
      .prepare("SELECT tool_id AS toolId, status, notes FROM required_items WHERE job_id = ?")
      .all(id)
      .map((item) => [item.toolId, { status: item.status, notes: item.notes || "" }]),
  );

  db.prepare(
    `UPDATE jobs
     SET client_name = ?, work_name = ?, scheduled_date = ?, responsible = ?, notes = ?, updated_at = ?
     WHERE id = ?`,
  ).run(job.clientName, job.workName, job.scheduledDate, job.responsible, job.notes, new Date().toISOString(), id);

  db.prepare("DELETE FROM required_items WHERE job_id = ?").run(id);
  db.prepare("DELETE FROM job_work_boxes WHERE job_id = ?").run(id);
  replaceRequiredItems(id, items, currentStatusByTool);
  replaceJobWorkBoxes(id, boxes);
  addHistory("job", id, "update", `Lista requerida atualizada: ${job.workName} / ${job.clientName}`);
}

function deleteJob(id) {
  const job = db.prepare("SELECT work_name AS workName, client_name AS clientName FROM jobs WHERE id = ?").get(id);
  if (!job) throw new HttpError(404, "Lista requerida nao encontrada.");

  db.prepare("DELETE FROM jobs WHERE id = ?").run(id);
  addHistory("job", id, "delete", `Lista requerida excluida: ${job.workName} / ${job.clientName}`);
}

function createJobDeparture(jobId, input) {
  const job = db.prepare("SELECT id, work_name AS workName, client_name AS clientName, responsible FROM jobs WHERE id = ?").get(jobId);
  if (!job) throw new HttpError(404, "Lista requerida nao encontrada.");

  const toolItems = db
    .prepare(
      `SELECT id, tool_id AS toolId, quantity, status
       FROM required_items
       WHERE job_id = ? AND status = 'separated'
       ORDER BY created_at`,
    )
    .all(jobId);

  const jobBoxes = db
    .prepare(
      `SELECT
        jwb.id,
        jwb.box_id AS boxId,
        CASE
          WHEN SUM(CASE WHEN jwbi.status = 'missing' THEN 1 ELSE 0 END) > 0 THEN 'missing'
          WHEN SUM(CASE WHEN jwbi.status = 'pending' THEN 1 ELSE 0 END) > 0 THEN 'pending'
          ELSE 'ok'
        END AS statusAtDeparture
       FROM job_work_boxes jwb
       LEFT JOIN job_work_box_items jwbi ON jwbi.job_box_id = jwb.id
       WHERE jwb.job_id = ?
       GROUP BY jwb.id, jwb.box_id
       ORDER BY jwb.created_at`,
    )
    .all(jobId);

  const boxItems = db
    .prepare(
      `SELECT
        jwbi.id,
        jwbi.tool_id AS toolId,
        jwbi.quantity,
        jwbi.status
       FROM job_work_box_items jwbi
       JOIN job_work_boxes jwb ON jwb.id = jwbi.job_box_id
       WHERE jwb.job_id = ? AND jwbi.status IN ('ok', 'substituted')
       ORDER BY jwbi.created_at`,
    )
    .all(jobId);

  if (toolItems.length === 0 && boxItems.length === 0 && jobBoxes.length === 0) {
    throw new HttpError(400, "Nenhum item pronto para registrar saida.");
  }

  const now = new Date().toISOString();
  const departureId = createId("dep");
  const responsible = String(input.responsible || job.responsible || "").trim();
  const notes = String(input.notes || "").trim();
  const jobLabel = `${job.clientName} - ${job.workName}`;

  db.prepare("INSERT INTO job_departures (id, job_id, responsible, notes, created_at) VALUES (?, ?, ?, ?, ?)").run(
    departureId,
    jobId,
    responsible,
    notes,
    now,
  );

  for (const item of toolItems) {
    db.prepare(
      `INSERT INTO job_departure_items (
        id, departure_id, source_type, source_id, tool_id, quantity, status_at_departure, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(createId("depitem"), departureId, "tool", item.id, item.toolId, item.quantity, item.status, now);

    db.prepare(
      `UPDATE tools
       SET status = 'in_work', current_job_id = ?, current_job_label = ?, loaned_to = '', updated_at = ?
       WHERE id = ? AND status = 'active'`,
    ).run(jobId, jobLabel, now, item.toolId);
  }

  for (const box of jobBoxes) {
    db.prepare(
      `INSERT INTO job_departure_boxes (id, departure_id, job_box_id, box_id, status_at_departure, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).run(createId("depbox"), departureId, box.id, box.boxId, box.statusAtDeparture || "pending", now);
  }

  for (const item of boxItems) {
    db.prepare(
      `INSERT INTO job_departure_items (
        id, departure_id, source_type, source_id, tool_id, quantity, status_at_departure, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(createId("depitem"), departureId, "box_item", item.id, item.toolId, item.quantity, item.status, now);
  }

  db.prepare("UPDATE jobs SET status = 'ready', updated_at = ? WHERE id = ?").run(now, jobId);
  addHistory("job", jobId, "departure", `Saida registrada: ${job.workName} / ${job.clientName}`);
}

function normalizeJobInput(input) {
  const clientName = required(input.clientName, "Cliente");
  const workName = required(input.workName, "Obra");
  return {
    clientName,
    workName,
    scheduledDate: String(input.scheduledDate || "").trim(),
    responsible: String(input.responsible || "").trim(),
    notes: String(input.notes || "").trim(),
  };
}

function replaceRequiredItems(jobId, items, currentStatusByTool) {
  const now = new Date().toISOString();
  for (const item of items) {
    const toolId = required(item.toolId, "Ferramenta");
    const tool = db.prepare("SELECT id, control_model AS controlModel FROM tools WHERE id = ?").get(toolId);
    if (!tool) throw new HttpError(404, "Ferramenta da lista nao encontrada.");

    const quantity = Math.max(1, Number(item.quantity || 1));
    const previous = currentStatusByTool.get(toolId);
    db.prepare(
      `INSERT INTO required_items (id, job_id, tool_id, quantity, status, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(createId("req"), jobId, toolId, tool.controlModel === "quantity" ? quantity : 1, previous?.status || "pending", previous?.notes || "", now, now);
  }
}

function replaceJobWorkBoxes(jobId, boxes) {
  const now = new Date().toISOString();
  for (const item of boxes) {
    const boxId = typeof item === "string" ? item : item.boxId;
    const box = db.prepare("SELECT id FROM work_boxes WHERE id = ?").get(required(boxId, "Caixa de obra"));
    if (!box) throw new HttpError(404, "Caixa de obra nao encontrada.");

    const jobBoxId = createId("jobbox");
    db.prepare("INSERT INTO job_work_boxes (id, job_id, box_id, created_at) VALUES (?, ?, ?, ?)").run(jobBoxId, jobId, box.id, now);
    createJobWorkBoxItems(jobBoxId, box.id, now);
  }
}

function createJobWorkBoxItems(jobBoxId, boxId, now = new Date().toISOString()) {
  const boxItems = db.prepare("SELECT id, tool_id AS toolId, quantity, required FROM work_box_items WHERE box_id = ? ORDER BY created_at").all(boxId);
  for (const item of boxItems) {
    db.prepare(
      `INSERT OR IGNORE INTO job_work_box_items (
        id, job_box_id, box_item_id, tool_id, quantity, required, status, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      createId("jobboxitem"),
      jobBoxId,
      item.id,
      item.toolId,
      item.quantity,
      item.required,
      "pending",
      "",
      now,
      now,
    );
  }
}

function updateRequiredItem(id, input) {
  const status = ["pending", "separated", "missing"].includes(input.status) ? input.status : null;
  if (!status) throw new HttpError(400, "Status do item invalido.");

  const item = db
    .prepare(
      `SELECT ri.id, ri.job_id AS jobId, t.name AS toolName
       FROM required_items ri
       JOIN tools t ON t.id = ri.tool_id
       WHERE ri.id = ?`,
    )
    .get(id);

  if (!item) throw new HttpError(404, "Item da lista nao encontrado.");

  const notes = String(input.notes || "").trim();
  db.prepare("UPDATE required_items SET status = ?, notes = ?, updated_at = ? WHERE id = ?").run(status, notes, new Date().toISOString(), id);
  addHistory("job", item.jobId, "item-update", `Item atualizado na lista: ${item.toolName} (${status})`);
}

function updateJobBoxItem(id, input) {
  const status = ["pending", "ok", "missing", "substituted"].includes(input.status) ? input.status : null;
  if (!status) throw new HttpError(400, "Status do item da caixa invalido.");

  const item = db
    .prepare(
      `SELECT jwbi.id, jwb.job_id AS jobId, wb.name AS boxName, t.name AS toolName
       FROM job_work_box_items jwbi
       JOIN job_work_boxes jwb ON jwb.id = jwbi.job_box_id
       JOIN work_boxes wb ON wb.id = jwb.box_id
       JOIN tools t ON t.id = jwbi.tool_id
       WHERE jwbi.id = ?`,
    )
    .get(id);

  if (!item) throw new HttpError(404, "Item da caixa na obra nao encontrado.");

  const notes = String(input.notes || "").trim();
  db.prepare("UPDATE job_work_box_items SET status = ?, notes = ?, updated_at = ? WHERE id = ?").run(status, notes, new Date().toISOString(), id);
  addHistory("job", item.jobId, "box-item-update", `Item atualizado na ${item.boxName}: ${item.toolName} (${status})`);
}

function createWorkBox(input) {
  const now = new Date().toISOString();
  const id = createId("box");
  const box = normalizeWorkBoxInput(input);
  const items = Array.isArray(input.items) ? input.items : [];

  db.prepare(
    `INSERT INTO work_boxes (id, name, responsible, status, notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(id, box.name, box.responsible, box.status, box.notes, now, now);

  replaceWorkBoxItems(id, items);
  addHistory("work-box", id, "create", `Caixa de obra criada: ${box.name}`);
}

function updateWorkBox(id, input) {
  const existing = db.prepare("SELECT id, name FROM work_boxes WHERE id = ?").get(id);
  if (!existing) throw new HttpError(404, "Caixa de obra nao encontrada.");

  const box = normalizeWorkBoxInput(input);
  const items = Array.isArray(input.items) ? input.items : [];
  db.prepare(
    `UPDATE work_boxes
     SET name = ?, responsible = ?, status = ?, notes = ?, updated_at = ?
     WHERE id = ?`,
  ).run(box.name, box.responsible, box.status, box.notes, new Date().toISOString(), id);

  db.prepare("DELETE FROM work_box_items WHERE box_id = ?").run(id);
  replaceWorkBoxItems(id, items);
  addHistory("work-box", id, "update", `Caixa de obra atualizada: ${box.name}`);
}

function deleteWorkBox(id) {
  const box = db.prepare("SELECT name FROM work_boxes WHERE id = ?").get(id);
  if (!box) throw new HttpError(404, "Caixa de obra nao encontrada.");

  db.prepare("DELETE FROM work_boxes WHERE id = ?").run(id);
  addHistory("work-box", id, "delete", `Caixa de obra excluida: ${box.name}`);
}

function normalizeWorkBoxInput(input) {
  return {
    name: required(input.name, "Nome da caixa"),
    responsible: String(input.responsible || "").trim(),
    status: ["active", "inactive"].includes(input.status) ? input.status : "active",
    notes: String(input.notes || "").trim(),
  };
}

function replaceWorkBoxItems(boxId, items) {
  const now = new Date().toISOString();
  for (const item of items) {
    const toolId = required(item.toolId, "Ferramenta");
    const tool = db.prepare("SELECT id, control_model AS controlModel FROM tools WHERE id = ?").get(toolId);
    if (!tool) throw new HttpError(404, "Ferramenta da caixa nao encontrada.");

    db.prepare(
      `INSERT INTO work_box_items (id, box_id, tool_id, quantity, required, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      createId("boxitem"),
      boxId,
      toolId,
      Math.max(1, Number(item.quantity || 1)),
      item.required === false ? 0 : 1,
      String(item.notes || "").trim(),
      now,
      now,
    );
  }
}

function createWorkBoxCheck(boxId, input, currentUser) {
  const box = db.prepare("SELECT id, name FROM work_boxes WHERE id = ?").get(boxId);
  if (!box) throw new HttpError(404, "Caixa de obra nao encontrada.");

  const now = new Date().toISOString();
  const items = Array.isArray(input.items) ? input.items : [];
  if (items.length === 0) throw new HttpError(400, "A conferencia precisa ter pelo menos um item.");

  const allowed = new Set(["ok", "missing", "substituted"]);
  const hasPending = items.some((item) => item.status !== "ok");
  const checkId = createId("boxcheck");
  db.prepare(
    `INSERT INTO work_box_checks (id, box_id, checked_by, status, notes, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(checkId, boxId, String(input.checkedBy || currentUser?.name || "").trim(), hasPending ? "pending" : "complete", String(input.notes || "").trim(), now);

  for (const item of items) {
    const boxItem = db
      .prepare("SELECT id, tool_id AS toolId FROM work_box_items WHERE id = ? AND box_id = ?")
      .get(required(item.boxItemId, "Item da caixa"), boxId);
    if (!boxItem) throw new HttpError(404, "Item da caixa nao encontrado.");

    const status = allowed.has(item.status) ? item.status : "ok";
    db.prepare(
      `INSERT INTO work_box_check_items (id, check_id, box_item_id, tool_id, status, notes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).run(createId("boxcheckitem"), checkId, boxItem.id, boxItem.toolId, status, String(item.notes || "").trim(), now);
  }

  addHistory("work-box", boxId, "check", `Caixa conferida: ${box.name} (${hasPending ? "com pendencias" : "completa"})`);
}

function createUser(input) {
  const now = new Date().toISOString();
  const user = normalizeUserInput(input);
  const passwordHash = input.password ? hashPassword(input.password) : null;

  db.prepare(
    `INSERT INTO platform_users (
      id, name, email, phone, role, manager_id, access_status, permissions, password_hash, notes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    createId("usr"),
    user.name,
    user.email,
    user.phone,
    user.role,
    user.managerId,
    user.accessStatus,
    JSON.stringify(user.permissions),
    passwordHash,
    user.notes,
    now,
    now,
  );
}

function updateUser(id, input) {
  const existing = db.prepare("SELECT id FROM platform_users WHERE id = ?").get(id);
  if (!existing) throw new HttpError(404, "Usuario nao encontrado.");

  const user = normalizeUserInput(input, id);
  const passwordHash = input.password ? hashPassword(input.password) : null;
  db.prepare(
    `UPDATE platform_users
     SET name = ?, email = ?, phone = ?, role = ?, manager_id = ?, access_status = ?, permissions = ?,
         password_hash = COALESCE(?, password_hash), notes = ?, updated_at = ?
     WHERE id = ?`,
  ).run(
    user.name,
    user.email,
    user.phone,
    user.role,
    user.managerId,
    user.accessStatus,
    JSON.stringify(user.permissions),
    passwordHash,
    user.notes,
    new Date().toISOString(),
    id,
  );
}

function updateUserAccess(id, input) {
  const status = ["enabled", "disabled"].includes(input.accessStatus) ? input.accessStatus : null;
  if (!status) throw new HttpError(400, "Status de acesso invalido.");

  const user = db.prepare("SELECT id FROM platform_users WHERE id = ?").get(id);
  if (!user) throw new HttpError(404, "Usuario nao encontrado.");

  db.prepare("UPDATE platform_users SET access_status = ?, updated_at = ? WHERE id = ?").run(status, new Date().toISOString(), id);
}

function normalizeUserInput(input, currentId = "") {
  const role = ["owner", "manager", "supervisor", "operator", "viewer"].includes(input.role) ? input.role : "operator";
  const accessStatus = ["enabled", "disabled"].includes(input.accessStatus) ? input.accessStatus : "enabled";
  const managerId = String(input.managerId || "").trim();
  const email = String(input.email || "").trim().toLowerCase();

  if (managerId && managerId === currentId) throw new HttpError(400, "Usuario nao pode ser gestor de si mesmo.");
  if (managerId && !db.prepare("SELECT id FROM platform_users WHERE id = ?").get(managerId)) {
    throw new HttpError(400, "Gestor informado nao existe.");
  }

  if (email) {
    const duplicate = db.prepare("SELECT id FROM platform_users WHERE lower(email) = ? AND id != ?").get(email, currentId || "");
    if (duplicate) throw new HttpError(400, "Ja existe colaborador com este e-mail.");
  }

  const allowedPermissions = ["tools", "required", "categories", "users", "reports"];
  const permissions = Array.isArray(input.permissions)
    ? input.permissions.filter((item) => allowedPermissions.includes(item))
    : [];

  return {
    name: required(input.name, "Nome"),
    email,
    phone: String(input.phone || "").trim(),
    role,
    managerId: managerId || null,
    accessStatus,
    permissions,
    notes: String(input.notes || "").trim(),
  };
}

function safeJsonParse(value, fallback) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function updateTool(id, input) {
  const existing = db.prepare("SELECT id, created_at AS createdAt FROM tools WHERE id = ?").get(id);
  if (!existing) throw new HttpError(404, "Ferramenta nao encontrada.");

  const tool = normalizeToolInput(input, id, existing.createdAt, new Date().toISOString());

  db.prepare(
    `UPDATE tools
      SET name = ?, internal_code = ?, category_id = ?, subcategory = ?, owner = ?, loaned_to = ?,
          current_job_id = ?, current_job_label = ?, control_model = ?, quantity = ?,
          status = ?, qr_ready = ?, photo_data = ?, notes = ?, updated_at = ?
      WHERE id = ?`,
  ).run(
    tool.name,
    tool.internalCode,
    tool.categoryId,
    tool.subcategory,
    tool.owner,
    tool.loanedTo,
    tool.currentJobId,
    tool.currentJobLabel,
    tool.controlModel,
    tool.quantity,
    tool.status,
    tool.qrReady ? 1 : 0,
    tool.photoData,
    tool.notes,
    tool.updatedAt,
    id,
  );

  addHistory("tool", id, "update", `Ferramenta atualizada: ${tool.name}`);
}

function duplicateTool(id) {
  const tool = db
    .prepare(
      `SELECT name, category_id AS categoryId, subcategory, owner, loaned_to AS loanedTo,
        current_job_id AS currentJobId, current_job_label AS currentJobLabel,
        control_model AS controlModel, quantity, status, qr_ready AS qrReady, photo_data AS photoData, notes
       FROM tools WHERE id = ?`,
    )
    .get(id);

  if (!tool) throw new HttpError(404, "Ferramenta nao encontrada.");

  createTool({
    ...tool,
    name: `${tool.name} (copia)`,
    internalCode: generateInternalCode(tool.name),
    qrReady: Boolean(tool.qrReady),
  });
}

function inactivateTool(id) {
  const tool = db.prepare("SELECT name FROM tools WHERE id = ?").get(id);
  if (!tool) throw new HttpError(404, "Ferramenta nao encontrada.");

  db.prepare("UPDATE tools SET status = 'inactive', updated_at = ? WHERE id = ?").run(new Date().toISOString(), id);
  addHistory("tool", id, "inactivate", `Ferramenta inativada: ${tool.name}`);
}

function migrateToolsStatusConstraint() {
  const table = db.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'tools'").get();
  const statuses = ["'broken'", "'in_work'", "'loaned'", "'lost'"];
  if (!table?.sql || statuses.every((status) => table.sql.includes(status))) return;

  db.exec(`
    PRAGMA foreign_keys = OFF;

    ALTER TABLE tools RENAME TO tools_old;

    CREATE TABLE tools (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      internal_code TEXT NOT NULL UNIQUE,
      category_id TEXT NOT NULL REFERENCES categories(id),
      subcategory TEXT,
      loaned_to TEXT,
      current_job_id TEXT,
      current_job_label TEXT,
      owner TEXT NOT NULL DEFAULT 'MÃ¶ble',
      control_model TEXT NOT NULL CHECK(control_model IN ('individual', 'quantity')),
      quantity INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL CHECK(status IN ('active', 'maintenance', 'inactive', 'broken', 'in_work', 'loaned', 'lost')),
      qr_ready INTEGER NOT NULL DEFAULT 1,
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      photo_data TEXT
    );

    INSERT INTO tools (
      id, name, internal_code, category_id, subcategory, owner, loaned_to, current_job_id, current_job_label, control_model, quantity, status,
      qr_ready, notes, created_at, updated_at, photo_data
    )
    SELECT
      id, name, internal_code, category_id, subcategory, owner, NULL, NULL, NULL, control_model, quantity, status,
      qr_ready, notes, created_at, updated_at, photo_data
    FROM tools_old;

    DROP TABLE tools_old;

    PRAGMA foreign_keys = ON;
  `);
}

function getToolHistory(id) {
  const tool = db.prepare("SELECT id FROM tools WHERE id = ?").get(id);
  if (!tool) throw new HttpError(404, "Ferramenta nao encontrada.");

  return db
    .prepare(
      `SELECT id, action, description, created_at AS createdAt
       FROM history
       WHERE entity_type = 'tool' AND entity_id = ?
       ORDER BY created_at DESC
       LIMIT 40`,
    )
    .all(id);
}

function deleteTool(id) {
  const tool = db.prepare("SELECT name FROM tools WHERE id = ?").get(id);
  if (!tool) throw new HttpError(404, "Ferramenta nao encontrada.");

  db.prepare("DELETE FROM tools WHERE id = ?").run(id);
  addHistory("tool", id, "delete", `Ferramenta excluida: ${tool.name}`);
}

function normalizeToolInput(input, id, createdAt, updatedAt) {
  const name = required(input.name, "Nome");
  const controlModel = ["individual", "quantity"].includes(input.controlModel) ? input.controlModel : "individual";
  const status = ["active", "maintenance", "inactive", "broken", "in_work", "loaned", "lost"].includes(input.status) ? input.status : "active";
  const quantity = Math.max(0, Number(input.quantity || (controlModel === "individual" ? 1 : 0)));
  const loanedTo = status === "loaned" ? String(input.loanedTo || "").trim() : "";
  const currentJobId = status === "in_work" ? String(input.currentJobId || "").trim() : "";
  const currentJobLabel = status === "in_work" ? String(input.currentJobLabel || "").trim() : "";

  return {
    id,
    name,
    internalCode: String(input.internalCode || "").trim() || generateInternalCode(name),
    categoryId: required(input.categoryId, "Categoria"),
    subcategory: String(input.subcategory || "").trim(),
    owner: String(input.owner || "MÃ¶ble").trim() || "MÃ¶ble",
    loanedTo,
    currentJobId,
    currentJobLabel,
    controlModel,
    quantity,
    status,
    qrReady: Boolean(input.qrReady),
    photoData: String(input.photoData || "").trim(),
    notes: String(input.notes || "").trim(),
    createdAt,
    updatedAt,
  };
}

function seedDefaultCategories() {
  const count = db.prepare("SELECT COUNT(*) AS total FROM categories").get().total;
  if (count > 0) return;

  const defaults = [
    ["cat-electric", "Ferramentas Eletricas", ["Parafusadeiras", "Furadeiras", "Serras", "Tupias", "Marteletes"]],
    ["cat-manual", "Ferramentas Manuais", ["Medicao", "Fixacao", "Corte", "Alicates", "Chaves"]],
    ["cat-equipment", "Equipamentos", ["Escadas", "Aspiradores", "Compressores", "Bancadas", "Cavaletes"]],
    ["cat-epi", "EPIs", ["Protecao ocular", "Protecao auditiva", "Luvas", "Capacetes"]],
    ["cat-support", "Itens de Apoio", ["Extensoes", "Adaptadores", "Reguas", "Organizacao"]],
  ];
  const now = new Date().toISOString();

  for (const [id, name, subcategories] of defaults) {
    db.prepare("INSERT INTO categories (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)").run(id, name, now, now);
    for (const subcategory of subcategories) {
      db.prepare("INSERT INTO subcategories (id, category_id, name, created_at) VALUES (?, ?, ?, ?)").run(
        createId("sub"),
        id,
        subcategory,
        now,
      );
    }
  }
}

function seedDefaultAdmin() {
  const count = db.prepare("SELECT COUNT(*) AS total FROM platform_users").get().total;
  const withPassword = db.prepare("SELECT COUNT(*) AS total FROM platform_users WHERE password_hash IS NOT NULL AND password_hash != ''").get().total;

  if (count > 0 && withPassword === 0) {
    const owner =
      db.prepare("SELECT id FROM platform_users WHERE role = 'owner' ORDER BY created_at LIMIT 1").get() ||
      db.prepare("SELECT id FROM platform_users ORDER BY created_at LIMIT 1").get();
    if (owner) {
      db.prepare("UPDATE platform_users SET password_hash = ?, updated_at = ? WHERE id = ?").run(
        hashPassword("admin123"),
        new Date().toISOString(),
        owner.id,
      );
    }
    return;
  }

  if (count > 0) return;

  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO platform_users (
      id, name, email, phone, role, manager_id, access_status, permissions, password_hash, notes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    "usr-admin",
    "Administrador",
    "admin@moble.tools",
    "",
    "owner",
    null,
    "enabled",
    JSON.stringify(["tools", "required", "categories", "users", "reports"]),
    hashPassword("admin123"),
    "Usuario administrador inicial.",
    now,
    now,
  );
}

function seedDefaultWorkBoxes() {
  const count = db.prepare("SELECT COUNT(*) AS total FROM work_boxes").get().total;
  if (count > 0) return;

  const now = new Date().toISOString();
  const defaults = [
    ["box-ronan", "Caixa de Obra Ronan", "Ronan"],
    ["box-rubens", "Caixa de Obra Rubens", "Rubens"],
  ];

  for (const [id, name, responsible] of defaults) {
    db.prepare(
      `INSERT INTO work_boxes (id, name, responsible, status, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).run(id, name, responsible, "active", "", now, now);
  }
}

function backfillJobWorkBoxItems() {
  const jobBoxes = db.prepare("SELECT id, box_id AS boxId, created_at AS createdAt FROM job_work_boxes").all();
  for (const jobBox of jobBoxes) {
    createJobWorkBoxItems(jobBox.id, jobBox.boxId, jobBox.createdAt || new Date().toISOString());
  }
}

function seedExampleTools() {
  const examples = [
    ["Parafusadeira Bosch GSR", "cat-electric", "Parafusadeiras", "individual", 1],
    ["Furadeira Makita HP1640", "cat-electric", "Furadeiras", "individual", 1],
    ["Trena 5m", "cat-manual", "Medicao", "quantity", 8],
    ["Escada aluminio 7 degraus", "cat-equipment", "Escadas", "individual", 1],
    ["Oculos de protecao", "cat-epi", "Protecao ocular", "quantity", 12],
  ];

  for (const [name, categoryId, subcategory, controlModel, quantity] of examples) {
    createTool({
      name,
      categoryId,
      subcategory,
      controlModel,
      quantity,
      status: "active",
      qrReady: controlModel === "individual",
      notes: "",
    });
  }
}

function addHistory(entityType, entityId, action, description) {
  db.prepare("INSERT INTO history (id, entity_type, entity_id, action, description, created_at) VALUES (?, ?, ?, ?, ?, ?)").run(
    createId("hist"),
    entityType,
    entityId,
    action,
    description,
    new Date().toISOString(),
  );
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (chunks.length === 0) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function sendJson(res, status, data) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(data));
}

function sendText(res, status, text) {
  res.writeHead(status, { "content-type": "text/plain; charset=utf-8" });
  res.end(text);
}

function getContentType(filePath) {
  const ext = extname(filePath);
  return (
    {
      ".html": "text/html; charset=utf-8",
      ".css": "text/css; charset=utf-8",
      ".js": "text/javascript; charset=utf-8",
      ".json": "application/json; charset=utf-8",
    }[ext] || "application/octet-stream"
  );
}

function required(value, label) {
  const normalized = String(value || "").trim();
  if (!normalized) throw new HttpError(400, `${label} e obrigatorio.`);
  return normalized;
}

function createId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function generateInternalCode(name) {
  const prefix = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 3)
    .toUpperCase()
    .padEnd(3, "X");
  return `${prefix}-${String(Date.now()).slice(-6)}-${Math.random().toString(16).slice(2, 4).toUpperCase()}`;
}

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}


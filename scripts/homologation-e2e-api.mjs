/**
 * E2E API — fluxo Wizard (Platform people + Time link + Portal login).
 * Pré-requisito: servidor em http://localhost:4173
 * Executar: node scripts/homologation-e2e-api.mjs
 */
import assert from "node:assert/strict";

const BASE = process.env.MOBI_BASE_URL || "http://localhost:4173";
const suffix = Date.now();

async function req(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "content-type": "application/json", ...(options.headers || {}) },
    credentials: "include",
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data, headers: res.headers };
}

// Admin session — usa bootstrap existente ou falha com instrução
const loginRes = await req("/api/platform/login", {
  method: "POST",
  body: JSON.stringify({
    email: process.env.MOBI_TEST_ADMIN_EMAIL || "admin@moble.tools",
    password: process.env.MOBI_TEST_ADMIN_PASSWORD || "admin123",
  }),
});
if (loginRes.status !== 200) {
  console.error("Login admin falhou. Configure MOBI_TEST_ADMIN_EMAIL/PASSWORD ou bootstrap.");
  console.error(loginRes.data);
  process.exit(1);
}
const adminCookie = loginRes.headers.get("set-cookie") || "";

const email = `homolog.e2e.${suffix}@a1.local`;
const personRes = await req("/api/admin/platform/people", {
  method: "POST",
  headers: { cookie: adminCookie },
  body: JSON.stringify({
    personal: { name: `Homolog E2E ${suffix}`, email, cpf: "", status: "ACTIVE" },
    access: { username: email, password: "SenhaE2E2026!", accessStatus: "ACTIVE" },
    roleIds: ["role-collaborator-a1"],
    applicationIds: [],
  }),
});
assert.equal(personRes.status, 201, `criar pessoa: ${JSON.stringify(personRes.data)}`);
const personId = personRes.data.person.id;

const schedRes = await req("/api/ponto/schedules", { headers: { cookie: adminCookie } });
const scheduleId = schedRes.data.schedules?.[0]?.id;
assert.ok(scheduleId, "precisa de ao menos uma jornada cadastrada");

const linkRes = await req("/api/ponto/time-employees", {
  method: "POST",
  headers: { cookie: adminCookie },
  body: JSON.stringify({ personId, workScheduleId: scheduleId }),
});
assert.equal(linkRes.status, 201, JSON.stringify(linkRes.data));

const blocked = await req("/api/ponto/employees", {
  method: "POST",
  headers: { cookie: adminCookie },
  body: JSON.stringify({ name: "Bloqueado" }),
});
assert.equal(blocked.status, 410);

const collabLogin = await req("/api/platform/login", {
  method: "POST",
  body: JSON.stringify({ email, password: "SenhaE2E2026!" }),
});
assert.equal(collabLogin.status, 200);
const collabCookie = collabLogin.headers.get("set-cookie") || "";

const identity = await req("/api/platform/identity", { headers: { cookie: collabCookie } });
assert.equal(identity.status, 200);
assert.equal(identity.data.person?.id, personId);

const punchStatus = await req("/api/ponto/punch/status", { headers: { cookie: collabCookie } });
assert.equal(punchStatus.status, 200, JSON.stringify(punchStatus.data));

console.log("homologation-e2e-api.mjs — OK");
console.log({ personId, email, employeeId: linkRes.data.employee?.id });

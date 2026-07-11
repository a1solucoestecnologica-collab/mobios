// Cadastro oficial de Pessoas — Platform (identidade, sem regras de negócio de apps).
import { randomBytes, randomUUID, scryptSync } from "node:crypto";

function nowIso() {
  return new Date().toISOString();
}

function createId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function hashPassword(password) {
  const value = String(password || "");
  if (!value) return null;
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(value, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function mapPersonRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    uuid: row.uuid,
    name: row.name,
    socialName: row.social_name || null,
    email: row.email || null,
    phone: row.phone || null,
    mobile: row.mobile || null,
    whatsapp: row.whatsapp || null,
    cpf: row.cpf || null,
    rg: row.rg || null,
    rgIssuer: row.rg_issuer || null,
    birthDate: row.birth_date || null,
    gender: row.gender || null,
    maritalStatus: row.marital_status || null,
    nationality: row.nationality || null,
    birthplace: row.birthplace || null,
    photo: row.photo || null,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function loadAddress(db, personId) {
  const row = db.prepare("SELECT * FROM person_addresses WHERE person_id = ?").get(personId);
  if (!row) return null;
  return {
    cep: row.cep || "",
    street: row.street || "",
    number: row.number || "",
    complement: row.complement || "",
    district: row.district || "",
    city: row.city || "",
    state: row.state || "",
    country: row.country || "Brasil",
  };
}

function loadDocuments(db, personId) {
  const row = db.prepare("SELECT * FROM person_documents WHERE person_id = ?").get(personId);
  if (!row) return null;
  return {
    ctps: row.ctps || "",
    pisPasep: row.pis_pasep || "",
    cnh: row.cnh || "",
    cnhCategory: row.cnh_category || "",
    cnhExpiry: row.cnh_expiry || "",
    voterRegistration: row.voter_registration || "",
    militaryCertificate: row.military_certificate || "",
  };
}

function loadEmployment(db, personId) {
  const row = db
    .prepare(
      `SELECT e.*, d.name AS department_name, m.name AS manager_name
       FROM person_employment e
       LEFT JOIN departments d ON d.id = e.department_id
       LEFT JOIN people m ON m.id = e.manager_person_id
       WHERE e.person_id = ?`,
    )
    .get(personId);
  if (!row) return null;
  return {
    employeeCode: row.employee_code || "",
    company: row.company || "",
    departmentId: row.department_id || null,
    departmentName: row.department_name || null,
    jobTitle: row.job_title || "",
    managerPersonId: row.manager_person_id || null,
    managerName: row.manager_name || null,
    costCenter: row.cost_center || "",
    contractType: row.contract_type || "",
    hiredAt: row.hired_at || "",
    terminatedAt: row.terminated_at || "",
    employmentStatus: row.employment_status || "ACTIVE",
  };
}

function loadAccess(db, personId) {
  const row = db.prepare("SELECT * FROM person_access WHERE person_id = ?").get(personId);
  if (!row) return null;
  return {
    username: row.username || "",
    accessStatus: row.access_status || "ACTIVE",
    mfaEnabled: Boolean(row.mfa_enabled),
    lastAccessAt: row.last_access_at || null,
    hasPassword: Boolean(row.password_hash),
  };
}

function loadApplicationIds(db, personId) {
  return db
    .prepare("SELECT application_id AS applicationId FROM person_applications WHERE person_id = ?")
    .all(personId)
    .map((r) => r.applicationId);
}

function loadRoleIds(db, personId) {
  return db
    .prepare("SELECT role_id AS roleId FROM person_roles WHERE person_id = ?")
    .all(personId)
    .map((r) => r.roleId);
}

function loadAttachments(db, personId) {
  return db
    .prepare(
      `SELECT id, category, label, file_name AS fileName, file_path AS filePath, created_at AS createdAt
       FROM person_attachments WHERE person_id = ? ORDER BY created_at DESC`,
    )
    .all(personId);
}

export function getPersonProfile(db, personId) {
  const row = db.prepare("SELECT * FROM people WHERE id = ?").get(personId);
  if (!row) return null;
  return {
    ...mapPersonRow(row),
    address: loadAddress(db, personId) || {},
    documents: loadDocuments(db, personId) || {},
    employment: loadEmployment(db, personId) || {},
    access: loadAccess(db, personId) || { username: "", accessStatus: "ACTIVE", mfaEnabled: false },
    applicationIds: loadApplicationIds(db, personId),
    roleIds: loadRoleIds(db, personId),
    attachments: loadAttachments(db, personId),
  };
}

function upsertAddress(db, personId, address, now) {
  const a = address || {};
  const exists = db.prepare("SELECT person_id FROM person_addresses WHERE person_id = ?").get(personId);
  if (exists) {
    db.prepare(
      `UPDATE person_addresses SET cep=?, street=?, number=?, complement=?, district=?, city=?, state=?, country=?, updated_at=? WHERE person_id=?`,
    ).run(a.cep || "", a.street || "", a.number || "", a.complement || "", a.district || "", a.city || "", a.state || "", a.country || "Brasil", now, personId);
  } else {
    db.prepare(
      `INSERT INTO person_addresses (person_id, cep, street, number, complement, district, city, state, country, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(personId, a.cep || "", a.street || "", a.number || "", a.complement || "", a.district || "", a.city || "", a.state || "", a.country || "Brasil", now);
  }
}

function upsertDocuments(db, personId, documents, now) {
  const d = documents || {};
  const exists = db.prepare("SELECT person_id FROM person_documents WHERE person_id = ?").get(personId);
  const vals = [d.ctps || "", d.pisPasep || "", d.cnh || "", d.cnhCategory || "", d.cnhExpiry || "", d.voterRegistration || "", d.militaryCertificate || ""];
  if (exists) {
    db.prepare(
      `UPDATE person_documents SET ctps=?, pis_pasep=?, cnh=?, cnh_category=?, cnh_expiry=?, voter_registration=?, military_certificate=?, updated_at=? WHERE person_id=?`,
    ).run(...vals, now, personId);
  } else {
    db.prepare(
      `INSERT INTO person_documents (person_id, ctps, pis_pasep, cnh, cnh_category, cnh_expiry, voter_registration, military_certificate, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(personId, ...vals, now);
  }
}

function upsertEmployment(db, personId, employment, now) {
  const e = employment || {};
  const exists = db.prepare("SELECT person_id FROM person_employment WHERE person_id = ?").get(personId);
  const vals = [
    e.employeeCode || "", e.company || "", e.departmentId || null, e.jobTitle || "",
    e.managerPersonId || null, e.costCenter || "", e.contractType || "",
    e.hiredAt || "", e.terminatedAt || "", e.employmentStatus || "ACTIVE",
  ];
  if (exists) {
    db.prepare(
      `UPDATE person_employment SET employee_code=?, company=?, department_id=?, job_title=?, manager_person_id=?,
       cost_center=?, contract_type=?, hired_at=?, terminated_at=?, employment_status=?, updated_at=? WHERE person_id=?`,
    ).run(...vals, now, personId);
  } else {
    db.prepare(
      `INSERT INTO person_employment (person_id, employee_code, company, department_id, job_title, manager_person_id,
       cost_center, contract_type, hired_at, terminated_at, employment_status, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(personId, ...vals, now);
  }
}

function upsertAccess(db, personId, access, now) {
  const a = access || {};
  const exists = db.prepare("SELECT person_id, password_hash FROM person_access WHERE person_id = ?").get(personId);
  let passwordHash = exists?.password_hash || null;
  if (a.password) passwordHash = hashPassword(a.password);
  if (exists) {
    db.prepare(
      `UPDATE person_access SET username=?, password_hash=?, access_status=?, mfa_enabled=?, updated_at=? WHERE person_id=?`,
    ).run(a.username || null, passwordHash, a.accessStatus || "ACTIVE", a.mfaEnabled ? 1 : 0, now, personId);
  } else {
    db.prepare(
      `INSERT INTO person_access (person_id, username, password_hash, access_status, mfa_enabled, last_access_at, updated_at)
       VALUES (?, ?, ?, ?, ?, NULL, ?)`,
    ).run(personId, a.username || null, passwordHash, a.accessStatus || "ACTIVE", a.mfaEnabled ? 1 : 0, now);
  }
}

function syncApplications(db, personId, applicationIds, now) {
  db.prepare("DELETE FROM person_applications WHERE person_id = ?").run(personId);
  const insert = db.prepare(
    "INSERT INTO person_applications (person_id, application_id, created_at) VALUES (?, ?, ?)",
  );
  for (const appId of applicationIds || []) {
    const app = db.prepare("SELECT id FROM applications WHERE id = ?").get(appId);
    if (app) insert.run(personId, appId, now);
  }
}

function syncRoles(db, personId, roleIds, now) {
  db.prepare("DELETE FROM person_roles WHERE person_id = ?").run(personId);
  const insert = db.prepare("INSERT INTO person_roles (person_id, role_id, created_at) VALUES (?, ?, ?)");
  for (const roleId of roleIds || []) {
    const role = db.prepare("SELECT id FROM roles WHERE id = ?").get(roleId);
    if (role) insert.run(personId, roleId, now);
  }
}

function savePersonSections(db, personId, body, now) {
  if (body.address) upsertAddress(db, personId, body.address, now);
  if (body.documents) upsertDocuments(db, personId, body.documents, now);
  if (body.employment) upsertEmployment(db, personId, body.employment, now);
  if (body.access) upsertAccess(db, personId, body.access, now);
  if (body.applicationIds) syncApplications(db, personId, body.applicationIds, now);
  if (body.roleIds) syncRoles(db, personId, body.roleIds, now);
}

export function createPersonProfile(db, body) {
  const now = nowIso();
  const id = createId("person");
  const personal = body.personal || body;
  const name = String(personal.name || "").trim();
  if (!name) {
    const error = new Error("Nome completo é obrigatório.");
    error.status = 400;
    throw error;
  }

  db.prepare(
    `INSERT INTO people (id, uuid, name, social_name, email, phone, mobile, whatsapp, cpf, rg, rg_issuer,
     birth_date, gender, marital_status, nationality, birthplace, photo, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id, randomUUID(), name,
    personal.socialName || null, personal.email || null, personal.phone || null,
    personal.mobile || null, personal.whatsapp || null, personal.cpf || null,
    personal.rg || null, personal.rgIssuer || null, personal.birthDate || null,
    personal.gender || null, personal.maritalStatus || null, personal.nationality || null,
    personal.birthplace || null, personal.photo || null,
    personal.status || "ACTIVE", now, now,
  );

  savePersonSections(db, id, body, now);
  return getPersonProfile(db, id);
}

export function updatePersonProfile(db, personId, body) {
  const existing = db.prepare("SELECT id FROM people WHERE id = ?").get(personId);
  if (!existing) {
    const error = new Error("Pessoa não encontrada.");
    error.status = 404;
    throw error;
  }

  const now = nowIso();
  const personal = body.personal || body;
  if (personal.name !== undefined) {
    db.prepare(
      `UPDATE people SET name=?, social_name=?, email=?, phone=?, mobile=?, whatsapp=?, cpf=?, rg=?, rg_issuer=?,
       birth_date=?, gender=?, marital_status=?, nationality=?, birthplace=?, photo=?, status=?, updated_at=? WHERE id=?`,
    ).run(
      String(personal.name || "").trim(),
      personal.socialName || null, personal.email || null, personal.phone || null,
      personal.mobile || null, personal.whatsapp || null, personal.cpf || null,
      personal.rg || null, personal.rgIssuer || null, personal.birthDate || null,
      personal.gender || null, personal.maritalStatus || null, personal.nationality || null,
      personal.birthplace || null, personal.photo || null,
      personal.status || "ACTIVE", now, personId,
    );
  }

  savePersonSections(db, personId, body, now);
  return getPersonProfile(db, personId);
}

export function deletePersonProfile(db, personId) {
  if (personId === "person-platform-default") {
    const error = new Error("A pessoa padrão do sistema não pode ser excluída.");
    error.status = 400;
    throw error;
  }
  const result = db.prepare("DELETE FROM people WHERE id = ?").run(personId);
  return result.changes > 0;
}

export function addPersonAttachment(db, personId, { category, label, fileName, filePath }) {
  const person = db.prepare("SELECT id FROM people WHERE id = ?").get(personId);
  if (!person) {
    const error = new Error("Pessoa não encontrada.");
    error.status = 404;
    throw error;
  }
  const id = createId("attach");
  const now = nowIso();
  db.prepare(
    `INSERT INTO person_attachments (id, person_id, category, label, file_name, file_path, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(id, personId, String(category || "outros").trim(), label || "", fileName || "", filePath || "", now);
  return { id, category, label, fileName, filePath, createdAt: now };
}

export function removePersonAttachment(db, personId, attachmentId) {
  const result = db
    .prepare("DELETE FROM person_attachments WHERE id = ? AND person_id = ?")
    .run(attachmentId, personId);
  return result.changes > 0;
}
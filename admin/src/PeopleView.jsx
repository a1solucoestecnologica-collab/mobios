import { useCallback, useEffect, useState } from "react";
import { useTopbarActions } from "./topbar.js";
import { adminApi } from "./api.js";

const TABS = [
  { id: "personal", label: "Dados Pessoais" },
  { id: "contact", label: "Contato" },
  { id: "address", label: "Endereço" },
  { id: "documents", label: "Documentos" },
  { id: "employment", label: "Corporativo" },
  { id: "access", label: "Acesso" },
  { id: "applications", label: "Aplicativos" },
  { id: "roles", label: "Funções" },
  { id: "attachments", label: "Anexos" },
];

const GENDER_OPTIONS = ["", "Masculino", "Feminino", "Outro", "Prefiro não informar"];
const MARITAL_OPTIONS = ["", "Solteiro(a)", "Casado(a)", "Divorciado(a)", "Viúvo(a)", "União estável"];
const EMPLOYMENT_STATUS = [
  { value: "ACTIVE", label: "Ativo" },
  { value: "INACTIVE", label: "Inativo" },
  { value: "ON_LEAVE", label: "Afastado" },
  { value: "TERMINATED", label: "Desligado" },
];
const CONTRACT_TYPES = ["", "CLT", "PJ", "Estágio", "Temporário", "Aprendiz"];
const ACCESS_STATUS = [
  { value: "ACTIVE", label: "Ativo" },
  { value: "INACTIVE", label: "Inativo" },
  { value: "BLOCKED", label: "Bloqueado" },
];
const ATTACHMENT_CATEGORIES = ["RG", "CPF", "Contrato", "ASO", "Exames", "Certificados", "Outros"];

function emptyForm() {
  return {
    name: "",
    socialName: "",
    email: "",
    phone: "",
    mobile: "",
    whatsapp: "",
    cpf: "",
    rg: "",
    rgIssuer: "",
    birthDate: "",
    gender: "",
    maritalStatus: "",
    nationality: "Brasil",
    birthplace: "",
    photo: "",
    status: "ACTIVE",
    address: { cep: "", street: "", number: "", complement: "", district: "", city: "", state: "", country: "Brasil" },
    documents: {
      ctps: "",
      pisPasep: "",
      cnh: "",
      cnhCategory: "",
      cnhExpiry: "",
      voterRegistration: "",
      militaryCertificate: "",
    },
    employment: {
      employeeCode: "",
      company: "",
      departmentId: "",
      jobTitle: "",
      managerPersonId: "",
      costCenter: "",
      contractType: "",
      hiredAt: "",
      terminatedAt: "",
      employmentStatus: "ACTIVE",
    },
    access: { username: "", password: "", accessStatus: "ACTIVE", mfaEnabled: false, lastAccessAt: null, hasPassword: false },
    applicationIds: [],
    roleIds: [],
    attachments: [],
  };
}

function personToForm(person) {
  if (!person) return emptyForm();
  return {
    id: person.id,
    name: person.name || "",
    socialName: person.socialName || "",
    email: person.email || "",
    phone: person.phone || "",
    mobile: person.mobile || "",
    whatsapp: person.whatsapp || "",
    cpf: person.cpf || "",
    rg: person.rg || "",
    rgIssuer: person.rgIssuer || "",
    birthDate: person.birthDate || "",
    gender: person.gender || "",
    maritalStatus: person.maritalStatus || "",
    nationality: person.nationality || "Brasil",
    birthplace: person.birthplace || "",
    photo: person.photo || "",
    status: person.status || "ACTIVE",
    address: { ...emptyForm().address, ...(person.address || {}) },
    documents: { ...emptyForm().documents, ...(person.documents || {}) },
    employment: {
      ...emptyForm().employment,
      ...(person.employment || {}),
      departmentId: person.employment?.departmentId || "",
      managerPersonId: person.employment?.managerPersonId || "",
    },
    access: {
      username: person.access?.username || "",
      password: "",
      accessStatus: person.access?.accessStatus || "ACTIVE",
      mfaEnabled: Boolean(person.access?.mfaEnabled),
      lastAccessAt: person.access?.lastAccessAt || null,
      hasPassword: Boolean(person.access?.hasPassword),
    },
    applicationIds: person.applicationIds || [],
    roleIds: person.roleIds || [],
    attachments: person.attachments || [],
  };
}

function formToPayload(form) {
  return {
    personal: {
      name: form.name,
      socialName: form.socialName,
      email: form.email,
      phone: form.phone,
      mobile: form.mobile,
      whatsapp: form.whatsapp,
      cpf: form.cpf,
      rg: form.rg,
      rgIssuer: form.rgIssuer,
      birthDate: form.birthDate,
      gender: form.gender,
      maritalStatus: form.maritalStatus,
      nationality: form.nationality,
      birthplace: form.birthplace,
      photo: form.photo,
      status: form.status,
    },
    address: form.address,
    documents: form.documents,
    employment: {
      ...form.employment,
      departmentId: form.employment.departmentId || null,
      managerPersonId: form.employment.managerPersonId || null,
    },
    access: {
      username: form.access.username,
      password: form.access.password || undefined,
      accessStatus: form.access.accessStatus,
      mfaEnabled: form.access.mfaEnabled,
    },
    applicationIds: form.applicationIds,
    roleIds: form.roleIds,
  };
}

function Field({ label, className = "", children }) {
  return (
    <label className={className}>
      {label}
      {children}
    </label>
  );
}

function TabPersonal({ form, setForm }) {
  function onPhotoFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setForm((f) => ({ ...f, photo: String(reader.result || "") }));
    reader.readAsDataURL(file);
  }

  return (
    <div className="form-grid">
      <div className="full photo-input-group">
        <span>Foto</span>
        {form.photo ? (
          <img src={form.photo} alt="" className="admin-people-photo-preview" />
        ) : (
          <div className="admin-people-photo-placeholder">Sem foto</div>
        )}
        <div className="photo-actions">
          <input type="file" accept="image/*" onChange={onPhotoFile} />
          {form.photo && (
            <button type="button" className="button ghost" onClick={() => setForm((f) => ({ ...f, photo: "" }))}>
              Remover
            </button>
          )}
        </div>
      </div>
      <Field label="Nome completo *">
        <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
      </Field>
      <Field label="Nome social">
        <input className="input" value={form.socialName} onChange={(e) => setForm({ ...form, socialName: e.target.value })} />
      </Field>
      <Field label="CPF">
        <input className="input" value={form.cpf} onChange={(e) => setForm({ ...form, cpf: e.target.value })} />
      </Field>
      <Field label="RG">
        <input className="input" value={form.rg} onChange={(e) => setForm({ ...form, rg: e.target.value })} />
      </Field>
      <Field label="Órgão emissor">
        <input className="input" value={form.rgIssuer} onChange={(e) => setForm({ ...form, rgIssuer: e.target.value })} />
      </Field>
      <Field label="Data de nascimento">
        <input type="date" className="input" value={form.birthDate} onChange={(e) => setForm({ ...form, birthDate: e.target.value })} />
      </Field>
      <Field label="Sexo">
        <select className="input" value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
          {GENDER_OPTIONS.map((o) => (
            <option key={o || "empty"} value={o}>{o || "Selecione"}</option>
          ))}
        </select>
      </Field>
      <Field label="Estado civil">
        <select className="input" value={form.maritalStatus} onChange={(e) => setForm({ ...form, maritalStatus: e.target.value })}>
          {MARITAL_OPTIONS.map((o) => (
            <option key={o || "empty"} value={o}>{o || "Selecione"}</option>
          ))}
        </select>
      </Field>
      <Field label="Nacionalidade">
        <input className="input" value={form.nationality} onChange={(e) => setForm({ ...form, nationality: e.target.value })} />
      </Field>
      <Field label="Naturalidade">
        <input className="input" value={form.birthplace} onChange={(e) => setForm({ ...form, birthplace: e.target.value })} />
      </Field>
      <Field label="Status do cadastro">
        <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
          <option value="ACTIVE">Ativo</option>
          <option value="INACTIVE">Inativo</option>
        </select>
      </Field>
    </div>
  );
}

function TabContact({ form, setForm }) {
  return (
    <div className="form-grid">
      <Field label="E-mail" className="full">
        <input type="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
      </Field>
      <Field label="Telefone">
        <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
      </Field>
      <Field label="Celular">
        <input className="input" value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} />
      </Field>
      <Field label="WhatsApp">
        <input className="input" value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} />
      </Field>
    </div>
  );
}

function TabAddress({ form, setForm }) {
  const a = form.address;
  const setA = (patch) => setForm({ ...form, address: { ...a, ...patch } });
  return (
    <div className="form-grid">
      <Field label="CEP">
        <input className="input" value={a.cep} onChange={(e) => setA({ cep: e.target.value })} />
      </Field>
      <Field label="Rua" className="full">
        <input className="input" value={a.street} onChange={(e) => setA({ street: e.target.value })} />
      </Field>
      <Field label="Número">
        <input className="input" value={a.number} onChange={(e) => setA({ number: e.target.value })} />
      </Field>
      <Field label="Complemento">
        <input className="input" value={a.complement} onChange={(e) => setA({ complement: e.target.value })} />
      </Field>
      <Field label="Bairro">
        <input className="input" value={a.district} onChange={(e) => setA({ district: e.target.value })} />
      </Field>
      <Field label="Cidade">
        <input className="input" value={a.city} onChange={(e) => setA({ city: e.target.value })} />
      </Field>
      <Field label="Estado">
        <input className="input" value={a.state} onChange={(e) => setA({ state: e.target.value })} />
      </Field>
      <Field label="País">
        <input className="input" value={a.country} onChange={(e) => setA({ country: e.target.value })} />
      </Field>
    </div>
  );
}

function TabDocuments({ form, setForm }) {
  const d = form.documents;
  const setD = (patch) => setForm({ ...form, documents: { ...d, ...patch } });
  return (
    <div className="form-grid">
      <Field label="CTPS">
        <input className="input" value={d.ctps} onChange={(e) => setD({ ctps: e.target.value })} />
      </Field>
      <Field label="PIS/PASEP">
        <input className="input" value={d.pisPasep} onChange={(e) => setD({ pisPasep: e.target.value })} />
      </Field>
      <Field label="CNH">
        <input className="input" value={d.cnh} onChange={(e) => setD({ cnh: e.target.value })} />
      </Field>
      <Field label="Categoria CNH">
        <input className="input" value={d.cnhCategory} onChange={(e) => setD({ cnhCategory: e.target.value })} />
      </Field>
      <Field label="Validade CNH">
        <input type="date" className="input" value={d.cnhExpiry} onChange={(e) => setD({ cnhExpiry: e.target.value })} />
      </Field>
      <Field label="Título de eleitor">
        <input className="input" value={d.voterRegistration} onChange={(e) => setD({ voterRegistration: e.target.value })} />
      </Field>
      <Field label="Certificado militar">
        <input className="input" value={d.militaryCertificate} onChange={(e) => setD({ militaryCertificate: e.target.value })} />
      </Field>
    </div>
  );
}

function TabEmployment({ form, setForm, departments, people }) {
  const e = form.employment;
  const setE = (patch) => setForm({ ...form, employment: { ...e, ...patch } });
  return (
    <div className="form-grid">
      <Field label="Matrícula">
        <input className="input" value={e.employeeCode} onChange={(ev) => setE({ employeeCode: ev.target.value })} />
      </Field>
      <Field label="Empresa">
        <input className="input" value={e.company} onChange={(ev) => setE({ company: ev.target.value })} />
      </Field>
      <Field label="Departamento">
        <select className="input" value={e.departmentId} onChange={(ev) => setE({ departmentId: ev.target.value })}>
          <option value="">Selecione</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
      </Field>
      <Field label="Cargo">
        <input className="input" value={e.jobTitle} onChange={(ev) => setE({ jobTitle: ev.target.value })} />
      </Field>
      <Field label="Gestor">
        <select className="input" value={e.managerPersonId} onChange={(ev) => setE({ managerPersonId: ev.target.value })}>
          <option value="">Nenhum</option>
          {people.filter((p) => p.id !== form.id).map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </Field>
      <Field label="Centro de custo">
        <input className="input" value={e.costCenter} onChange={(ev) => setE({ costCenter: ev.target.value })} />
      </Field>
      <Field label="Tipo de contrato">
        <select className="input" value={e.contractType} onChange={(ev) => setE({ contractType: ev.target.value })}>
          {CONTRACT_TYPES.map((t) => (
            <option key={t || "empty"} value={t}>{t || "Selecione"}</option>
          ))}
        </select>
      </Field>
      <Field label="Data de admissão">
        <input type="date" className="input" value={e.hiredAt} onChange={(ev) => setE({ hiredAt: ev.target.value })} />
      </Field>
      <Field label="Data de desligamento">
        <input type="date" className="input" value={e.terminatedAt} onChange={(ev) => setE({ terminatedAt: ev.target.value })} />
      </Field>
      <Field label="Status do colaborador">
        <select className="input" value={e.employmentStatus} onChange={(ev) => setE({ employmentStatus: ev.target.value })}>
          {EMPLOYMENT_STATUS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </Field>
    </div>
  );
}

function TabAccess({ form, setForm }) {
  const a = form.access;
  const setA = (patch) => setForm({ ...form, access: { ...a, ...patch } });
  return (
    <div className="form-grid">
      <Field label="Usuário">
        <input className="input" value={a.username} onChange={(e) => setA({ username: e.target.value })} autoComplete="off" />
      </Field>
      <Field label={a.hasPassword ? "Nova senha (deixe em branco para manter)" : "Senha"}>
        <input
          type="password"
          className="input"
          value={a.password}
          onChange={(e) => setA({ password: e.target.value })}
          autoComplete="new-password"
        />
      </Field>
      <Field label="Status de acesso">
        <select className="input" value={a.accessStatus} onChange={(e) => setA({ accessStatus: e.target.value })}>
          {ACCESS_STATUS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </Field>
      <label className="admin-people-check full">
        <input type="checkbox" checked={a.mfaEnabled} onChange={(e) => setA({ mfaEnabled: e.target.checked })} />
        <span>Autenticação em dois fatores (MFA)</span>
      </label>
      {a.lastAccessAt && (
        <p className="full admin-people-meta">Último acesso: {new Date(a.lastAccessAt).toLocaleString("pt-BR")}</p>
      )}
    </div>
  );
}

function TabApplications({ form, setForm, applications }) {
  function toggle(appId) {
    const ids = new Set(form.applicationIds);
    if (ids.has(appId)) ids.delete(appId);
    else ids.add(appId);
    setForm({ ...form, applicationIds: [...ids] });
  }

  return (
    <div className="admin-people-checklist">
      <p className="admin-people-hint">Selecione os aplicativos que esta pessoa poderá acessar na plataforma.</p>
      {applications.length === 0 ? (
        <p>Nenhum aplicativo cadastrado.</p>
      ) : (
        applications.map((app) => (
          <label key={app.id} className="admin-people-check">
            <input
              type="checkbox"
              checked={form.applicationIds.includes(app.id)}
              onChange={() => toggle(app.id)}
            />
            <span className="admin-people-check-text">
              <strong>{app.name}</strong>
              {app.description && <small>{app.description}</small>}
            </span>
          </label>
        ))
      )}
    </div>
  );
}

function TabRoles({ form, setForm, roles }) {
  function toggle(roleId) {
    const ids = new Set(form.roleIds);
    if (ids.has(roleId)) ids.delete(roleId);
    else ids.add(roleId);
    setForm({ ...form, roleIds: [...ids] });
  }

  return (
    <div className="admin-people-checklist">
      <p className="admin-people-hint">As permissões são herdadas das funções selecionadas.</p>
      {roles.map((role) => (
        <label key={role.id} className="admin-people-check">
          <input type="checkbox" checked={form.roleIds.includes(role.id)} onChange={() => toggle(role.id)} />
          <span className="admin-people-check-text">
            <strong>{role.name}</strong>
            {role.description && <small>{role.description}</small>}
          </span>
        </label>
      ))}
    </div>
  );
}

function TabAttachments({ form, setForm, personId, onReload }) {
  const [attachForm, setAttachForm] = useState({ category: "Outros", label: "", fileName: "", filePath: "" });
  const [error, setError] = useState("");

  async function addAttachment(e) {
    e.preventDefault();
    if (!personId) {
      setError("Salve a pessoa antes de adicionar anexos.");
      return;
    }
    setError("");
    try {
      await adminApi.people.addAttachment(personId, attachForm);
      setAttachForm({ category: "Outros", label: "", fileName: "", filePath: "" });
      onReload();
    } catch (err) {
      setError(err.message);
    }
  }

  async function removeAttachment(id) {
    if (!window.confirm("Remover este anexo?")) return;
    try {
      await adminApi.people.removeAttachment(personId, id);
      onReload();
    } catch (err) {
      setError(err.message);
    }
  }

  function onFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setAttachForm((f) => ({
        ...f,
        fileName: file.name,
        filePath: String(reader.result || ""),
        label: f.label || file.name,
      }));
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="admin-people-attachments">
      {!personId && (
        <p className="admin-people-hint">Salve o cadastro para registrar anexos.</p>
      )}
      {error && <p className="admin-error">{error}</p>}
      <ul className="admin-people-attach-list">
        {form.attachments.length === 0 ? (
          <li className="admin-people-attach-empty">Nenhum anexo.</li>
        ) : (
          form.attachments.map((att) => (
            <li key={att.id} className="admin-people-attach-item">
              <div>
                <strong>{att.label || att.fileName}</strong>
                <small>{att.category} · {att.fileName}</small>
              </div>
              {personId && (
                <button type="button" className="button ghost" onClick={() => removeAttachment(att.id)}>Remover</button>
              )}
            </li>
          ))
        )}
      </ul>
      <form className="form-grid admin-people-attach-form" onSubmit={addAttachment}>
        <Field label="Categoria">
          <select className="input" value={attachForm.category} onChange={(e) => setAttachForm({ ...attachForm, category: e.target.value })}>
            {ATTACHMENT_CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </Field>
        <Field label="Descrição">
          <input className="input" value={attachForm.label} onChange={(e) => setAttachForm({ ...attachForm, label: e.target.value })} />
        </Field>
        <Field label="Arquivo" className="full">
          <input type="file" onChange={onFile} disabled={!personId} />
        </Field>
        <div className="full">
          <button type="submit" className="button primary" disabled={!personId || !attachForm.filePath}>Adicionar anexo</button>
        </div>
      </form>
    </div>
  );
}

export function PeopleView({ onOpenWizard, initialPersonId }) {
  const [people, setPeople] = useState([]);
  const [roles, setRoles] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [applications, setApplications] = useState([]);
  const [form, setForm] = useState(null);
  const [activeTab, setActiveTab] = useState("personal");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      adminApi.people.list(),
      adminApi.platformRoles.list(),
      adminApi.departments.list(),
      adminApi.applications(),
    ])
      .then(([p, r, d, a]) => {
        setPeople(p.people);
        setRoles(r.roles);
        setDepartments(d.departments);
        setApplications(a.applications || []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!initialPersonId) return;
    adminApi.people.get(initialPersonId).then(({ person }) => {
      setForm(personToForm(person));
      setActiveTab("personal");
    }).catch((err) => setError(err.message));
  }, [initialPersonId]);

  async function reloadPerson(id) {
    const { person } = await adminApi.people.get(id);
    setForm(personToForm(person));
  }

  useTopbarActions(
    <button type="button" className="button primary" onClick={() => (onOpenWizard ? onOpenWizard() : (setForm(emptyForm()), setActiveTab("personal")))}>
      Novo Colaborador
    </button>,
    [onOpenWizard],
  );

  async function save(e) {
    e.preventDefault();
    setError("");
    if (!form.name.trim()) {
      setError("Nome completo é obrigatório.");
      setActiveTab("personal");
      return;
    }
    try {
      const payload = formToPayload(form);
      if (form.id) {
        await adminApi.people.update(form.id, payload);
        await reloadPerson(form.id);
      } else {
        const { person } = await adminApi.people.create(payload);
        setForm(personToForm(person));
      }
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function removePerson(id) {
    if (!window.confirm("Excluir esta pessoa do cadastro oficial?")) return;
    setError("");
    try {
      await adminApi.people.remove(id);
      setForm(null);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function openEdit(id) {
    setError("");
    try {
      const { person } = await adminApi.people.get(id);
      setForm(personToForm(person));
      setActiveTab("personal");
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading && !form) return <p>Carregando...</p>;

  return (
    <>
      <section className="panel">
        {error && !form && <p className="admin-error admin-panel-msg">{error}</p>}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>E-mail</th>
                <th>Matrícula</th>
                <th>Departamento</th>
                <th>Cargo</th>
                <th>Status</th>
                <th className="actions-col">Ações</th>
              </tr>
            </thead>
            <tbody>
              {people.length === 0 ? (
                <tr><td colSpan={7}>Nenhuma pessoa cadastrada.</td></tr>
              ) : (
                people.map((person) => (
                  <tr key={person.id}>
                    <td>{person.name}</td>
                    <td>{person.email || "—"}</td>
                    <td>{person.employeeCode || "—"}</td>
                    <td>{person.departmentName || "—"}</td>
                    <td>{person.jobTitle || "—"}</td>
                    <td>
                      <span className={`status-pill ${person.status === "ACTIVE" ? "ok" : "muted"}`}>
                        {person.employmentStatus === "TERMINATED" ? "Desligado" : person.status === "ACTIVE" ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                    <td>
                      <button type="button" className="button ghost" onClick={() => openEdit(person.id)}>Editar</button>
                      {person.id !== "person-platform-default" && (
                        <>
                          {" "}
                          <button type="button" className="button ghost" onClick={() => removePerson(person.id)}>Excluir</button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {form && (
        <dialog className="modal admin-people-modal" open>
          <form className="modal-card admin-people-card" onSubmit={save}>
            <div className="modal-header">
              <div>
                <h2>{form.id ? "Editar pessoa" : "Nova pessoa"}</h2>
                <p className="admin-people-modal-sub">Cadastro oficial da Platform — identidade e vínculos, sem regras de apps.</p>
              </div>
              <button type="button" className="icon-button" onClick={() => setForm(null)}>×</button>
            </div>

            {error && <p className="admin-error admin-panel-msg">{error}</p>}

            <nav className="admin-people-tabs" aria-label="Seções do cadastro">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  className={`admin-people-tab ${activeTab === tab.id ? "is-active" : ""}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </nav>

            <div className="admin-people-tab-panel">
              {activeTab === "personal" && <TabPersonal form={form} setForm={setForm} />}
              {activeTab === "contact" && <TabContact form={form} setForm={setForm} />}
              {activeTab === "address" && <TabAddress form={form} setForm={setForm} />}
              {activeTab === "documents" && <TabDocuments form={form} setForm={setForm} />}
              {activeTab === "employment" && (
                <TabEmployment form={form} setForm={setForm} departments={departments} people={people} />
              )}
              {activeTab === "access" && <TabAccess form={form} setForm={setForm} />}
              {activeTab === "applications" && (
                <TabApplications form={form} setForm={setForm} applications={applications} />
              )}
              {activeTab === "roles" && <TabRoles form={form} setForm={setForm} roles={roles} />}
              {activeTab === "attachments" && (
                <TabAttachments
                  form={form}
                  setForm={setForm}
                  personId={form.id}
                  onReload={() => reloadPerson(form.id)}
                />
              )}
            </div>

            <div className="modal-actions">
              <button type="button" className="button ghost" onClick={() => setForm(null)}>Cancelar</button>
              <button type="submit" className="button primary">Salvar</button>
            </div>
          </form>
        </dialog>
      )}
    </>
  );
}

import { useEffect, useMemo, useState } from "react";
import { adminApi } from "./api.js";
import {
  ACCESS_STATUS,
  APP_CONFIG_SLUGS,
  CONTRACT_TYPES,
  EMPLOYMENT_STATUS,
  GENDER_OPTIONS,
  MARITAL_OPTIONS,
  WIZARD_STEPS,
  emptyCollaboratorForm,
  formToPeoplePayload,
} from "./peopleFormShared.js";

function Field({ label, className = "", children }) {
  return <label className={className}>{label}{children}</label>;
}

export default function CollaboratorWizard({ onDone, onCancel }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [form, setForm] = useState(emptyCollaboratorForm);
  const [roles, setRoles] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [applications, setApplications] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [shiftPlans, setShiftPlans] = useState([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(null);

  useEffect(() => {
    Promise.all([
      adminApi.platformRoles.list(),
      adminApi.departments.list(),
      adminApi.applications(),
      fetch("/api/ponto/schedules", { credentials: "same-origin" }).then((r) => r.json()),
      fetch("/api/ponto/shift-plans", { credentials: "same-origin" }).then((r) => r.json()),
    ])
      .then(([r, d, a, sch, sp]) => {
        setRoles(r.roles || []);
        setDepartments(d.departments || []);
        setApplications(a.applications || []);
        setSchedules(sch.schedules || []);
        setShiftPlans(sp.plans || []);
      })
      .catch((e) => setError(e.message));
  }, []);

  const selectedApps = useMemo(
    () => applications.filter((app) => form.applicationIds.includes(app.id)),
    [applications, form.applicationIds],
  );

  const appConfigSteps = useMemo(() => {
    const steps = [];
    for (const app of selectedApps) {
      const meta = APP_CONFIG_SLUGS[app.slug];
      if (meta?.stepId === "app-time") steps.push({ id: "app-time", label: `Configuração — ${meta.label}`, app });
    }
    return steps;
  }, [selectedApps]);

  const allSteps = useMemo(() => [...WIZARD_STEPS, ...appConfigSteps, { id: "finish", label: "Finalizar" }], [appConfigSteps]);
  const current = allSteps[stepIndex];

  function next() {
    if (current.id === "personal" && !form.name.trim()) {
      setError("Nome completo é obrigatório.");
      return;
    }
    if (current.id === "access" && !form.access.password) {
      setError("Defina uma senha inicial.");
      return;
    }
    setError("");
    setStepIndex((i) => Math.min(i + 1, allSteps.length - 1));
  }

  function back() {
    setError("");
    setStepIndex((i) => Math.max(i - 1, 0));
  }

  async function finish() {
    setSaving(true);
    setError("");
    try {
      const { person } = await adminApi.people.create(formToPeoplePayload(form));
      const timeApp = selectedApps.find((a) => a.slug === "time");
      if (timeApp) {
        await adminApi.timeEmployees.link({
          personId: person.id,
          workScheduleId: form.timeConfig.workScheduleId || null,
          shiftPlanId: form.timeConfig.shiftPlanId || null,
          operationalStatus: form.timeConfig.operationalStatus,
        });
      }
      setDone({ person });
      onDone?.(person);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (done) {
    return (
      <section className="panel admin-wizard">
        <h2>Colaborador pronto para utilização</h2>
        <p><strong>{done.person.name}</strong> cadastrado na Plataforma.</p>
        {selectedApps.some((a) => a.slug === "time") && <p>Vínculo operacional do MÖBI Time configurado.</p>}
        <div className="modal-actions">
          <button type="button" className="button primary" onClick={() => onDone?.(done.person, true)}>Concluir</button>
        </div>
      </section>
    );
  }

  return (
    <section className="panel admin-wizard">
      <header className="admin-wizard-header">
        <div>
          <h2>Novo Colaborador</h2>
          <p className="admin-people-modal-sub">Wizard oficial da Plataforma — identidade e configuração dos aplicativos.</p>
        </div>
        <button type="button" className="button ghost" onClick={onCancel}>Cancelar</button>
      </header>

      <ol className="admin-wizard-steps">
        {allSteps.map((s, i) => (
          <li key={s.id} className={i === stepIndex ? "is-active" : i < stepIndex ? "is-done" : ""}>{s.label}</li>
        ))}
      </ol>

      {error && <p className="admin-error">{error}</p>}

      <div className="admin-people-tab-panel">
        {current.id === "personal" && (
          <div className="form-grid">
            <Field label="Nome completo *" className="full">
              <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <Field label="CPF"><input className="input" value={form.cpf} onChange={(e) => setForm({ ...form, cpf: e.target.value })} /></Field>
            <Field label="Data de nascimento"><input type="date" className="input" value={form.birthDate} onChange={(e) => setForm({ ...form, birthDate: e.target.value })} /></Field>
            <Field label="Sexo">
              <select className="input" value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
                {GENDER_OPTIONS.map((o) => <option key={o || "e"} value={o}>{o || "Selecione"}</option>)}
              </select>
            </Field>
            <Field label="Estado civil">
              <select className="input" value={form.maritalStatus} onChange={(e) => setForm({ ...form, maritalStatus: e.target.value })}>
                {MARITAL_OPTIONS.map((o) => <option key={o || "e"} value={o}>{o || "Selecione"}</option>)}
              </select>
            </Field>
          </div>
        )}

        {current.id === "contact" && (
          <div className="form-grid">
            <Field label="E-mail *" className="full"><input type="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
            <Field label="Telefone"><input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
            <Field label="Celular"><input className="input" value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} /></Field>
            <Field label="WhatsApp"><input className="input" value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} /></Field>
          </div>
        )}

        {current.id === "address" && (
          <div className="form-grid">
            {["cep", "street", "number", "complement", "district", "city", "state"].map((key) => (
              <Field key={key} label={key}>
                <input className="input" value={form.address[key]} onChange={(e) => setForm({ ...form, address: { ...form.address, [key]: e.target.value } })} />
              </Field>
            ))}
          </div>
        )}

        {current.id === "documents" && (
          <div className="form-grid">
            <Field label="CTPS"><input className="input" value={form.documents.ctps} onChange={(e) => setForm({ ...form, documents: { ...form.documents, ctps: e.target.value } })} /></Field>
            <Field label="PIS/PASEP"><input className="input" value={form.documents.pisPasep} onChange={(e) => setForm({ ...form, documents: { ...form.documents, pisPasep: e.target.value } })} /></Field>
            <Field label="CNH"><input className="input" value={form.documents.cnh} onChange={(e) => setForm({ ...form, documents: { ...form.documents, cnh: e.target.value } })} /></Field>
          </div>
        )}

        {current.id === "employment" && (
          <div className="form-grid">
            <Field label="Matrícula"><input className="input" value={form.employment.employeeCode} onChange={(e) => setForm({ ...form, employment: { ...form.employment, employeeCode: e.target.value } })} /></Field>
            <Field label="Cargo"><input className="input" value={form.employment.jobTitle} onChange={(e) => setForm({ ...form, employment: { ...form.employment, jobTitle: e.target.value } })} /></Field>
            <Field label="Departamento">
              <select className="input" value={form.employment.departmentId} onChange={(e) => setForm({ ...form, employment: { ...form.employment, departmentId: e.target.value } })}>
                <option value="">Selecione</option>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </Field>
            <Field label="Admissão"><input type="date" className="input" value={form.employment.hiredAt} onChange={(e) => setForm({ ...form, employment: { ...form.employment, hiredAt: e.target.value } })} /></Field>
            <Field label="Contrato">
              <select className="input" value={form.employment.contractType} onChange={(e) => setForm({ ...form, employment: { ...form.employment, contractType: e.target.value } })}>
                {CONTRACT_TYPES.map((c) => <option key={c || "e"} value={c}>{c || "Selecione"}</option>)}
              </select>
            </Field>
            <Field label="Situação">
              <select className="input" value={form.employment.employmentStatus} onChange={(e) => setForm({ ...form, employment: { ...form.employment, employmentStatus: e.target.value } })}>
                {EMPLOYMENT_STATUS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </Field>
          </div>
        )}

        {current.id === "access" && (
          <div className="form-grid">
            <Field label="Usuário (login)" className="full"><input className="input" value={form.access.username || form.email} onChange={(e) => setForm({ ...form, access: { ...form.access, username: e.target.value } })} /></Field>
            <Field label="Senha inicial *" className="full"><input type="password" className="input" value={form.access.password} onChange={(e) => setForm({ ...form, access: { ...form.access, password: e.target.value } })} minLength={6} /></Field>
            <Field label="Situação do acesso">
              <select className="input" value={form.access.accessStatus} onChange={(e) => setForm({ ...form, access: { ...form.access, accessStatus: e.target.value } })}>
                {ACCESS_STATUS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </Field>
          </div>
        )}

        {current.id === "roles" && (
          <div className="admin-people-checklist">
            {roles.map((role) => (
              <label key={role.id} className="admin-people-check">
                <input
                  type="checkbox"
                  checked={form.roleIds.includes(role.id)}
                  onChange={(e) => {
                    const roleIds = e.target.checked
                      ? [...form.roleIds, role.id]
                      : form.roleIds.filter((id) => id !== role.id);
                    setForm({ ...form, roleIds });
                  }}
                />
                <span className="admin-people-check-text"><strong>{role.name}</strong></span>
              </label>
            ))}
          </div>
        )}

        {current.id === "permissions" && (
          <p className="admin-people-hint">As permissões são herdadas automaticamente das funções selecionadas na etapa anterior.</p>
        )}

        {current.id === "applications" && (
          <div className="admin-people-checklist">
            {applications.map((app) => (
              <label key={app.id} className="admin-people-check">
                <input
                  type="checkbox"
                  checked={form.applicationIds.includes(app.id)}
                  onChange={(e) => {
                    const applicationIds = e.target.checked
                      ? [...form.applicationIds, app.id]
                      : form.applicationIds.filter((id) => id !== app.id);
                    setForm({ ...form, applicationIds });
                  }}
                />
                <span className="admin-people-check-text"><strong>{app.name}</strong> — {app.description}</span>
              </label>
            ))}
          </div>
        )}

        {current.id === "app-time" && (
          <div className="form-grid">
            <p className="full admin-people-hint">Configuração operacional do MÖBI Time — gravada via API oficial do Time.</p>
            <Field label="Jornada">
              <select className="input" value={form.timeConfig.workScheduleId} onChange={(e) => setForm({ ...form, timeConfig: { ...form.timeConfig, workScheduleId: e.target.value } })}>
                <option value="">Selecione</option>
                {schedules.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </Field>
            <Field label="Escala">
              <select className="input" value={form.timeConfig.shiftPlanId} onChange={(e) => setForm({ ...form, timeConfig: { ...form.timeConfig, shiftPlanId: e.target.value } })}>
                <option value="">Selecione</option>
                {shiftPlans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </Field>
            <Field label="Situação operacional">
              <select className="input" value={form.timeConfig.operationalStatus} onChange={(e) => setForm({ ...form, timeConfig: { ...form.timeConfig, operationalStatus: e.target.value } })}>
                <option value="ACTIVE">Ativo</option>
                <option value="INACTIVE">Inativo</option>
              </select>
            </Field>
          </div>
        )}

        {current.id === "finish" && (
          <div>
            <p>Revise os dados e finalize o cadastro na Plataforma.</p>
            <ul className="admin-wizard-summary">
              <li><strong>Nome:</strong> {form.name}</li>
              <li><strong>E-mail:</strong> {form.email}</li>
              <li><strong>Aplicativos:</strong> {selectedApps.map((a) => a.name).join(", ") || "Nenhum"}</li>
              {selectedApps.some((a) => /portal/i.test(a.name || a.code || "")) && (
                <li><strong>Acesso do colaborador:</strong> <code>/portal</code> (rota exclusiva — não usar a central Admin)</li>
              )}
            </ul>
          </div>
        )}
      </div>

      <div className="modal-actions">
        {stepIndex > 0 && <button type="button" className="button ghost" onClick={back}>Voltar</button>}
        {current.id !== "finish" ? (
          <button type="button" className="button primary" onClick={next}>Próximo</button>
        ) : (
          <button type="button" className="button primary" disabled={saving} onClick={finish}>
            {saving ? "Finalizando…" : "Finalizar cadastro"}
          </button>
        )}
      </div>
    </section>
  );
}

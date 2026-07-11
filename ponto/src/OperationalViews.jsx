import { useCallback, useEffect, useState } from "react";
import { useTopbarActions } from "./topbar.js";
import { pontoApi } from "./api.js";
import { todayISO } from "./utils.js";

const WEEKDAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const ADJUSTMENT_KINDS = [
  { id: "FORGOT_ENTRY", label: "Esqueci entrada", punchType: "ENTRY" },
  { id: "FORGOT_EXIT", label: "Esqueci saída", punchType: "EXIT" },
  { id: "FORGOT_LUNCH_OUT", label: "Esqueci saída almoço", punchType: "LUNCH_OUT" },
  { id: "FORGOT_LUNCH_RETURN", label: "Esqueci retorno almoço", punchType: "LUNCH_RETURN" },
  { id: "TIME_ERROR", label: "Erro de horário", punchType: null },
];
const READINESS_LABELS = {
  person: "Pessoa",
  portal: "Portal",
  permissions: "Permissões",
  journey: "Jornada",
  shift: "Escala",
  access: "Acesso",
  timeLink: "Vínculo Time",
};

function Panel({ title, subtitle, actions, children }) {
  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}

function StatusPill({ status }) {
  const map = {
    PENDING: "Pendente",
    APPROVED: "Aprovado",
    REJECTED: "Rejeitado",
    CANCELLED: "Cancelado",
    OPEN: "Aberta",
    CLOSED: "Fechada",
  };
  return <span className={`ponto-pill ponto-pill--${String(status).toLowerCase()}`}>{map[status] || status}</span>;
}

/** @deprecated Use Wizard da Platform via window.MoobleOs.openCollaboratorWizard */
export function OnboardingView() {
  return (
    <Panel title="Onboarding movido" subtitle="O cadastro de colaboradores pertence exclusivamente à Platform">
      <p>Use <strong>Novo Colaborador</strong> no Admin → Pessoas, ou o botão equivalente em Gestão operacional do Time.</p>
      <button type="button" className="button primary" onClick={() => window.MoobleOs?.openCollaboratorWizard?.({ returnProduct: "ponto", returnView: "employees" })}>
        Abrir Wizard oficial
      </button>
    </Panel>
  );
}

export function ShiftPlansView() {
  const [plans, setPlans] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [form, setForm] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    Promise.all([pontoApi.shiftPlans.list(), pontoApi.schedules.list()])
      .then(([p, s]) => { setPlans(p.plans); setSchedules(s.schedules); })
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => { load(); }, [load]);

  useTopbarActions(
    <button type="button" className="button primary" onClick={() => setForm({ name: "", planType: "weekly", entries: WEEKDAYS.map((_, i) => ({ dayOfWeek: i, workScheduleId: "" })) })}>Nova escala</button>,
    [form],
  );

  async function save(e) {
    e.preventDefault();
    setError("");
    try {
      await pontoApi.shiftPlans.create({
        name: form.name,
        planType: form.planType,
        referenceYear: form.referenceYear,
        referenceMonth: form.referenceMonth,
        entries: form.entries.map((entry) => ({
          ...entry,
          workScheduleId: entry.workScheduleId || null,
        })),
      });
      setForm(null);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <>
      {error && <p className="ponto-error">{error}</p>}
      {form && (
        <Panel title="Nova escala" subtitle={form.planType === "weekly" ? "Semanal — defina jornada ou folga por dia" : "Mensal — dias do mês"}>
          <form className="ponto-form-grid" onSubmit={save}>
            <label>Nome<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></label>
            <label>Tipo
              <select value={form.planType} onChange={(e) => {
                const planType = e.target.value;
                setForm({
                  ...form,
                  planType,
                  entries: planType === "weekly"
                    ? WEEKDAYS.map((_, i) => ({ dayOfWeek: i, workScheduleId: "" }))
                    : Array.from({ length: 31 }, (_, i) => ({ dayOfMonth: i + 1, workScheduleId: "" })),
                });
              }}>
                <option value="weekly">Semanal</option>
                <option value="monthly">Mensal</option>
              </select>
            </label>
            {form.planType === "monthly" && (
              <>
                <label>Ano<input type="number" value={form.referenceYear || new Date().getFullYear()} onChange={(e) => setForm({ ...form, referenceYear: Number(e.target.value) })} /></label>
                <label>Mês<input type="number" min={1} max={12} value={form.referenceMonth || new Date().getMonth() + 1} onChange={(e) => setForm({ ...form, referenceMonth: Number(e.target.value) })} /></label>
              </>
            )}
            <div className="ponto-shift-grid">
              {form.entries.map((entry, idx) => (
                <label key={idx}>
                  {form.planType === "weekly" ? WEEKDAYS[entry.dayOfWeek] : `Dia ${entry.dayOfMonth}`}
                  <select
                    value={entry.workScheduleId || ""}
                    onChange={(e) => {
                      const entries = [...form.entries];
                      entries[idx] = { ...entry, workScheduleId: e.target.value };
                      setForm({ ...form, entries });
                    }}
                  >
                    <option value="">Sem expediente</option>
                    {schedules.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </label>
              ))}
            </div>
            <div className="ponto-form-actions">
              <button type="button" className="button" onClick={() => setForm(null)}>Cancelar</button>
              <button type="submit" className="button primary">Salvar escala</button>
            </div>
          </form>
        </Panel>
      )}
      <Panel title="Escalas cadastradas" subtitle="Cada colaborador pode ter sua própria escala">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Nome</th><th>Tipo</th><th>Referência</th><th>Dias configurados</th></tr></thead>
            <tbody>
              {plans.length === 0 ? <tr><td colSpan={4}>Nenhuma escala cadastrada.</td></tr> : plans.map((p) => (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td>{p.planType === "weekly" ? "Semanal" : "Mensal"}</td>
                  <td>{p.planType === "monthly" ? `${p.referenceMonth}/${p.referenceYear}` : "—"}</td>
                  <td>{p.entries?.length || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}

export function AdjustmentsView() {
  const [requests, setRequests] = useState([]);
  const [filter, setFilter] = useState("PENDING");
  const [selected, setSelected] = useState(null);
  const [adminNote, setAdminNote] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(() => {
    pontoApi.adjustments.list(filter || undefined)
      .then((d) => setRequests(d.requests))
      .catch((e) => setError(e.message));
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  async function review(action) {
    if (!selected) return;
    setError("");
    try {
      if (action === "approve") await pontoApi.adjustments.approve(selected.id, adminNote);
      else await pontoApi.adjustments.reject(selected.id, adminNote);
      setSelected(null);
      setAdminNote("");
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <>
      {error && <p className="ponto-error">{error}</p>}
      <Panel title="Solicitações de ajuste" subtitle="Aprovação atualiza o registro de ponto" actions={
        <select value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="">Todas</option>
          <option value="PENDING">Pendentes</option>
          <option value="APPROVED">Aprovadas</option>
          <option value="REJECTED">Rejeitadas</option>
        </select>
      }>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Colaborador</th><th>Data</th><th>Tipo</th><th>Horário</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {requests.length === 0 ? <tr><td colSpan={6}>Nenhuma solicitação.</td></tr> : requests.map((r) => (
                <tr key={r.id}>
                  <td>{r.employeeName || r.employeeId}</td>
                  <td>{r.serverDate}</td>
                  <td>{r.kindLabel}</td>
                  <td>{r.requestedTime?.slice(0, 5)}</td>
                  <td><StatusPill status={r.status} /></td>
                  <td><button type="button" className="button small" onClick={() => setSelected(r)}>Abrir</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
      {selected && (
        <Panel title="Detalhe da solicitação" subtitle={selected.employeeName}>
          <p><strong>Observação do colaborador:</strong> {selected.note || "—"}</p>
          <label>Observação do administrador
            <textarea value={adminNote} onChange={(e) => setAdminNote(e.target.value)} rows={3} />
          </label>
          {selected.status === "PENDING" && (
            <div className="ponto-form-actions">
              <button type="button" className="button" onClick={() => setSelected(null)}>Fechar</button>
              <button type="button" className="button danger" onClick={() => review("reject")}>Rejeitar</button>
              <button type="button" className="button primary" onClick={() => review("approve")}>Aprovar</button>
            </div>
          )}
        </Panel>
      )}
    </>
  );
}

export function CompetencesView() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const now = new Date();

  const load = useCallback(() => {
    pontoApi.competences.list().then((d) => setItems(d.competences)).catch((e) => setError(e.message));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function create() {
    try {
      await pontoApi.competences.create({ year: now.getFullYear(), month: now.getMonth() + 1 });
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function toggle(id, action) {
    try {
      if (action === "close") await pontoApi.competences.close(id);
      else await pontoApi.competences.reopen(id);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <Panel title="Competências" subtitle="Após fechamento, ajustes e alterações de ponto são bloqueados">
      {error && <p className="ponto-error">{error}</p>}
      <div className="ponto-form-actions" style={{ marginBottom: "1rem" }}>
        <button type="button" className="button primary" onClick={create}>Abrir competência do mês atual</button>
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Período</th><th>Status</th><th>Fechada em</th><th></th></tr></thead>
          <tbody>
            {items.length === 0 ? <tr><td colSpan={4}>Nenhuma competência.</td></tr> : items.map((c) => (
              <tr key={c.id}>
                <td>{c.label}</td>
                <td><StatusPill status={c.status} /></td>
                <td>{c.closedAt ? new Date(c.closedAt).toLocaleString("pt-BR") : "—"}</td>
                <td>
                  {c.status === "OPEN" ? (
                    <button type="button" className="button small" onClick={() => toggle(c.id, "close")}>Fechar</button>
                  ) : (
                    <button type="button" className="button small" onClick={() => toggle(c.id, "reopen")}>Reabrir</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

export function NoticesView() {
  const [notices, setNotices] = useState([]);
  const [form, setForm] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    pontoApi.notices.list().then((d) => setNotices(d.notices)).catch((e) => setError(e.message));
  }, []);

  useEffect(() => { load(); }, [load]);

  useTopbarActions(
    <button type="button" className="button primary" onClick={() => setForm({ title: "", message: "", priority: "normal", pinned: false, validFrom: "", validTo: "", targets: ["all"] })}>Novo comunicado</button>,
    [form],
  );

  async function save(e) {
    e.preventDefault();
    try {
      await pontoApi.notices.create(form);
      setForm(null);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <>
      {error && <p className="ponto-error">{error}</p>}
      {form && (
        <Panel title="Novo comunicado">
          <form className="ponto-form-grid" onSubmit={save}>
            <label>Título<input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></label>
            <label>Prioridade
              <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                <option value="normal">Normal</option>
                <option value="high">Alta</option>
                <option value="low">Baixa</option>
              </select>
            </label>
            <label className="full">Mensagem<textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} required rows={4} /></label>
            <label>Validade início<input type="date" value={form.validFrom} onChange={(e) => setForm({ ...form, validFrom: e.target.value })} /></label>
            <label>Validade fim<input type="date" value={form.validTo} onChange={(e) => setForm({ ...form, validTo: e.target.value })} /></label>
            <label><input type="checkbox" checked={form.pinned} onChange={(e) => setForm({ ...form, pinned: e.target.checked })} /> Fixar no topo</label>
            <div className="ponto-form-actions">
              <button type="button" className="button" onClick={() => setForm(null)}>Cancelar</button>
              <button type="submit" className="button primary">Publicar</button>
            </div>
          </form>
        </Panel>
      )}
      <Panel title="Comunicados ativos">
        <ul className="ponto-list">
          {notices.length === 0 ? <li>Nenhum comunicado.</li> : notices.map((n) => (
            <li key={n.id}><strong>{n.title}</strong> — {n.message?.slice(0, 80)}</li>
          ))}
        </ul>
      </Panel>
    </>
  );
}

export function DocumentsView() {
  const [employees, setEmployees] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [form, setForm] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    Promise.all([pontoApi.employees.list(), pontoApi.documents.list()])
      .then(([e, d]) => { setEmployees(e.employees); setDocuments(d.documents); })
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => { load(); }, [load]);

  useTopbarActions(
    <button type="button" className="button primary" onClick={() => setForm({ employeeId: "", category: "Contrato", label: "", requiresAck: true })}>Enviar documento</button>,
    [form],
  );

  function onFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setForm({ ...form, fileData: reader.result, fileName: file.name });
    reader.readAsDataURL(file);
  }

  async function save(e) {
    e.preventDefault();
    try {
      await pontoApi.documents.upload(form);
      setForm(null);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <>
      {error && <p className="ponto-error">{error}</p>}
      {form && (
        <Panel title="Enviar documento">
          <form className="ponto-form-grid" onSubmit={save}>
            <label>Colaborador
              <select value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value })} required>
                <option value="">Selecione</option>
                {employees.map((emp) => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
              </select>
            </label>
            <label>Categoria
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                <option>Contrato</option><option>Holerite</option><option>Aviso</option><option>Outros</option>
              </select>
            </label>
            <label>Descrição<input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} /></label>
            <label>Arquivo<input type="file" onChange={onFile} required /></label>
            <div className="ponto-form-actions">
              <button type="button" className="button" onClick={() => setForm(null)}>Cancelar</button>
              <button type="submit" className="button primary">Enviar</button>
            </div>
          </form>
        </Panel>
      )}
      <Panel title="Documentos enviados">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Colaborador</th><th>Categoria</th><th>Arquivo</th><th>Data</th></tr></thead>
            <tbody>
              {documents.length === 0 ? <tr><td colSpan={4}>Nenhum documento.</td></tr> : documents.map((d) => (
                <tr key={d.id}>
                  <td>{d.employee_id || d.employeeId}</td>
                  <td>{d.category}</td>
                  <td>{d.file_name || d.fileName}</td>
                  <td>{d.created_at || d.createdAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}

export function EmployeeStatusView() {
  const [employees, setEmployees] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [readiness, setReadiness] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    pontoApi.employees.list().then((d) => setEmployees(d.employees)).catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    pontoApi.readiness(selectedId).then((d) => setReadiness(d.readiness)).catch((e) => setError(e.message));
  }, [selectedId]);

  return (
    <Panel title="Status do colaborador" subtitle="Verifique o que falta antes de liberar o Portal">
      {error && <p className="ponto-error">{error}</p>}
      <label>Colaborador
        <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
          <option value="">Selecione</option>
          {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
      </label>
      {readiness && (
        <ul className="ponto-readiness-list">
          {Object.entries(readiness.checks).map(([key, ok]) => (
            <li key={key} className={ok ? "ok" : "missing"}>
              {ok ? "✔" : "⚠"} {READINESS_LABELS[key] || key}
            </li>
          ))}
        </ul>
      )}
      {readiness && (
        <p className={readiness.ready ? "ponto-success-banner" : "ponto-warning-banner"}>
          {readiness.ready ? "Tudo OK — colaborador pronto." : "Cadastro incompleto."}
        </p>
      )}
    </Panel>
  );
}

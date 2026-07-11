import { useCallback, useEffect, useState } from "react";
import { useTopbarActions } from "./topbar.js";
import { pontoApi } from "./api.js";
import { labelStatus } from "../../shared/ui-pt.js";
import {
  PUNCH_LABELS,
  formatDateBR,
  generateReportPdf,
  generateTimesheetPdf,
  monthStartISO,
  todayISO,
} from "./utils.js";

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

export function DashboardView({ onNavigate }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    pontoApi.dashboard().then(setData).catch((e) => setError(e.message));
  }, []);

  if (error) return <p className="ponto-error">{error}</p>;
  if (!data) return <p>Carregando...</p>;

  const op = data.operational;

  return (
    <>
      {op && (
        <section className="metrics-grid" aria-label="Operacional">
          <article className="metric-card warning clickable" onClick={() => onNavigate?.("adjustments")} role="button" tabIndex={0}>
            <span>Ajustes aguardando</span><strong>{op.pendingAdjustments}</strong>
          </article>
          <article className="metric-card clickable" onClick={() => onNavigate?.("competences")} role="button" tabIndex={0}>
            <span>Competência</span><strong>{op.openCompetence?.label || "—"}</strong>
          </article>
          <article className="metric-card muted clickable" onClick={() => onNavigate?.("employeeStatus")} role="button" tabIndex={0}>
            <span>Colaboradores pendentes</span><strong>{op.incompleteEmployees}</strong>
          </article>
          <article className="metric-card clickable" onClick={() => onNavigate?.("notices")} role="button" tabIndex={0}>
            <span>Comunicados ativos</span><strong>{op.activeNotices}</strong>
          </article>
          <article className="metric-card clickable" onClick={() => onNavigate?.("documents")} role="button" tabIndex={0}>
            <span>Documentos</span><strong>{op.pendingDocuments}</strong>
          </article>
        </section>
      )}
      <section className="metrics-grid" aria-label="Indicadores">
        <article className="metric-card"><span>Funcionários ativos</span><strong>{data.activeEmployees}</strong></article>
        <article className="metric-card"><span>Presentes hoje</span><strong>{data.presentToday}</strong></article>
        <article className="metric-card warning"><span>Atrasados hoje</span><strong>{data.lateToday}</strong></article>
        <article className="metric-card muted"><span>Sem entrada</span><strong>{data.missingEntry}</strong></article>
      </section>
      <Panel title="Últimos registros" subtitle="Registros realizados hoje">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Funcionário</th>
                <th>Tipo</th>
                <th>Horário</th>
                <th>Foto</th>
                <th>Protocolo</th>
              </tr>
            </thead>
            <tbody>
              {data.recentRecords.length === 0 ? (
                <tr>
                  <td colSpan={5}>Nenhum registro realizado hoje.</td>
                </tr>
              ) : (
                data.recentRecords.map((r) => (
                  <tr key={r.id}>
                    <td>{r.employeeName}</td>
                    <td>{r.typeLabel}</td>
                    <td>{r.serverTime?.slice(0, 5)}</td>
                    <td>{r.photoUrl ? <img src={r.photoUrl} alt="" className="ponto-thumb" /> : "—"}</td>
                    <td><code>{r.protocol}</code></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}

const emptyOperational = {
  workScheduleId: "", shiftPlanId: "", status: "ACTIVE",
};

function openPlatformPerson(personId) {
  if (personId && window.MoobleOs?.openPersonEdit) {
    window.MoobleOs.openPersonEdit(personId);
    return;
  }
  window.MoobleOs?.openCollaboratorWizard?.({ returnProduct: "ponto", returnView: "employees" });
}

export function EmployeesView() {
  const [employees, setEmployees] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [shiftPlans, setShiftPlans] = useState([]);
  const [form, setForm] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    Promise.all([pontoApi.timeEmployees.list(), pontoApi.schedules.list(), pontoApi.shiftPlans.list()])
      .then(([e, s, sp]) => { setEmployees(e.employees); setSchedules(s.schedules); setShiftPlans(sp.plans); })
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => { load(); }, [load]);

  useTopbarActions(
    <button
      type="button"
      className="button primary"
      onClick={() => window.MoobleOs?.openCollaboratorWizard?.({ returnProduct: "ponto", returnView: "employees" })}
    >
      Novo Colaborador
    </button>,
    [],
  );

  async function save(e) {
    e.preventDefault();
    setError("");
    try {
      if (form.personId) {
        await pontoApi.timeEmployees.update(form.personId, {
          workScheduleId: form.workScheduleId,
          shiftPlanId: form.shiftPlanId,
          operationalStatus: form.status,
        });
      } else {
        await pontoApi.employees.update(form.id, form);
      }
      setForm(null);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <>
      <Panel title="Gestão operacional" subtitle="Jornada, escala e situação — dados pessoais na Plataforma (Pessoas)">
        {error && <p className="ponto-error ponto-panel-msg">{error}</p>}
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Nome</th><th>E-mail</th><th>Jornada</th><th>Escala</th><th>Situação</th><th className="actions-col">Ações</th></tr>
            </thead>
            <tbody>
              {employees.length === 0 ? (
                <tr><td colSpan={6}>Nenhum vínculo Time. Use Novo Colaborador (assistente da Plataforma).</td></tr>
              ) : (
                employees.map((emp) => (
                  <tr key={emp.id}>
                    <td>{emp.name}</td>
                    <td>{emp.email || "—"}</td>
                    <td>{schedules.find((s) => s.id === emp.workScheduleId)?.name || "—"}</td>
                    <td>{shiftPlans.find((p) => p.id === emp.shiftPlanId)?.name || "—"}</td>
                    <td><span className={`status-pill ${emp.status === "ACTIVE" ? "ok" : "muted"}`}>{emp.status === "ACTIVE" ? "Ativo" : "Inativo"}</span></td>
                    <td>
                      <button type="button" className="button ghost" onClick={() => setForm({ ...emptyOperational, ...emp })}>Operacional</button>
                      {emp.personId && (
                        <button type="button" className="button ghost" onClick={() => openPlatformPerson(emp.personId)}>Cadastro na Plataforma</button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      {form && (
        <dialog className="modal" open>
          <form className="modal-card" onSubmit={save}>
            <div className="modal-header">
              <h2>Configuração operacional — {form.name}</h2>
              <button type="button" className="icon-button" onClick={() => setForm(null)}>×</button>
            </div>
            {form.personId && (
              <p className="muted-text">
                Dados pessoais, login e permissões:{" "}
                <button type="button" className="button link" onClick={() => openPlatformPerson(form.personId)}>abrir cadastro oficial na Plataforma</button>
              </p>
            )}
            <div className="form-grid">
              <label>Jornada
                <select className="input" value={form.workScheduleId || ""} onChange={(e) => setForm({ ...form, workScheduleId: e.target.value })}>
                  <option value="">Selecionar</option>
                  {schedules.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </label>
              <label>Escala
                <select className="input" value={form.shiftPlanId || ""} onChange={(e) => setForm({ ...form, shiftPlanId: e.target.value })}>
                  <option value="">Selecionar</option>
                  {shiftPlans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </label>
              <label>Situação operacional
                <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  <option value="ACTIVE">Ativo</option>
                  <option value="INACTIVE">Inativo</option>
                </select>
              </label>
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

const emptySchedule = {
  name: "Administrativo", startTime: "08:00", lunchStartTime: "12:00",
  lunchEndTime: "13:00", endTime: "18:00", toleranceMinutes: 5, dailyWorkMinutes: 480, active: true,
};

export function SchedulesView() {
  const [schedules, setSchedules] = useState([]);
  const [form, setForm] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    pontoApi.schedules.list().then((d) => setSchedules(d.schedules)).catch((e) => setError(e.message));
  }, []);

  useEffect(() => { load(); }, [load]);

  useTopbarActions(
    <button type="button" className="button primary" onClick={() => setForm({ ...emptySchedule })}>Nova jornada</button>,
    [],
  );

  async function save(e) {
    e.preventDefault();
    try {
      if (form.id) await pontoApi.schedules.update(form.id, form);
      else await pontoApi.schedules.create(form);
      setForm(null);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <>
      <Panel title="Jornadas" subtitle="Horários de trabalho cadastrados">
        {error && <p className="ponto-error ponto-panel-msg">{error}</p>}
        <div className="table-wrap">
          <table>
            <thead><tr><th>Nome</th><th>Entrada</th><th>Almoço</th><th>Saída</th><th>Tolerância</th><th>Carga</th><th className="actions-col">Ações</th></tr></thead>
            <tbody>
              {schedules.map((s) => (
                <tr key={s.id}>
                  <td>{s.name}</td>
                  <td>{s.startTime}</td>
                  <td>{s.lunchStartTime} – {s.lunchEndTime}</td>
                  <td>{s.endTime}</td>
                  <td>{s.toleranceMinutes} min</td>
                  <td>{Math.floor(s.dailyWorkMinutes / 60)}h{s.dailyWorkMinutes % 60 ? `${s.dailyWorkMinutes % 60}m` : ""}</td>
                  <td><button type="button" className="button ghost" onClick={() => setForm(s)}>Editar</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
      {form && (
        <dialog className="modal" open>
          <form className="modal-card" onSubmit={save}>
            <h2>{form.id ? "Editar jornada" : "Nova jornada"}</h2>
            <div className="form-grid">
              <label>Nome<input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></label>
              <label>Entrada<input className="input" type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} required /></label>
              <label>Saída almoço<input className="input" type="time" value={form.lunchStartTime} onChange={(e) => setForm({ ...form, lunchStartTime: e.target.value })} required /></label>
              <label>Volta almoço<input className="input" type="time" value={form.lunchEndTime} onChange={(e) => setForm({ ...form, lunchEndTime: e.target.value })} required /></label>
              <label>Saída<input className="input" type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} required /></label>
              <label>Tolerância (min)<input className="input" type="number" value={form.toleranceMinutes} onChange={(e) => setForm({ ...form, toleranceMinutes: Number(e.target.value) })} /></label>
              <label>Carga diária (min)<input className="input" type="number" value={form.dailyWorkMinutes} onChange={(e) => setForm({ ...form, dailyWorkMinutes: Number(e.target.value) })} /></label>
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

export function RecordsView() {
  const [employees, setEmployees] = useState([]);
  const [records, setRecords] = useState([]);
  const [filters, setFilters] = useState({ employeeId: "", startDate: monthStartISO(), endDate: todayISO(), type: "" });
  const [adjust, setAdjust] = useState(null);
  const [manual, setManual] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    pontoApi.employees.list().then((d) => setEmployees(d.employees)).catch(() => {});
  }, []);

  function search() {
    pontoApi.records.list(filters).then((d) => setRecords(d.records)).catch((e) => setError(e.message));
  }

  useEffect(() => { search(); }, []);

  useTopbarActions(
  <button type="button" className="button secondary" onClick={() => setManual({ employeeId: "", serverDate: todayISO(), type: "ENTRY", serverTime: "08:00", reason: "" })}>Inserir manual</button>,
    [],
  );

  async function saveAdjust(e) {
    e.preventDefault();
    try {
      await pontoApi.records.adjust(adjust.id, adjust);
      setAdjust(null);
      search();
    } catch (err) {
      setError(err.message);
    }
  }

  async function saveManual(e) {
    e.preventDefault();
    try {
      await pontoApi.records.createManual(manual);
      setManual(null);
      search();
    } catch (err) {
      setError(err.message);
    }
  }

  const filterActions = (
    <div className="filter-row">
      <select className="input" value={filters.employeeId} onChange={(e) => setFilters({ ...filters, employeeId: e.target.value })}>
        <option value="">Todos funcionários</option>
        {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
      </select>
      <input className="input" type="date" value={filters.startDate} onChange={(e) => setFilters({ ...filters, startDate: e.target.value })} />
      <input className="input" type="date" value={filters.endDate} onChange={(e) => setFilters({ ...filters, endDate: e.target.value })} />
      <select className="input" value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value })}>
        <option value="">Todos tipos</option>
        {Object.entries(PUNCH_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
      </select>
      <button type="button" className="button primary" onClick={search}>Filtrar</button>
    </div>
  );

  return (
    <>
      <Panel title="Histórico" subtitle="Registros de ponto da equipe" actions={filterActions}>
        {error && <p className="ponto-error ponto-panel-msg">{error}</p>}
        <div className="table-wrap">
          <table>
            <thead><tr><th>Data</th><th>Hora</th><th>Funcionário</th><th>Tipo</th><th>Protocolo</th><th>Situação</th><th>Foto</th><th className="actions-col">Ações</th></tr></thead>
            <tbody>
              {records.map((r) => (
                <tr key={r.id}>
                  <td>{formatDateBR(r.serverDate)}</td>
                  <td>{r.serverTime?.slice(0, 5)}</td>
                  <td>{r.employeeName}</td>
                  <td>{r.typeLabel}</td>
                  <td><code>{r.protocol}</code></td>
                  <td><span className={`status-pill ${r.status === "VALID" ? "ok" : "warn"}`}>{labelStatus(r.status)}</span></td>
                  <td>{r.photoUrl ? <img src={r.photoUrl} alt="" className="ponto-thumb" /> : "—"}</td>
                  <td><button type="button" className="button ghost" onClick={() => setAdjust({ id: r.id, serverTime: r.serverTime?.slice(0, 5), type: r.type, reason: "" })}>Corrigir</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
      {adjust && (
        <dialog className="modal" open>
          <form className="modal-card" onSubmit={saveAdjust}>
            <h2>Corrigir registro</h2>
            <div className="form-grid">
              <label>Tipo<select className="input" value={adjust.type} onChange={(e) => setAdjust({ ...adjust, type: e.target.value })}>{Object.entries(PUNCH_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
              <label>Horário<input className="input" type="time" value={adjust.serverTime} onChange={(e) => setAdjust({ ...adjust, serverTime: e.target.value })} required /></label>
              <label className="full">Motivo<textarea className="input" value={adjust.reason} onChange={(e) => setAdjust({ ...adjust, reason: e.target.value })} required rows={3} /></label>
            </div>
            <div className="modal-actions">
              <button type="button" className="button danger" onClick={async () => { await pontoApi.records.adjust(adjust.id, { cancel: true, reason: adjust.reason || "Cancelado" }); setAdjust(null); search(); }}>Cancelar registro</button>
              <button type="submit" className="button primary">Salvar correção</button>
            </div>
          </form>
        </dialog>
      )}
      {manual && (
        <dialog className="modal" open>
          <form className="modal-card" onSubmit={saveManual}>
            <h2>Inserir registro manual</h2>
            <div className="form-grid">
              <label>Funcionário<select className="input" value={manual.employeeId} onChange={(e) => setManual({ ...manual, employeeId: e.target.value })} required><option value="">Selecionar</option>{employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}</select></label>
              <label>Data<input className="input" type="date" value={manual.serverDate} onChange={(e) => setManual({ ...manual, serverDate: e.target.value })} required /></label>
              <label>Tipo<select className="input" value={manual.type} onChange={(e) => setManual({ ...manual, type: e.target.value })}>{Object.entries(PUNCH_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
              <label>Horário<input className="input" type="time" value={manual.serverTime} onChange={(e) => setManual({ ...manual, serverTime: e.target.value })} required /></label>
              <label className="full">Motivo<textarea className="input" value={manual.reason} onChange={(e) => setManual({ ...manual, reason: e.target.value })} required rows={3} /></label>
            </div>
            <div className="modal-actions">
              <button type="button" className="button ghost" onClick={() => setManual(null)}>Fechar</button>
              <button type="submit" className="button primary">Inserir</button>
            </div>
          </form>
        </dialog>
      )}
    </>
  );
}

export function TimesheetView() {
  const [employees, setEmployees] = useState([]);
  const [employeeId, setEmployeeId] = useState("");
  const [startDate, setStartDate] = useState(monthStartISO());
  const [endDate, setEndDate] = useState(todayISO());
  const [data, setData] = useState(null);

  useEffect(() => {
    pontoApi.employees.list().then((d) => {
      setEmployees(d.employees);
      if (d.employees[0]) setEmployeeId(d.employees[0].id);
    });
  }, []);

  async function generate() {
    if (!employeeId) return;
    const result = await pontoApi.timesheet({ employeeId, startDate, endDate });
    setData(result);
  }

  const filterActions = (
    <div className="filter-row">
      <select className="input" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
        {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
      </select>
      <input className="input" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
      <input className="input" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
      <button type="button" className="button primary" onClick={generate}>Gerar</button>
      {data && <button type="button" className="button secondary" onClick={() => generateTimesheetPdf(data)}>Exportar PDF</button>}
    </div>
  );

  return (
    <>
      <Panel title="Espelho" subtitle="Horas por dia no período" actions={filterActions}>
        {!data ? (
          <p className="ponto-panel-msg muted-text">Selecione o funcionário e o período, depois clique em Gerar.</p>
        ) : (
          <>
            <section className="metrics-grid ponto-panel-metrics">
              <article className="metric-card"><span>Previsto</span><strong>{data.summary.totalExpectedLabel}</strong></article>
              <article className="metric-card"><span>Trabalhado</span><strong>{data.summary.totalWorkedLabel}</strong></article>
              <article className="metric-card"><span>Saldo</span><strong>{data.summary.balanceLabel}</strong></article>
            </section>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Data</th><th>Entrada</th><th>S.Almoço</th><th>V.Almoço</th><th>Saída</th><th>Trabalhado</th><th>Extra</th><th>Negativo</th><th>Obs.</th></tr></thead>
                <tbody>
                  {data.days.map((d) => (
                    <tr key={d.date} className={d.incomplete ? "row-warn" : ""}>
                      <td>{formatDateBR(d.date)}</td>
                      <td>{d.entry}</td><td>{d.lunchOut}</td><td>{d.lunchReturn}</td><td>{d.exit}</td>
                      <td>{d.workedLabel}</td><td>{d.overtimeLabel}</td><td>{d.negativeLabel}</td><td>{d.observation}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Panel>
    </>
  );
}

const REPORT_TYPES = [
  ["general", "Geral do período"],
  ["monthly", "Mensal por funcionário"],
  ["late", "Atrasos"],
  ["absent", "Faltas"],
  ["overtime", "Horas extras"],
  ["incomplete", "Registros incompletos"],
];

export function ReportsView() {
  const [type, setType] = useState("general");
  const [startDate, setStartDate] = useState(monthStartISO());
  const [endDate, setEndDate] = useState(todayISO());
  const [report, setReport] = useState(null);

  async function generate() {
    const data = await pontoApi.reports(type, { startDate, endDate });
    setReport(data);
  }

  const filterActions = (
    <div className="filter-row">
      <select className="input" value={type} onChange={(e) => setType(e.target.value)}>
        {REPORT_TYPES.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
      </select>
      <input className="input" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
      <input className="input" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
      <button type="button" className="button primary" onClick={generate}>Gerar</button>
      {report && <button type="button" className="button secondary" onClick={() => generateReportPdf(report)}>PDF</button>}
    </div>
  );

  return (
    <Panel title="Relatórios" subtitle="Resultado do período selecionado" actions={filterActions}>
      {!report ? (
        <p className="ponto-panel-msg muted-text">Configure o período e clique em Gerar.</p>
      ) : (
        <div className="ponto-report-preview">
          <pre>{JSON.stringify(report.rows, null, 2)}</pre>
        </div>
      )}
    </Panel>
  );
}

export function SettingsView() {
  const [form, setForm] = useState({ companyName: "", document: "", address: "", defaultToleranceMinutes: 5 });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    pontoApi.settings.get().then(setForm);
  }, []);

  useTopbarActions(
    <button type="submit" form="ponto-settings-form" className="button primary">Salvar</button>,
    [],
  );

  async function save(e) {
    e.preventDefault();
    await pontoApi.settings.save(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <Panel title="Dados da empresa" subtitle="Usados em comprovantes e relatórios">
      <form id="ponto-settings-form" className="form-grid ponto-panel-form" onSubmit={save}>
        <label>Nome da empresa<input className="input" value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} /></label>
        <label>CNPJ<input className="input" value={form.document} onChange={(e) => setForm({ ...form, document: e.target.value })} /></label>
        <label className="full">Endereço<input className="input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></label>
        <label>Tolerância padrão (min)<input className="input" type="number" value={form.defaultToleranceMinutes} onChange={(e) => setForm({ ...form, defaultToleranceMinutes: Number(e.target.value) })} /></label>
        {saved && <p className="full ponto-saved">Configurações salvas.</p>}
      </form>
    </Panel>
  );
}

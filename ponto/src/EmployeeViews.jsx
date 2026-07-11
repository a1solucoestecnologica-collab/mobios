import { useEffect, useState } from "react";
import CameraCapture from "./CameraCapture.jsx";
import { pontoApi } from "./api.js";
import {
  PUNCH_LABELS,
  formatDateBR,
  generateReceiptPdf,
  generateTimesheetPdf,
  greeting,
  monthStartISO,
  todayISO,
} from "./utils.js";

export function PunchView() {
  const [status, setStatus] = useState(null);
  const [step, setStep] = useState("home");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function load() {
    pontoApi.punch.status().then(setStatus).catch((e) => setError(e.message));
  }

  useEffect(() => { load(); }, []);

  async function confirmPhoto(photoData) {
    setLoading(true);
    setError("");
    try {
      const data = await pontoApi.punch.register(photoData);
      setResult(data);
      setStep("success");
    } catch (err) {
      setError(err.message);
      setStep("home");
    } finally {
      setLoading(false);
    }
  }

  if (!status) return <p>{error || "Carregando..."}</p>;

  if (step === "camera") {
    return <CameraCapture onCapture={confirmPhoto} onCancel={() => setStep("home")} />;
  }

  if (step === "success" && result) {
    const { record, employee, companyName } = result;
    return (
      <div className="ponto-success">
        <div className="ponto-success-card">
          <h2>Registro realizado com sucesso</h2>
          <p><strong>{PUNCH_LABELS[record.type]}</strong></p>
          <p>{formatDateBR(record.serverDate)} às {record.serverTime?.slice(0, 8)}</p>
          <p>{employee.name}</p>
          <p>Protocolo: <code>{record.protocol}</code></p>
          {record.photoUrl && <img src={record.photoUrl} alt="Selfie" className="ponto-success-photo" />}
          <div className="ponto-success-actions">
            <button type="button" className="button secondary" onClick={() => generateReceiptPdf({ companyName, employee, record })}>Baixar comprovante PDF</button>
            <button type="button" className="button primary" onClick={() => { setStep("home"); setResult(null); load(); }}>Voltar ao início</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ponto-punch">
      <header className="ponto-punch-head">
        <h1>{greeting(status.employee.name)}</h1>
        <p>{new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
      </header>

      {status.schedule && (
        <section className="ponto-schedule-card">
          <h3>Jornada do dia — {status.schedule.name}</h3>
          <div className="ponto-schedule-grid">
            <span>Entrada <strong>{status.schedule.startTime}</strong></span>
            <span>Almoço <strong>{status.schedule.lunchStartTime} – {status.schedule.lunchEndTime}</strong></span>
            <span>Saída <strong>{status.schedule.endTime}</strong></span>
          </div>
        </section>
      )}

      <section className="ponto-today-records">
        <h3>Registros de hoje</h3>
        {status.todayRecords.length === 0 ? (
          <p className="muted-text">Nenhum registro ainda.</p>
        ) : (
          <ul>
            {status.todayRecords.map((r) => (
              <li key={r.id}><strong>{r.typeLabel}</strong> — {r.serverTime?.slice(0, 5)} <code>{r.protocol}</code></li>
            ))}
          </ul>
        )}
      </section>

      {status.allDone ? (
        <div className="ponto-all-done">
          <p>Todos os registros de hoje já foram realizados.</p>
        </div>
      ) : (
        <div className="ponto-punch-action">
          <p>Próximo registro: <strong>{status.nextTypeLabel}</strong></p>
          {error && <p className="ponto-error">{error}</p>}
          <button type="button" className="button primary ponto-btn-punch" disabled={loading} onClick={() => setStep("camera")}>
            {loading ? "Registrando..." : "REGISTRAR PONTO"}
          </button>
        </div>
      )}
    </div>
  );
}

export function MyRecordsView() {
  const [records, setRecords] = useState([]);
  const [startDate, setStartDate] = useState(monthStartISO());
  const [endDate, setEndDate] = useState(todayISO());

  function load() {
    pontoApi.records.list({ startDate, endDate }).then((d) => setRecords(d.records));
  }

  useEffect(() => { load(); }, []);

  return (
    <section className="panel">
      <div className="panel-header"><h2>Meus Registros</h2></div>
      <div className="filter-row">
        <input className="input" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        <input className="input" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        <button type="button" className="button primary" onClick={load}>Filtrar</button>
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Data</th><th>Hora</th><th>Tipo</th><th>Protocolo</th><th>Status</th></tr></thead>
          <tbody>
            {records.map((r) => (
              <tr key={r.id}>
                <td>{formatDateBR(r.serverDate)}</td>
                <td>{r.serverTime?.slice(0, 5)}</td>
                <td>{r.typeLabel}</td>
                <td><code>{r.protocol}</code></td>
                <td>{r.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function MyTimesheetView() {
  const [startDate, setStartDate] = useState(monthStartISO());
  const [endDate, setEndDate] = useState(todayISO());
  const [data, setData] = useState(null);

  async function generate() {
    const result = await pontoApi.timesheet({ startDate, endDate });
    setData(result);
  }

  return (
    <section className="panel">
      <div className="panel-header"><h2>Meu Espelho de Ponto</h2></div>
      <div className="filter-row">
        <input className="input" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        <input className="input" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        <button type="button" className="button primary" onClick={generate}>Gerar</button>
        {data && <button type="button" className="button secondary" onClick={() => generateTimesheetPdf(data)}>PDF</button>}
      </div>
      {data && (
        <>
          <div className="metrics-grid">
            <article className="metric-card"><span>Saldo</span><strong>{data.summary.balanceLabel}</strong></article>
            <article className="metric-card"><span>Trabalhado</span><strong>{data.summary.totalWorkedLabel}</strong></article>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Data</th><th>Entrada</th><th>Saída</th><th>Trabalhado</th><th>Obs.</th></tr></thead>
              <tbody>
                {data.days.filter((d) => d.entry !== "—" || d.observation).map((d) => (
                  <tr key={d.date}>
                    <td>{formatDateBR(d.date)}</td>
                    <td>{d.entry}</td>
                    <td>{d.exit}</td>
                    <td>{d.workedLabel}</td>
                    <td>{d.observation}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}

export function HourBankView() {
  const [data, setData] = useState(null);

  useEffect(() => {
    pontoApi.hourBank().then(setData);
  }, []);

  if (!data) return <p>Carregando...</p>;

  return (
    <section className="panel">
      <div className="panel-header"><h2>Banco de Horas</h2><p>Últimos 30 dias (dias completos)</p></div>
      <div className="ponto-hour-bank">
        <div className={`ponto-balance ${data.balanceMinutes >= 0 ? "positive" : "negative"}`}>
          <span>Saldo atual</span>
          <strong>{data.balanceLabel}</strong>
        </div>
        <div className="metrics-grid">
          <article className="metric-card"><span>Trabalhado</span><strong>{data.totalWorkedLabel}</strong></article>
          <article className="metric-card"><span>Previsto</span><strong>{data.totalExpectedLabel}</strong></article>
          <article className="metric-card warning"><span>Dias incompletos</span><strong>{data.incompleteDays}</strong></article>
        </div>
      </div>
    </section>
  );
}

export function ProfileView() {
  const [profile, setProfile] = useState(null);
  const [passwords, setPasswords] = useState({ currentPassword: "", newPassword: "" });
  const [msg, setMsg] = useState("");

  useEffect(() => {
    pontoApi.profile.get().then(setProfile);
  }, []);

  async function changePassword(e) {
    e.preventDefault();
    try {
      await pontoApi.profile.changePassword(passwords);
      setMsg("Senha alterada com sucesso.");
      setPasswords({ currentPassword: "", newPassword: "" });
    } catch (err) {
      setMsg(err.message);
    }
  }

  if (!profile) return <p>Carregando...</p>;

  return (
    <section className="panel">
      <div className="panel-header"><h2>Meu Perfil</h2></div>
      <div className="ponto-profile">
        <p><strong>{profile.user.name}</strong></p>
        <p>{profile.user.email}</p>
        {profile.employee && (
          <>
            <p>Matrícula: {profile.employee.registrationNumber || "—"}</p>
            <p>Departamento: {profile.employee.department || "—"}</p>
          </>
        )}
        <form onSubmit={changePassword} className="form-grid ponto-password-form">
          <h3>Alterar senha</h3>
          <label>Senha atual<input className="input" type="password" value={passwords.currentPassword} onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })} required /></label>
          <label>Nova senha<input className="input" type="password" value={passwords.newPassword} onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })} required minLength={6} /></label>
          {msg && <p className="muted-text">{msg}</p>}
          <button type="submit" className="button primary">Salvar senha</button>
        </form>
      </div>
    </section>
  );
}

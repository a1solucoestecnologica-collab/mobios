import { useEffect, useState } from "react";
import { PageHeader, PlaceholderCard } from "../components/PageParts.jsx";
import { timeApi } from "../services/api.js";

const KINDS = [
  { id: "FORGOT_ENTRY", label: "Esqueci entrada", punchType: "ENTRY" },
  { id: "FORGOT_EXIT", label: "Esqueci saída", punchType: "EXIT" },
  { id: "FORGOT_LUNCH_OUT", label: "Esqueci saída almoço", punchType: "LUNCH_OUT" },
  { id: "FORGOT_LUNCH_RETURN", label: "Esqueci retorno almoço", punchType: "LUNCH_RETURN" },
  { id: "TIME_ERROR", label: "Erro de horário", punchType: null },
];

const STATUS_LABEL = {
  PENDING: "Pendente",
  APPROVED: "Aprovado",
  REJECTED: "Rejeitado",
  CANCELLED: "Cancelado",
};

export default function RequestsPage() {
  const [requests, setRequests] = useState([]);
  const [form, setForm] = useState(null);
  const [error, setError] = useState("");

  function load() {
    timeApi.adjustments.list().then((d) => setRequests(d.requests || [])).catch((e) => setError(e.message));
  }

  useEffect(() => { load(); }, []);

  async function submit(e) {
    e.preventDefault();
    setError("");
    try {
      const kind = KINDS.find((k) => k.id === form.kind);
      await timeApi.adjustments.create({
        serverDate: form.serverDate,
        kind: form.kind,
        punchType: form.punchType || kind?.punchType,
        requestedTime: form.requestedTime,
        note: form.note,
      });
      setForm(null);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function cancel(id) {
    try {
      await timeApi.adjustments.cancel(id);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="portal-page">
      <PageHeader title="Solicitar Ajuste" subtitle="Envie correções de ponto para análise do administrador" />
      {error && <p className="portal-error">{error}</p>}
      <button type="button" className="button primary portal-action-btn" onClick={() => setForm({ serverDate: new Date().toISOString().slice(0, 10), kind: "FORGOT_ENTRY", requestedTime: "", note: "" })}>
        Nova solicitação
      </button>
      {form && (
        <PlaceholderCard title="Nova solicitação">
          <form className="portal-form" onSubmit={submit}>
            <label>Data<input className="input" type="date" value={form.serverDate} onChange={(e) => setForm({ ...form, serverDate: e.target.value })} required /></label>
            <label>Motivo
              <select className="input" value={form.kind} onChange={(e) => {
                const kind = KINDS.find((k) => k.id === e.target.value);
                setForm({ ...form, kind: e.target.value, punchType: kind?.punchType || form.punchType });
              }} required>
                {KINDS.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}
              </select>
            </label>
            {form.kind === "TIME_ERROR" && (
              <label>Tipo de batida
                <select className="input" value={form.punchType || ""} onChange={(e) => setForm({ ...form, punchType: e.target.value })} required>
                  <option value="">Selecione</option>
                  <option value="ENTRY">Entrada</option>
                  <option value="LUNCH_OUT">Saída almoço</option>
                  <option value="LUNCH_RETURN">Retorno almoço</option>
                  <option value="EXIT">Saída</option>
                </select>
              </label>
            )}
            <label>Horário correto<input className="input" type="time" value={form.requestedTime} onChange={(e) => setForm({ ...form, requestedTime: e.target.value })} required /></label>
            <label>Observação<textarea className="input portal-textarea" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} rows={3} /></label>
            <div className="portal-form-actions">
              <button type="button" className="button ghost" onClick={() => setForm(null)}>Cancelar</button>
              <button type="submit" className="button primary">Enviar</button>
            </div>
          </form>
        </PlaceholderCard>
      )}
      <PlaceholderCard title="Minhas solicitações">
        <ul className="portal-list portal-list--cards">
          {requests.length === 0 ? <li>Nenhuma solicitação.</li> : requests.map((req) => (
            <li key={req.id}>
              <strong>{req.kindLabel || req.kind}</strong>
              <span>{req.serverDate} — {req.requestedTime?.slice(0, 5)}</span>
              <span className="portal-pill">{STATUS_LABEL[req.status] || req.status}</span>
              {req.status === "PENDING" && (
                <button type="button" className="button ghost portal-action-btn--compact" onClick={() => cancel(req.id)}>Cancelar</button>
              )}
            </li>
          ))}
        </ul>
      </PlaceholderCard>
    </div>
  );
}

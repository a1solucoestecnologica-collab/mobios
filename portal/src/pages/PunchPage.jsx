import { useState } from "react";
import { PageHeader, PlaceholderCard, MockNotice } from "../components/PageParts.jsx";
import { timeApi } from "../services/api.js";

export default function PunchPage() {
  const [status, setStatus] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState("");

  async function loadStatus() {
    setError("");
    try {
      const data = await timeApi.punchStatus();
      setStatus(data);
    } catch (err) {
      setStatus(null);
      setError(err.message);
    }
  }

  async function registerPunch() {
    setLoading(true);
    setDone("");
    setError("");
    try {
      await timeApi.punch();
      setDone("Registro solicitado ao MÖBI Time.");
      await loadStatus();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="portal-page">
      <PageHeader
        title="Registrar Ponto"
        subtitle="Ação executada via API do MÖBI Time — sem regra de negócio no Portal."
      />
      {error && (
        <PlaceholderCard variant="warn">
          <MockNotice>
            API indisponível no contexto atual ({error}). Exibindo modo demonstração.
          </MockNotice>
          <p className="portal-demo-punch">08:00 — Entrada (simulado)</p>
        </PlaceholderCard>
      )}
      {status && (
        <PlaceholderCard title="Status atual">
          <pre className="portal-json-preview">{JSON.stringify(status, null, 2)}</pre>
        </PlaceholderCard>
      )}
      <div className="portal-actions">
        <button type="button" className="portal-btn portal-btn--ghost" onClick={loadStatus}>
          Consultar status
        </button>
        <button type="button" className="portal-btn portal-btn--primary" disabled={loading} onClick={registerPunch}>
          {loading ? "Registrando…" : "Registrar agora"}
        </button>
      </div>
      {done && <p className="portal-success">{done}</p>}
    </div>
  );
}

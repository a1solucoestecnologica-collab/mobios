import { useEffect, useState } from "react";
import { PageHeader, PlaceholderCard, MockNotice } from "../components/PageParts.jsx";
import { MOCK_HOUR_BANK } from "../assets/mockData.js";
import { timeApi } from "../services/api.js";

export default function HourBankPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    timeApi.hourBank().then(setData).catch((err) => setError(err.message));
  }, []);

  const bank = data?.balance != null ? data : MOCK_HOUR_BANK;

  return (
    <div className="portal-page">
      <PageHeader title="Banco de Horas" subtitle="Consulta via MÖBI Time" />
      {error && <MockNotice>Dados simulados — {error}</MockNotice>}
      <PlaceholderCard>
        <p className="portal-big-value">{bank.balance}</p>
        <p className="portal-muted">{bank.period}</p>
      </PlaceholderCard>
    </div>
  );
}

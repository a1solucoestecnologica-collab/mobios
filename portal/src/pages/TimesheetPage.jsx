import { useEffect, useState } from "react";
import { PageHeader, PlaceholderCard, MockNotice } from "../components/PageParts.jsx";
import { MOCK_TIMESHEET } from "../assets/mockData.js";
import { timeApi } from "../services/api.js";

export default function TimesheetPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    timeApi.timesheet().then(setData).catch((err) => setError(err.message));
  }, []);

  const sheet = data || MOCK_TIMESHEET;

  return (
    <div className="portal-page">
      <PageHeader title="Meu Espelho de Ponto" subtitle="Consulta via MÖBI Time" />
      {error && <MockNotice>Dados simulados — {error}</MockNotice>}
      <PlaceholderCard title={sheet.month || "Período"}>
        <ul className="portal-list">
          {(sheet.days || MOCK_TIMESHEET.days).map((day) => (
            <li key={day.date}>
              <strong>{day.date}</strong>
              <span>{day.entries}</span>
              <em>{day.total}</em>
            </li>
          ))}
        </ul>
      </PlaceholderCard>
    </div>
  );
}

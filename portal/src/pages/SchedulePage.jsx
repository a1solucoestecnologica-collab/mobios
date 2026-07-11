import { useEffect, useState } from "react";
import { PageHeader, PlaceholderCard } from "../components/PageParts.jsx";
import { timeApi } from "../services/api.js";

function weekRange() {
  const now = new Date();
  const day = now.getDay();
  const start = new Date(now);
  start.setDate(now.getDate() - day);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const fmt = (d) => d.toISOString().slice(0, 10);
  return { start: fmt(start), end: fmt(end) };
}

export default function SchedulePage() {
  const [days, setDays] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const { start, end } = weekRange();
    timeApi.scheduleRange(start, end)
      .then((d) => setDays(d.days || []))
      .catch((e) => setError(e.message));
  }, []);

  return (
    <div className="portal-page">
      <PageHeader title="Minha Escala" subtitle="Configurada no MÖBI Time pelo administrador" />
      {error && <p className="portal-error">{error}</p>}
      <PlaceholderCard title="Semana atual">
        <ul className="portal-list">
          {days.length === 0 ? <li>Carregando escala...</li> : days.map((row) => (
            <li key={row.date}>
              <strong>{row.weekday}</strong>
              {row.off || !row.schedule ? (
                <span>Folga / sem expediente</span>
              ) : (
                <>
                  <span>{row.schedule.startTime?.slice(0, 5)} — {row.schedule.endTime?.slice(0, 5)}</span>
                  {row.schedule.lunchStartTime && (
                    <em>Almoço {row.schedule.lunchStartTime?.slice(0, 5)} — {row.schedule.lunchEndTime?.slice(0, 5)}</em>
                  )}
                </>
              )}
            </li>
          ))}
        </ul>
      </PlaceholderCard>
    </div>
  );
}

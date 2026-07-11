import { useEffect, useMemo, useRef, useState } from "react";

const WEEKDAY_SHORT = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const MONTHS_LONG = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

function pad(value) {
  return String(value).padStart(2, "0");
}

function iso(year, month, day) {
  return `${year}-${pad(month + 1)}-${pad(day)}`;
}

// Calendario proprio (branco, maior) para escolher o dia da agenda.
// Fecha ao clicar fora ou ao escolher um dia.
export default function DatePicker({ value, onSelect, onClose }) {
  const ref = useRef(null);
  const [year, month] = value.split("-").map(Number);
  const [view, setView] = useState({ year, month: month - 1 });

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (ref.current && !ref.current.contains(event.target)) onClose();
    };
    const handleKey = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKey);
    };
  }, [onClose]);

  const todayIso = useMemo(() => {
    const now = new Date();
    return iso(now.getFullYear(), now.getMonth(), now.getDate());
  }, []);

  const weeks = useMemo(() => {
    const firstWeekday = new Date(view.year, view.month, 1).getDay();
    const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < firstWeekday; i += 1) cells.push(null);
    for (let day = 1; day <= daysInMonth; day += 1) cells.push(day);
    while (cells.length % 7 !== 0) cells.push(null);
    const rows = [];
    for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
    return rows;
  }, [view]);

  const changeMonth = (amount) => {
    setView((current) => {
      const date = new Date(current.year, current.month + amount, 1);
      return { year: date.getFullYear(), month: date.getMonth() };
    });
  };

  return (
    <div className="wm-calendar" ref={ref}>
      <div className="wm-calendar-head">
        <button type="button" className="wm-calendar-nav" onClick={() => changeMonth(-1)} aria-label="Mês anterior">
          ‹
        </button>
        <span className="wm-calendar-title">
          {MONTHS_LONG[view.month]} de {view.year}
        </span>
        <button type="button" className="wm-calendar-nav" onClick={() => changeMonth(1)} aria-label="Próximo mês">
          ›
        </button>
      </div>

      <div className="wm-calendar-weekdays">
        {WEEKDAY_SHORT.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>

      <div className="wm-calendar-grid">
        {weeks.map((row, rowIndex) =>
          row.map((day, dayIndex) => {
            if (!day) return <span key={`${rowIndex}-${dayIndex}`} className="wm-calendar-empty" />;
            const cellIso = iso(view.year, view.month, day);
            const isSelected = cellIso === value;
            const isToday = cellIso === todayIso;
            return (
              <button
                key={cellIso}
                type="button"
                className={`wm-calendar-day${isSelected ? " is-selected" : ""}${isToday ? " is-today" : ""}`}
                onClick={() => {
                  onSelect(cellIso);
                  onClose();
                }}
              >
                {day}
              </button>
            );
          }),
        )}
      </div>

      <div className="wm-calendar-foot">
        <button
          type="button"
          className="wm-calendar-today"
          onClick={() => {
            onSelect(todayIso);
            onClose();
          }}
        >
          Hoje
        </button>
      </div>
    </div>
  );
}

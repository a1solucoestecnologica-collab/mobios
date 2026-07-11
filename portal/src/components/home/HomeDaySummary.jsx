export default function HomeDaySummary({ summary, hoursWorked }) {
  if (!summary?.checks?.length) return null;

  return (
    <section className="portal-home-summary">
      <h2>Resumo do dia</h2>
      <ul className="portal-home-summary-list">
        {summary.checks.map((item) => (
          <li key={item.label} className={item.done ? "is-done" : ""}>
            <span className="portal-home-summary-mark" aria-hidden="true">
              {item.done ? "✔" : "○"}
            </span>
            <span>{item.label}</span>
            {item.value && <em>{item.value}</em>}
          </li>
        ))}
        {hoursWorked && (
          <li className="is-done">
            <span className="portal-home-summary-mark" aria-hidden="true">✔</span>
            <span>Horas trabalhadas</span>
            <em>{hoursWorked}</em>
          </li>
        )}
      </ul>
    </section>
  );
}

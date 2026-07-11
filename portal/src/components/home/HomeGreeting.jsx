export default function HomeGreeting({ greeting, firstName, today, schedule, phase }) {
  const scheduleHint =
    phase === "day_complete"
      ? "Jornada concluída hoje."
      : schedule?.start
        ? `Sua jornada inicia às ${schedule.start}.`
        : null;

  return (
    <header className="portal-home-greeting portal-ios-large-title">
      <p className="portal-home-greeting-eyebrow">{greeting},</p>
      <h1>{firstName}</h1>
      <p className="portal-home-greeting-date">Hoje é {today}.</p>
      {scheduleHint && <p className="portal-home-greeting-hint">{scheduleHint}</p>}
    </header>
  );
}

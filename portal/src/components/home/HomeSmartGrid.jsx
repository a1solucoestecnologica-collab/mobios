import { HOME_PHASES } from "../../services/homeContext.js";

export default function HomeSmartGrid({ context, onNavigate, canPunch, onPunchShortcut }) {
  const { phase, punch, tasks, checklists, notices, requests, hourBank, schedule } = context;
  const isComplete = phase === HOME_PHASES.DAY_COMPLETE;

  const cards = [];

  if (!isComplete && canPunch && punch?.nextAction && phase !== HOME_PHASES.BEFORE_ENTRY) {
    cards.push({
      key: "punch",
      icon: "⏰",
      title: "Registrar Ponto",
      value: punch.nextAction.label,
      onClick: onPunchShortcut,
      accent: true,
    });
  }

  if (!isComplete) {
    if (tasks.pending > 0) {
      cards.push({
        key: "tasks",
        icon: "📋",
        title: "Tarefas",
        value: `${tasks.pending} pendentes`,
        hint: tasks.next?.title,
        badge: tasks.pending,
        onClick: () => onNavigate("tasks"),
      });
    }

    if (checklists.pending > 0) {
      cards.push({
        key: "checklists",
        icon: "✅",
        title: "Checklists",
        value: `${checklists.pending} pendentes`,
        hint: checklists.current ? `${checklists.current.title} (${checklists.current.progress})` : null,
        badge: checklists.pending,
        onClick: () => onNavigate("checklists"),
      });
    }

    if (notices.unread > 0) {
      cards.push({
        key: "notices",
        icon: "🔔",
        title: "Comunicados",
        value: `${notices.unread} novo${notices.unread > 1 ? "s" : ""}`,
        hint: notices.items[0]?.title,
        badge: notices.unread,
        onClick: () => onNavigate("notices"),
      });
    }

    if (requests.pending > 0) {
      cards.push({
        key: "requests",
        icon: "📝",
        title: "Solicitações",
        value: `${requests.pending} aguardando`,
        onClick: () => onNavigate("requests"),
      });
    }

    if (context.documents?.unread > 0) {
      cards.push({
        key: "documents",
        icon: "📄",
        title: "Documentos",
        value: `${context.documents.unread} para ler`,
        onClick: () => onNavigate("documents"),
      });
    }

    cards.push({
      key: "journey",
      icon: "📆",
      title: "Minha Jornada Hoje",
      value: schedule?.label || "—",
      hint: schedule?.lunch ? `Almoço ${schedule.lunch}` : null,
      onClick: () => onNavigate("schedule"),
    });

    if (hourBank?.balance) {
      cards.push({
        key: "hour-bank",
        icon: "🕒",
        title: "Banco de Horas",
        value: hourBank.balance,
        onClick: () => onNavigate("hour-bank"),
      });
    }

    if (tasks.next) {
      cards.push({
        key: "next-task",
        icon: "▶",
        title: "Próxima Tarefa",
        value: tasks.next.title,
        hint: tasks.next.status,
        onClick: () => onNavigate("tasks"),
      });
    }

    if (checklists.current) {
      cards.push({
        key: "current-checklist",
        icon: "☑",
        title: "Checklist Atual",
        value: checklists.current.title,
        hint: checklists.current.progress,
        onClick: () => onNavigate("checklists"),
      });
    }
  }

  if (cards.length === 0) return null;

  return (
    <section className="portal-home-grid" aria-label="Ações e informações do dia">
      <h2 className="portal-ios-section-title">
        {isComplete ? "Tudo certo por hoje" : "O que fazer agora"}
      </h2>
      <ul className="portal-ios-group">
        {cards.map((card) => (
          <li key={card.key}>
            <button
              type="button"
              className={`portal-ios-row ${card.accent ? "is-accent" : ""}`}
              onClick={card.onClick}
            >
              <span className="portal-ios-row-icon" aria-hidden="true">{card.icon}</span>
              <span className="portal-ios-row-body">
                <strong>{card.title}</strong>
                {card.value && <span>{card.value}</span>}
                {card.hint && <small>{card.hint}</small>}
              </span>
              {card.badge != null && card.badge > 0 && (
                <span className="portal-ios-badge">{card.badge}</span>
              )}
              <span className="portal-ios-chevron" aria-hidden="true">›</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

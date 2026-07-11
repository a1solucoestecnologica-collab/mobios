import { useCallback, useEffect, useState } from "react";
import HomeGreeting from "../components/home/HomeGreeting.jsx";
import HomeHeroAction from "../components/home/HomeHeroAction.jsx";
import HomeSmartGrid from "../components/home/HomeSmartGrid.jsx";
import HomeDaySummary from "../components/home/HomeDaySummary.jsx";
import {
  HOME_PHASES,
  loadHomeContext,
  executePunchAction,
  simulatePunchAdvance,
} from "../services/homeContext.js";
import { PORTAL_DEMO_MODE } from "../config.js";

export default function HomePage({ person, permissions, onNavigate }) {
  const [context, setContext] = useState(null);
  const [loading, setLoading] = useState(true);
  const [punchLoading, setPunchLoading] = useState(false);
  const [localPunch, setLocalPunch] = useState(null);
  const [toast, setToast] = useState("");

  const canPunch = permissions?.some((p) => p.code === "time.clock");

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const ctx = await loadHomeContext(localPunch);
      setContext(ctx);
    } finally {
      setLoading(false);
    }
  }, [localPunch]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function handlePunch() {
    if (!canPunch) return;
    setPunchLoading(true);
    setToast("");
    const result = await executePunchAction();
    if (result.ok) {
      setToast("Ponto registrado via MÖBI Time.");
      setLocalPunch(null);
      await refresh();
    } else if (PORTAL_DEMO_MODE) {
      const advanced = simulatePunchAdvance(localPunch || context?.punch);
      setLocalPunch(advanced);
      setToast("Modo demonstração — simulação local do ponto.");
    } else {
      setToast(result.error || "Não foi possível registrar o ponto.");
    }
    setPunchLoading(false);
  }

  if (loading && !context) {
    return <div className="portal-home-loading">Preparando seu dia…</div>;
  }

  if (!context) return null;

  const firstName = person?.name?.split(" ")[0] || "Colaborador";
  const showHero =
    canPunch &&
    context.phase !== HOME_PHASES.DAY_COMPLETE &&
    context.punch?.nextAction &&
    (context.phase === HOME_PHASES.BEFORE_ENTRY ||
      context.phase === HOME_PHASES.LUNCH_OUT ||
      context.phase === HOME_PHASES.LUNCH_RETURN ||
      context.phase === HOME_PHASES.BEFORE_EXIT);

  const agendaItems = [];
  if (context.punch?.nextAction && context.phase === HOME_PHASES.BEFORE_ENTRY) {
    agendaItems.push(context.punch.nextAction.label);
  }
  if (context.tasks.pending > 0) agendaItems.push(`${context.tasks.pending} tarefas`);
  if (context.checklists.pending > 0) agendaItems.push(`${context.checklists.pending} checklists`);
  if (context.notices.unread > 0) agendaItems.push(`${context.notices.unread} comunicado${context.notices.unread > 1 ? "s" : ""}`);
  if (context.hourBank?.balance) agendaItems.push("Banco de horas");
  if (context.schedule?.label) agendaItems.push("Escala de hoje");

  return (
    <div className="portal-page portal-home">
      <HomeGreeting
        greeting={context.greeting}
        firstName={firstName}
        today={context.today}
        schedule={context.schedule}
        phase={context.phase}
      />

      {agendaItems.length > 0 && context.phase !== HOME_PHASES.DAY_COMPLETE && (
        <section className="portal-home-agenda">
          <p className="portal-home-agenda-label">Você possui:</p>
          <ul className="portal-home-agenda-list">
            {agendaItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      )}

      {showHero && (
        <HomeHeroAction
          action={context.punch.nextAction}
          loading={punchLoading}
          onAction={handlePunch}
        />
      )}

      {toast && <p className="portal-home-toast">{toast}</p>}

      {context.phase === HOME_PHASES.DAY_COMPLETE ? (
        <HomeDaySummary summary={context.summary} hoursWorked={context.punch?.hoursWorked} />
      ) : (
        <HomeSmartGrid
          context={context}
          onNavigate={onNavigate}
          canPunch={canPunch}
          onPunchShortcut={handlePunch}
        />
      )}

      {context.apiErrors?.punch && context.punch?.source === "placeholder" && (
        <p className="portal-home-api-hint">Ponto: dados preparados para integração com o MÖBI Time.</p>
      )}
    </div>
  );
}

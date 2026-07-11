/**
 * Contexto da Home — agrega respostas de APIs oficiais.
 * Não implementa regras de ponto/jornada; apenas normaliza dados para a UI.
 */
import {
  MOCK_CHECKLISTS,
  MOCK_HOME_CONTEXT,
  MOCK_HOUR_BANK,
  MOCK_NOTICES,
  MOCK_REQUESTS,
  MOCK_SCHEDULE,
  MOCK_TASKS,
} from "../assets/mockData.js";
import { PORTAL_DEMO_MODE } from "../config.js";
import { timeApi, workmapsApi } from "./api.js";

/** Fases de apresentação (UI) derivadas dos dados consumidos. */
export const HOME_PHASES = {
  BEFORE_ENTRY: "before_entry",
  WORKING: "working",
  LUNCH_OUT: "lunch_out",
  LUNCH_RETURN: "lunch_return",
  BEFORE_EXIT: "before_exit",
  DAY_COMPLETE: "day_complete",
};

function todayLabel() {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());
}

function greetingLabel() {
  const hour = new Date().getHours();
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

function capitalize(text) {
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Deriva fase visual a partir do payload do Time (ou placeholder).
 * A regra de jornada pertence ao MÖBI Time — aqui só interpretamos o estado retornado.
 */
export function deriveHomePhase(punch) {
  if (!punch) return HOME_PHASES.BEFORE_ENTRY;
  if (punch.phase) return punch.phase;
  if (punch.dayComplete) return HOME_PHASES.DAY_COMPLETE;
  if (punch.nextAction?.type === "IN") return HOME_PHASES.BEFORE_ENTRY;
  if (punch.nextAction?.type === "LUNCH_OUT") return HOME_PHASES.LUNCH_OUT;
  if (punch.nextAction?.type === "LUNCH_IN") return HOME_PHASES.LUNCH_RETURN;
  if (punch.nextAction?.type === "OUT") return HOME_PHASES.BEFORE_EXIT;
  if (punch.nextAction?.type === "NONE" && punch.hasEntry) return HOME_PHASES.WORKING;
  return HOME_PHASES.WORKING;
}

function buildPunchFromApi(data) {
  if (!data || typeof data !== "object") return null;
  return {
    phase: data.phase || null,
    dayComplete: Boolean(data.dayComplete),
    hasEntry: Boolean(data.hasEntry ?? data.todayRecords?.some?.((r) => r.type === "IN")),
    nextAction: data.nextAction || data.suggestedAction || null,
    todayRecords: data.todayRecords || data.records || [],
    schedule: data.schedule || data.workSchedule || null,
    hoursWorked: data.hoursWorked || data.workedToday || null,
    source: "api",
  };
}

function buildPlaceholderPunch(override = null) {
  const base = { ...MOCK_HOME_CONTEXT.punch, ...(override || {}) };
  return { ...base, source: "placeholder" };
}

export async function loadHomeContext(localPunchOverride = null) {
  const [punchRes, hourBankRes, plannerRes, profileRes, noticesRes, requestsRes, documentsRes] = await Promise.allSettled([
    timeApi.punchStatus(),
    timeApi.hourBank(),
    workmapsApi.portalSummary(),
    timeApi.profile(),
    timeApi.notices.list(),
    timeApi.adjustments.list(),
    timeApi.documents.list(),
  ]);

  let punch = buildPunchFromApi(punchRes.status === "fulfilled" ? punchRes.value : null);
  if (!punch && PORTAL_DEMO_MODE) punch = buildPlaceholderPunch(localPunchOverride);

  const hourBank =
    hourBankRes.status === "fulfilled" && hourBankRes.value?.balance != null
      ? { balance: hourBankRes.value.balance, period: hourBankRes.value.period || "Acumulado", source: "api" }
      : PORTAL_DEMO_MODE
        ? { ...MOCK_HOUR_BANK, source: "placeholder" }
        : { balance: null, period: null, source: "error" };

  const plannerData = plannerRes.status === "fulfilled" ? plannerRes.value : null;
  const tasksFromApi = plannerData?.tasks || [];
  const checklistsFromApi = plannerData?.checklists || [];

  const tasksPending = tasksFromApi.length || (PORTAL_DEMO_MODE ? MOCK_TASKS.filter((t) => t.status !== "Concluída").length : 0);
  const checklistsPending = checklistsFromApi.length || (PORTAL_DEMO_MODE ? MOCK_CHECKLISTS.length : 0);
  const noticesFromApi = noticesRes.status === "fulfilled" ? noticesRes.value?.notices || [] : [];
  const requestsFromApi = requestsRes.status === "fulfilled" ? requestsRes.value?.requests || [] : [];
  const documentsFromApi = documentsRes.status === "fulfilled" ? documentsRes.value?.documents || [] : [];

  const noticesUnread = noticesFromApi.filter((n) => !n.read).length
    || (PORTAL_DEMO_MODE ? MOCK_NOTICES.filter((n) => n.unread).length : 0);
  const requestsPending = requestsFromApi.filter((r) => r.status === "PENDING").length
    || (PORTAL_DEMO_MODE ? MOCK_REQUESTS.length : 0);
  const documentsUnread = documentsFromApi.filter((d) => d.requiresAck && !d.read).length;

  const phase = deriveHomePhase(punch);
  const profile = profileRes.status === "fulfilled" ? profileRes.value : null;
  const scheduleFromApi = punch?.schedule || profile?.employee?.workScheduleId
    ? punch?.schedule
    : null;

  return {
    greeting: greetingLabel(),
    today: capitalize(todayLabel()),
    punch,
    phase,
    hourBank,
    schedule: scheduleFromApi || (PORTAL_DEMO_MODE ? MOCK_HOME_CONTEXT.scheduleToday || MOCK_SCHEDULE : null),
    profile,
    tasks: {
      pending: tasksPending,
      next: tasksFromApi[0] || (PORTAL_DEMO_MODE ? MOCK_TASKS[0] : null),
      items: tasksFromApi,
      source: plannerRes.status === "fulfilled" ? "api" : PORTAL_DEMO_MODE ? "placeholder" : "error",
    },
    checklists: {
      pending: checklistsPending,
      current: checklistsFromApi[0] || (PORTAL_DEMO_MODE ? MOCK_CHECKLISTS[0] : null),
      items: checklistsFromApi,
      source: plannerRes.status === "fulfilled" ? "api" : PORTAL_DEMO_MODE ? "placeholder" : "error",
    },
    notices: {
      unread: noticesUnread,
      items: noticesFromApi.length ? noticesFromApi.filter((n) => !n.read) : (PORTAL_DEMO_MODE ? MOCK_NOTICES.filter((n) => n.unread) : []),
      source: noticesRes.status === "fulfilled" ? "api" : PORTAL_DEMO_MODE ? "placeholder" : "unavailable",
    },
    requests: {
      pending: requestsPending,
      items: requestsFromApi.length ? requestsFromApi.filter((r) => r.status === "PENDING") : (PORTAL_DEMO_MODE ? MOCK_REQUESTS : []),
      source: requestsRes.status === "fulfilled" ? "api" : PORTAL_DEMO_MODE ? "placeholder" : "unavailable",
    },
    documents: {
      unread: documentsUnread,
      items: documentsFromApi.filter((d) => d.requiresAck && !d.read),
      source: documentsRes.status === "fulfilled" ? "api" : "unavailable",
    },
    summary: PORTAL_DEMO_MODE ? MOCK_HOME_CONTEXT.daySummary || null : null,
    demoMode: PORTAL_DEMO_MODE,
    apiErrors: {
      punch: punchRes.status === "rejected" ? punchRes.reason?.message : null,
      hourBank: hourBankRes.status === "rejected" ? hourBankRes.reason?.message : null,
      planner: plannerRes.status === "rejected" ? plannerRes.reason?.message : null,
    },
  };
}

/** Simula avanço local quando a API do Time ainda não responde (placeholder). */
export function simulatePunchAdvance(currentPunch) {
  const flow = [
    { phase: HOME_PHASES.BEFORE_ENTRY, nextAction: { type: "IN", label: "Registrar Entrada" } },
    { phase: HOME_PHASES.WORKING, nextAction: { type: "LUNCH_OUT", label: "Registrar Saída para Almoço" }, hasEntry: true },
    { phase: HOME_PHASES.LUNCH_OUT, nextAction: { type: "LUNCH_IN", label: "Registrar Retorno do Almoço" }, hasEntry: true },
    { phase: HOME_PHASES.LUNCH_RETURN, nextAction: { type: "OUT", label: "Registrar Saída" }, hasEntry: true },
    { phase: HOME_PHASES.BEFORE_EXIT, nextAction: { type: "OUT", label: "Registrar Saída" }, hasEntry: true },
    {
      phase: HOME_PHASES.DAY_COMPLETE,
      dayComplete: true,
      nextAction: null,
      hasEntry: true,
      hoursWorked: "8h04",
      todayRecords: [
        { type: "IN", time: "08:02" },
        { type: "LUNCH_OUT", time: "12:01" },
        { type: "LUNCH_IN", time: "13:00" },
        { type: "OUT", time: "17:05" },
      ],
    },
  ];

  const idx = flow.findIndex((step) => step.phase === (currentPunch?.phase || HOME_PHASES.BEFORE_ENTRY));
  const next = flow[Math.min(idx + 1, flow.length - 1)];
  return { ...currentPunch, ...next, source: "placeholder" };
}

export async function executePunchAction() {
  try {
    const result = await timeApi.punch();
    return { ok: true, data: result, source: "api" };
  } catch (error) {
    return { ok: false, error: error.message, source: "placeholder" };
  }
}

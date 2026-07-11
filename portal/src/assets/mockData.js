/** Dados simulados — usados quando a API do aplicativo ainda não está disponível no contexto do Portal. */
export const MOCK_HOME_CONTEXT = {
  punch: {
    phase: "before_entry",
    dayComplete: false,
    hasEntry: false,
    nextAction: { type: "IN", label: "Registrar Entrada" },
    todayRecords: [],
    schedule: { start: "08:00", end: "17:00", lunchStart: "12:00", lunchEnd: "13:00" },
    hoursWorked: null,
  },
  scheduleToday: {
    label: "08:00 – 17:00",
    lunch: "12:00 – 13:00",
    start: "08:00",
  },
  daySummary: {
    checks: [
      { label: "Entrada registrada", done: true },
      { label: "Saída registrada", done: true },
      { label: "Jornada concluída", done: true },
      { label: "Horas trabalhadas", value: "8h04" },
      { label: "Tarefas concluídas", value: "2" },
      { label: "Checklists concluídos", value: "1" },
      { label: "Pendências", value: "1 solicitação" },
    ],
  },
};

export const MOCK_HOME = {
  quickActions: [
    { icon: "⏰", label: "Próximo registro", hint: "Consulte Registrar Ponto" },
    { icon: "📋", label: "Tarefas abertas", hint: "3 em andamento (simulado)" },
    { icon: "🔔", label: "Avisos", hint: "1 não lido (simulado)" },
  ],
};

export const MOCK_TIMESHEET = {
  month: "Julho 2026",
  days: [
    { date: "08/07", entries: "08:02 – 12:01 · 13:00 – 17:05", total: "8h04" },
    { date: "09/07", entries: "07:58 – 12:00 · 13:02 – 17:10", total: "8h10" },
    { date: "10/07", entries: "08:00 – 12:00 · 13:00 – —", total: "4h00" },
  ],
};

export const MOCK_HOUR_BANK = { balance: "+12h40", period: "Acumulado 2026" };

export const MOCK_SCHEDULE = {
  week: [
    { day: "Seg", hours: "08:00 – 17:00", lunch: "12:00 – 13:00" },
    { day: "Ter", hours: "08:00 – 17:00", lunch: "12:00 – 13:00" },
    { day: "Qua", hours: "08:00 – 17:00", lunch: "12:00 – 13:00" },
    { day: "Qui", hours: "08:00 – 17:00", lunch: "12:00 – 13:00" },
    { day: "Sex", hours: "08:00 – 16:00", lunch: "12:00 – 13:00" },
  ],
};

export const MOCK_TASKS = [
  { id: 1, title: "Montagem bancada — Obra 204", status: "Em andamento" },
  { id: 2, title: "Conferência de ferragens", status: "Pendente" },
];

export const MOCK_CHECKLISTS = [
  { id: 1, title: "Checklist de segurança", progress: "4/6" },
  { id: 2, title: "Entrega de obra", progress: "0/8" },
];

export const MOCK_DOCUMENTS = [
  { id: 1, title: "Contrato de trabalho", type: "PDF" },
  { id: 2, title: "ASO — 2026", type: "PDF" },
];

export const MOCK_REQUESTS = [
  { id: 1, title: "Ajuste de ponto — 09/07", status: "Aguardando" },
];

export const MOCK_NOTICES = [
  { id: 1, title: "Reunião de segurança", date: "11/07/2026", unread: true },
  { id: 2, title: "Feriado municipal", date: "15/07/2026", unread: false },
];

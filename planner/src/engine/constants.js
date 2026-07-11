// Estados possiveis de um bloco dentro de uma execucao.
// Nada alem destes quatro deve existir.
export const BLOCK_STATES = Object.freeze({
  NOT_STARTED: "not_started",
  IN_PROGRESS: "in_progress",
  DONE: "done",
  CANCELLED: "cancelled",
});

export const BLOCK_STATE_LABELS = Object.freeze({
  not_started: "Não iniciado",
  in_progress: "Em andamento",
  done: "Concluído",
  cancelled: "Cancelado",
});

export const TERMINAL_STATES = Object.freeze([BLOCK_STATES.DONE, BLOCK_STATES.CANCELLED]);

// Paleta padrao para os blocos. O usuario nao esta preso a ela.
export const BLOCK_COLORS = Object.freeze([
  "#2f6df6",
  "#16a34a",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#0ea5e9",
  "#64748b",
]);

export const DEFAULT_BLOCK_COLOR = BLOCK_COLORS[0];

// Paleta de etiquetas (labels) do cartao, estilo Trello.
export const LABEL_COLORS = Object.freeze([
  { color: "#61bd4f", name: "Verde" },
  { color: "#f2d600", name: "Amarelo" },
  { color: "#ff9f1a", name: "Laranja" },
  { color: "#eb5a46", name: "Vermelho" },
  { color: "#c377e0", name: "Roxo" },
  { color: "#0079bf", name: "Azul" },
  { color: "#00c2e0", name: "Ciano" },
  { color: "#51e898", name: "Verde-claro" },
  { color: "#ff78cb", name: "Rosa" },
  { color: "#344563", name: "Cinza" },
]);

// Opcoes de recorrencia do cartao.
export const RECURRENCE_OPTIONS = Object.freeze([
  { value: "none", label: "Não repete" },
  { value: "daily", label: "Diariamente" },
  { value: "weekly", label: "Semanalmente" },
  { value: "biweekly", label: "Quinzenalmente" },
  { value: "monthly", label: "Mensalmente" },
]);

// Opcoes de lembrete do cartao.
export const REMINDER_OPTIONS = Object.freeze([
  { value: "none", label: "Sem lembrete" },
  { value: "at_time", label: "Na hora de entrega" },
  { value: "5m", label: "5 minutos antes" },
  { value: "1h", label: "1 hora antes" },
  { value: "1d", label: "1 dia antes" },
]);

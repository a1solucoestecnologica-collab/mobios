import { BLOCK_STATES, DEFAULT_BLOCK_COLOR, TERMINAL_STATES } from "./constants.js";

// ---------------------------------------------------------------------------
// Engine de Mapas de Trabalho.
// Funcoes puras. NAO depende de React, do DOM, nem da rede.
// Conhece apenas: blocos, conexoes e execucoes.
// ---------------------------------------------------------------------------

export function createId(prefix) {
  const random =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : Math.random().toString(16).slice(2);
  return `${prefix}-${Date.now().toString(36)}-${random.replace(/-/g, "").slice(0, 8)}`;
}

export function createBlock({ x = 0, y = 0, title = "Novo bloco", kind = "block", listId = null } = {}) {
  const now = new Date().toISOString();
  return {
    id: createId("blk"),
    title,
    description: "",
    checklist: [],
    checklists: [],
    attachments: [],
    color: DEFAULT_BLOCK_COLOR,
    kind,
    routes: [],
    labels: [],
    members: [],
    startDate: null,
    startTime: null,
    dueDate: null,
    endTime: null,
    dueTime: null,
    recurrence: "none",
    reminder: "none",
    completed: false,
    listId,
    boardOrder: 0,
    positionX: Math.round(x),
    positionY: Math.round(y),
    createdAt: now,
    updatedAt: now,
  };
}

// Um cartao e um bloco que nasce dentro de uma coluna (lista) do Quadro.
export function createCard({ listId, title = "Novo cartão", boardOrder = 0, x = 0, y = 0 } = {}) {
  const block = createBlock({ x, y, title, kind: "block", listId });
  block.boardOrder = boardOrder;
  return block;
}

// Uma coluna do Quadro.
export function createList(title = "Nova lista", position = 0) {
  const now = new Date().toISOString();
  return { id: createId("lst"), title, position, createdAt: now };
}

export function createLabel(color = "#2f6df6", text = "") {
  return { id: createId("lbl"), color, text };
}

// Checklist agrupado: um grupo com nome e seus itens.
export function createChecklistGroup(name = "Checklist") {
  return { id: createId("chl"), name, items: [] };
}

// Progresso somando todos os grupos de checklist do cartao.
export function checklistProgress(checklists) {
  const items = (checklists || []).flatMap((group) => group.items || []);
  const total = items.length;
  const done = items.filter((item) => item.done).length;
  return { total, done, ratio: total ? done / total : 0 };
}

// Uma rota e apenas uma saida nomeada do bloco ancora.
export function createRoute(label = "") {
  const route = { id: createId("rot"), label };
  return route;
}

// Bloco ancora: ponto de partida com N rotas de saida (comeca com 2, mas o usuario adiciona quantas quiser).
export function createAnchorBlock({ x = 0, y = 0 } = {}) {
  const block = createBlock({ x, y, title: "Âncora", kind: "anchor" });
  block.color = "#0f172a";
  block.routes = [createRoute("Rota 1"), createRoute("Rota 2")];
  return block;
}

export function duplicateBlock(block, offset = 40) {
  return {
    ...structuredCloneSafe(block),
    id: createId("blk"),
    title: `${block.title} (cópia)`,
    positionX: block.positionX + offset,
    positionY: block.positionY + offset,
    checklist: (block.checklist || []).map((item) => ({ ...item, id: createId("chk") })),
  };
}

export function createConnection(source, target) {
  return { id: createId("cxn"), source, target };
}

export function createChecklistItem(text = "") {
  return { id: createId("chk"), text, done: false, assignee: null, dueDate: null };
}

export function createAttachment({ name = "", url = "" } = {}) {
  return { id: createId("att"), name, url };
}

// Ordena os blocos seguindo o grafo de conexoes (topologico simples com BFS).
// Blocos sem entrada sao raizes. Fallback: ordem de criacao.
export function orderBlocks(blocks, connections) {
  if (!blocks.length) return [];

  const byId = new Map(blocks.map((block) => [block.id, block]));
  const incoming = new Map(blocks.map((block) => [block.id, 0]));
  const adjacency = new Map(blocks.map((block) => [block.id, []]));

  for (const connection of connections) {
    if (!byId.has(connection.source) || !byId.has(connection.target)) continue;
    adjacency.get(connection.source).push(connection.target);
    incoming.set(connection.target, incoming.get(connection.target) + 1);
  }

  const creationOrder = [...blocks].sort((a, b) =>
    String(a.createdAt || "").localeCompare(String(b.createdAt || "")),
  );

  const queue = creationOrder.filter((block) => incoming.get(block.id) === 0);
  const ordered = [];
  const visited = new Set();

  while (queue.length) {
    const block = queue.shift();
    if (visited.has(block.id)) continue;
    visited.add(block.id);
    ordered.push(block);

    for (const targetId of adjacency.get(block.id)) {
      incoming.set(targetId, incoming.get(targetId) - 1);
      if (incoming.get(targetId) === 0) queue.push(byId.get(targetId));
    }
  }

  // Blocos restantes (ciclos ou orfaos) entram na ordem de criacao.
  for (const block of creationOrder) {
    if (!visited.has(block.id)) ordered.push(block);
  }

  return ordered;
}

// Proximo bloco a executar: o primeiro, na ordem do grafo, cujo estado
// nao seja terminal (concluido/cancelado).
export function computeNextBlock(orderedBlocks, stateByBlockId) {
  for (const block of orderedBlocks) {
    const status = stateByBlockId.get(block.blockId ?? block.id) ?? BLOCK_STATES.NOT_STARTED;
    if (!TERMINAL_STATES.includes(status)) return block;
  }
  return null;
}

export function executionProgress(blocks) {
  if (!blocks.length) return { total: 0, done: 0, ratio: 0 };
  const done = blocks.filter((block) => TERMINAL_STATES.includes(block.status)).length;
  return { total: blocks.length, done, ratio: done / blocks.length };
}

// Status da data de entrega do cartao, para o selo colorido (estilo Trello).
export function cardDueStatus(block, now = new Date()) {
  if (block.completed) return { tone: "done", label: "Concluído" };
  if (!block.dueDate) return null;
  const due = new Date(`${block.dueDate}T${block.endTime || block.dueTime || "23:59"}`);
  if (Number.isNaN(due.getTime())) return null;
  const diffMs = due.getTime() - now.getTime();
  if (diffMs < 0) return { tone: "late", label: "Atrasado" };
  if (diffMs < 36 * 3600 * 1000) return { tone: "soon", label: "Entregar em breve" };
  return { tone: "planned", label: "No prazo" };
}

const MONTHS_PT = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

const WEEKDAY_TOKENS = [
  ["domingo", "dom"],
  ["segunda"],
  ["terca", "terça"],
  ["quarta"],
  ["quinta"],
  ["sexta"],
  ["sabado", "sábado"],
];

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim();
}

function toISODateLocal(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDaysToIso(isoDate, amount) {
  const [year, month, day] = isoDate.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + amount);
  return toISODateLocal(date);
}

/** Indice 0=domingo … 6=sabado a partir do titulo da coluna (ex.: SEGUNDA-FEIRA). */
export function weekdayIndexFromListTitle(title) {
  const normalized = normalizeText(title);
  if (!normalized) return null;

  for (let index = 0; index < WEEKDAY_TOKENS.length; index += 1) {
    for (const token of WEEKDAY_TOKENS[index]) {
      const key = normalizeText(token);
      if (normalized === key || normalized.startsWith(`${key}-`) || normalized.startsWith(key)) {
        return index;
      }
    }
  }
  return null;
}

/** Data ISO do dia da semana na mesma semana de focusDate (semana comeca na segunda). */
export function resolveListColumnDate(title, focusDate) {
  const weekdayIndex = weekdayIndexFromListTitle(title);
  if (weekdayIndex == null || !focusDate) return null;

  const [year, month, day] = focusDate.split("-").map(Number);
  const focus = new Date(year, month - 1, day);
  const focusWeekday = focus.getDay();
  const mondayOffset = focusWeekday === 0 ? -6 : 1 - focusWeekday;
  const columnOffset = weekdayIndex === 0 ? 6 : weekdayIndex - 1;
  return addDaysToIso(focusDate, mondayOffset + columnOffset);
}

// Formata "2026-07-08" como "8 de jul".
export function formatShortDate(dateStr) {
  if (!dateStr) return "";
  const [year, month, day] = String(dateStr).split("-").map(Number);
  if (!year || !month || !day) return dateStr;
  return `${day} de ${MONTHS_PT[month - 1] || ""}`;
}

function structuredCloneSafe(value) {
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

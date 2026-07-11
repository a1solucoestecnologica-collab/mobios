import { useEffect, useRef, useState } from "react";
import { cardDueStatus, formatShortDate, resolveListColumnDate } from "../engine/engine.js";

function initials(name) {
  return String(name || "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function CardTile({ node, collaborators, onOpen, onDragStart, onDrop, isFocus }) {
  const data = node.data;
  const labels = data.labels || [];
  const members = data.members || [];
  const checklistItems = (data.checklists || []).flatMap((group) => group.items || []);
  const doneCount = checklistItems.filter((item) => item.done).length;
  const due = cardDueStatus(data);
  const memberObjs = members
    .map((id) => collaborators.find((collaborator) => collaborator.id === id))
    .filter(Boolean);

  return (
    <div
      className={`wm-card${isFocus ? " is-focus" : ""}`}
      draggable
      onDragStart={(event) => onDragStart(event, node.id)}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => onDrop(event, node.id)}
      onClick={() => onOpen(node.id)}
      style={{ borderLeftColor: data.color }}
    >
      {labels.length > 0 ? (
        <div className="wm-card-labels">
          {labels.map((label) => (
            <span key={label.id} className="wm-card-label" style={{ background: label.color }} />
          ))}
        </div>
      ) : null}

      <div className={`wm-card-title${data.completed ? " is-done" : ""}`}>{data.title || "Sem título"}</div>

      <div className="wm-card-meta">
        {due ? <span className={`wm-due-badge tone-${due.tone}`}>{formatShortDate(data.dueDate) || due.label}</span> : null}
        {checklistItems.length > 0 ? (
          <span className="wm-card-chip">✓ {doneCount}/{checklistItems.length}</span>
        ) : null}
        {data.attachments?.length ? <span className="wm-card-chip">📎 {data.attachments.length}</span> : null}
        {memberObjs.length > 0 ? (
          <span className="wm-card-members">
            {memberObjs.map((member) => (
              <span key={member.id} className="wm-avatar-sm" title={member.name}>
                {initials(member.name)}
              </span>
            ))}
          </span>
        ) : null}
      </div>
    </div>
  );
}

// Composer inline: Enter cria o cartao e mantem o campo aberto para o proximo.
function AddCardComposer({ onCreate }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  const commit = () => {
    const title = text.trim();
    if (title) onCreate(title);
    setText("");
    // mantem o composer aberto e focado para continuar criando
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      commit();
    } else if (event.key === "Escape") {
      event.preventDefault();
      setText("");
      setOpen(false);
    }
  };

  if (!open) {
    return (
      <button type="button" className="wm-add-card" onClick={() => setOpen(true)}>
        + Adicionar um cartão
      </button>
    );
  }

  return (
    <div className="wm-card-composer">
      <textarea
        ref={inputRef}
        value={text}
        placeholder="Digite um título e pressione Enter..."
        rows={2}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          if (!text.trim()) setOpen(false);
        }}
      />
      <div className="wm-card-composer-actions">
        <button type="button" className="wm-btn wm-btn-primary wm-btn-small" onMouseDown={(e) => e.preventDefault()} onClick={commit}>
          Adicionar
        </button>
        <button type="button" className="wm-btn wm-btn-small" onClick={() => setOpen(false)}>
          Fechar
        </button>
      </div>
    </div>
  );
}

const UNASSIGNED = "__unassigned__";

// Visao Quadro (Kanban). Colunas = listas; cartoes = blocos com listId.
// Blocos sem coluna (criados na tela branca) aparecem em "Sem lista" para nada sumir.
// Blocos ancora nao viram cartoes (sao exclusivos do canvas).
export default function BoardView({
  nodes,
  lists,
  collaborators,
  focusDate,
  onlyDay,
  onAddCard,
  onOpenCard,
  onMoveCard,
  onAddList,
  onRenameList,
  onRemoveList,
}) {
  const [draggingId, setDraggingId] = useState(null);

  const cardBlocks = nodes.filter((node) => node.data.kind !== "anchor");

  const cardsOfList = (listId) =>
    cardBlocks
      .filter((node) => (node.data.listId || null) === (listId || null))
      .filter((node) => !onlyDay || node.data.dueDate === focusDate)
      .sort((a, b) => (a.data.boardOrder ?? 0) - (b.data.boardOrder ?? 0));

  const unassigned = cardsOfList(null);

  const handleDragStart = (event, cardId) => {
    setDraggingId(cardId);
    event.dataTransfer.effectAllowed = "move";
  };

  const resolveListId = (listId) => (listId === UNASSIGNED ? null : listId);

  const dropOnCard = (targetListId) => (event, targetCardId) => {
    event.preventDefault();
    event.stopPropagation();
    if (!draggingId) return;
    const realId = resolveListId(targetListId);
    const cards = cardsOfList(realId).filter((card) => card.id !== draggingId);
    const index = cards.findIndex((card) => card.id === targetCardId);
    onMoveCard(draggingId, realId, index < 0 ? cards.length : index);
    setDraggingId(null);
  };

  const dropOnColumn = (targetListId) => (event) => {
    event.preventDefault();
    if (!draggingId) return;
    const realId = resolveListId(targetListId);
    const cards = cardsOfList(realId).filter((card) => card.id !== draggingId);
    onMoveCard(draggingId, realId, cards.length);
    setDraggingId(null);
  };

  const renderColumn = (key, title, cards, options = {}) => {
    const columnDate = resolveListColumnDate(title, focusDate);
    const dateLabel = columnDate ? formatShortDate(columnDate) : "";

    return (
    <div
      key={key}
      className={`wm-column${options.muted ? " is-muted" : ""}`}
      onDragOver={(event) => event.preventDefault()}
      onDrop={dropOnColumn(key)}
    >
      <div className="wm-column-head">
        {options.muted ? (
          <span className="wm-column-title-static">{title}</span>
        ) : (
          <input
            className="wm-column-title"
            value={title}
            onChange={(event) => onRenameList(key, event.target.value)}
          />
        )}
        {dateLabel ? (
          <span
            className={`wm-column-date${columnDate === focusDate ? " is-today" : ""}`}
            title={columnDate}
          >
            {dateLabel}
          </span>
        ) : null}
        <span className="wm-column-count">{cards.length}</span>
        {options.muted ? null : (
          <button
            type="button"
            className="wm-column-remove"
            title="Excluir lista"
            onClick={() => onRemoveList(key)}
          >
            ×
          </button>
        )}
      </div>

      <div className="wm-column-cards">
        {cards.map((node) => (
          <CardTile
            key={node.id}
            node={node}
            collaborators={collaborators}
            isFocus={Boolean(focusDate) && node.data.dueDate === focusDate}
            onOpen={onOpenCard}
            onDragStart={handleDragStart}
            onDrop={dropOnCard(key)}
          />
        ))}
      </div>

      {options.muted ? (
        <p className="wm-column-hint">Arraste para uma coluna para organizar.</p>
      ) : (
        <AddCardComposer onCreate={(title) => onAddCard(key, title)} />
      )}
    </div>
    );
  };

  return (
    <div className="wm-board">
      {unassigned.length > 0
        ? renderColumn(UNASSIGNED, "Sem lista (tela branca)", unassigned, { muted: true })
        : null}

      {lists.map((list) => renderColumn(list.id, list.title, cardsOfList(list.id)))}

      <button type="button" className="wm-add-list" onClick={onAddList}>
        + Adicionar outra lista
      </button>
    </div>
  );
}

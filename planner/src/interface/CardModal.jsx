import { useEffect, useMemo, useState } from "react";
import {
  LABEL_COLORS,
  RECURRENCE_OPTIONS,
  REMINDER_OPTIONS,
  BLOCK_COLORS,
} from "../engine/constants.js";
import {
  createAttachment,
  createChecklistGroup,
  createChecklistItem,
  createLabel,
  cardDueStatus,
} from "../engine/engine.js";
import { plannerApi } from "../persistence/api.js";

function initials(name) {
  return String(name || "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

// Modal completo do cartao (estilo Trello): datas, etiquetas, membros,
// checklist com progresso, anexos, descricao e comentarios.
export default function CardModal({ node, collaborators, onChange, onClose, onDelete, ensureSaved }) {
  const data = node.data;
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState("");
  const [sending, setSending] = useState(false);
  const [commentError, setCommentError] = useState("");

  const labels = data.labels || [];
  const members = data.members || [];
  const checklists = data.checklists || [];
  const attachments = data.attachments || [];

  const dueStatus = useMemo(() => cardDueStatus(data), [data]);
  const progress = useMemo(() => {
    const items = checklists.flatMap((group) => group.items || []);
    const done = items.filter((item) => item.done).length;
    return { total: items.length, done, ratio: items.length ? done / items.length : 0 };
  }, [checklists]);

  useEffect(() => {
    let active = true;
    plannerApi
      .listComments(node.id)
      .then((res) => {
        if (active) setComments(res.comments || []);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [node.id]);

  const patch = (next) => onChange(next);

  // --- Etiquetas ---
  const toggleLabel = (color) => {
    const existing = labels.find((label) => label.color === color);
    if (existing) {
      patch({ labels: labels.filter((label) => label.color !== color) });
    } else {
      patch({ labels: [...labels, createLabel(color)] });
    }
  };

  // --- Membros ---
  const toggleMember = (collaboratorId) => {
    patch({
      members: members.includes(collaboratorId)
        ? members.filter((id) => id !== collaboratorId)
        : [...members, collaboratorId],
    });
  };

  // --- Checklist (lista unica de itens) ---
  // Internamente guardamos um unico grupo para manter compatibilidade com o backend.
  const items = checklists[0]?.items || [];
  const writeItems = (nextItems) => {
    const group = checklists[0] || createChecklistGroup("Checklist");
    patch({ checklists: [{ ...group, items: nextItems }] });
  };
  const addItem = () => writeItems([...items, createChecklistItem("")]);
  const updateItem = (itemId, next) =>
    writeItems(items.map((item) => (item.id === itemId ? { ...item, ...next } : item)));
  const removeItem = (itemId) => writeItems(items.filter((item) => item.id !== itemId));

  // --- Anexos ---
  const updateAttachment = (attId, next) =>
    patch({ attachments: attachments.map((att) => (att.id === attId ? { ...att, ...next } : att)) });

  // --- Comentarios ---
  const sendComment = async () => {
    const body = commentText.trim();
    if (!body || sending) return;
    setSending(true);
    setCommentError("");
    try {
      await ensureSaved();
      const res = await plannerApi.addComment(node.id, { body, author: "Você" });
      setComments((current) => [...current, res.comment]);
      setCommentText("");
    } catch (error) {
      setCommentError(error.message);
    } finally {
      setSending(false);
    }
  };

  const createdLabel = data.createdAt ? new Date(data.createdAt).toLocaleString("pt-BR") : "";

  return (
    <div className="wm-modal-overlay" onMouseDown={onClose}>
      <div className="wm-modal" onMouseDown={(event) => event.stopPropagation()}>
        <button type="button" className="wm-modal-close" onClick={onClose} aria-label="Fechar">
          ×
        </button>

        <div className="wm-modal-body">
          <div className="wm-modal-main">
            <div className="wm-modal-title-row">
              <button
                type="button"
                className={`wm-complete-toggle${data.completed ? " is-done" : ""}`}
                title={data.completed ? "Concluído" : "Marcar como concluído"}
                onClick={() => patch({ completed: !data.completed })}
              >
                {data.completed ? "✓" : ""}
              </button>
              <input
                className="wm-modal-title"
                value={data.title}
                placeholder="Título do cartão"
                onChange={(event) => patch({ title: event.target.value })}
              />
              <button
                type="button"
                className="wm-modal-delete"
                title="Excluir cartão"
                aria-label="Excluir cartão"
                onClick={() => {
                  const label = data.title?.trim() || "este cartão";
                  if (window.confirm(`Excluir "${label}"? Esta ação não pode ser desfeita.`)) {
                    onDelete?.();
                  }
                }}
              >
                <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                  <path
                    fill="currentColor"
                    d="M9 3h6l1 2h4v2H4V5h4l1-2zm1 6h2v9h-2V9zm4 0h2v9h-2V9zM7 9h2v9H7V9zm-1 11h12a2 2 0 0 0 2-2V9H6v9a2 2 0 0 0 2 2z"
                  />
                </svg>
              </button>
            </div>

            {/* Etiquetas */}
            <section className="wm-modal-section">
              <h4>Etiquetas</h4>
              <div className="wm-label-palette">
                {LABEL_COLORS.map((option) => {
                  const active = labels.some((label) => label.color === option.color);
                  return (
                    <button
                      key={option.color}
                      type="button"
                      className={`wm-label-swatch${active ? " is-active" : ""}`}
                      style={{ background: option.color }}
                      title={option.name}
                      onClick={() => toggleLabel(option.color)}
                    >
                      {active ? "✓" : ""}
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Datas */}
            <section className="wm-modal-section">
              <h4>
                Datas
                {dueStatus ? <span className={`wm-due-badge tone-${dueStatus.tone}`}>{dueStatus.label}</span> : null}
              </h4>
              <div className="wm-date-grid">
                <label>
                  Início
                  <input
                    type="date"
                    value={data.startDate || ""}
                    onChange={(event) => patch({ startDate: event.target.value || null })}
                  />
                </label>
                <label>
                  Fim
                  <input
                    type="date"
                    value={data.dueDate || ""}
                    onChange={(event) => patch({ dueDate: event.target.value || null })}
                  />
                </label>
                <label>
                  Hora início
                  <input
                    type="time"
                    value={data.startTime || ""}
                    onChange={(event) => patch({ startTime: event.target.value || null })}
                  />
                </label>
                <label>
                  Hora fim
                  <input
                    type="time"
                    value={data.endTime || data.dueTime || ""}
                    onChange={(event) => {
                      const value = event.target.value || null;
                      patch({ endTime: value, dueTime: value });
                    }}
                  />
                </label>
                <label>
                  Recorrente
                  <select
                    value={data.recurrence || "none"}
                    onChange={(event) => patch({ recurrence: event.target.value })}
                  >
                    {RECURRENCE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Lembrete
                  <select
                    value={data.reminder || "none"}
                    onChange={(event) => patch({ reminder: event.target.value })}
                  >
                    {REMINDER_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </section>

            {/* Membros */}
            <section className="wm-modal-section">
              <h4>Membros</h4>
              <div className="wm-members">
                {collaborators.length === 0 ? (
                  <span className="wm-muted">Nenhum colaborador cadastrado.</span>
                ) : (
                  collaborators.map((collaborator) => (
                    <button
                      key={collaborator.id}
                      type="button"
                      className={`wm-member-chip${members.includes(collaborator.id) ? " is-active" : ""}`}
                      onClick={() => toggleMember(collaborator.id)}
                      title={collaborator.name}
                    >
                      <span className="wm-avatar-sm">{initials(collaborator.name)}</span>
                      {collaborator.name}
                    </button>
                  ))
                )}
              </div>
            </section>

            {/* Cor do cartao */}
            <section className="wm-modal-section">
              <h4>Cor</h4>
              <div className="wm-colors">
                {BLOCK_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`wm-color${data.color === color ? " is-active" : ""}`}
                    style={{ background: color }}
                    onClick={() => patch({ color })}
                    aria-label={`Cor ${color}`}
                  />
                ))}
              </div>
            </section>

            {/* Descricao */}
            <section className="wm-modal-section">
              <h4>Descrição</h4>
              <textarea
                className="wm-modal-desc"
                value={data.description}
                placeholder="Detalhe o que precisa ser feito..."
                rows={4}
                onChange={(event) => patch({ description: event.target.value })}
              />
            </section>

            {/* Checklists */}
            <section className="wm-modal-section">
              <h4>
                Checklist
                {progress.total > 0 ? <span className="wm-progress-pct">{Math.round(progress.ratio * 100)}%</span> : null}
              </h4>
              {progress.total > 0 ? (
                <div className="wm-progress-bar">
                  <div className="wm-progress-fill" style={{ width: `${progress.ratio * 100}%` }} />
                </div>
              ) : null}

              <ul className="wm-checklist">
                {items.map((item) => (
                  <li key={item.id}>
                    <input
                      type="checkbox"
                      checked={item.done}
                      onChange={(event) => updateItem(item.id, { done: event.target.checked })}
                    />
                    <input
                      className="wm-checklist-text"
                      value={item.text}
                      placeholder="Item"
                      onChange={(event) => updateItem(item.id, { text: event.target.value })}
                    />
                    <button type="button" className="wm-checklist-remove" onClick={() => removeItem(item.id)}>
                      ×
                    </button>
                  </li>
                ))}
              </ul>
              <button type="button" className="wm-btn wm-btn-small" onClick={addItem}>
                + Item
              </button>
            </section>

            {/* Anexos */}
            <section className="wm-modal-section">
              <h4>Anexos</h4>
              <ul className="wm-attachments">
                {attachments.map((att) => (
                  <li key={att.id}>
                    <input
                      className="wm-attachment-name"
                      placeholder="Nome"
                      value={att.name}
                      onChange={(event) => updateAttachment(att.id, { name: event.target.value })}
                    />
                    <input
                      className="wm-attachment-url"
                      placeholder="Link (URL)"
                      value={att.url}
                      onChange={(event) => updateAttachment(att.id, { url: event.target.value })}
                    />
                    <button
                      type="button"
                      className="wm-checklist-remove"
                      onClick={() => patch({ attachments: attachments.filter((a) => a.id !== att.id) })}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                className="wm-btn wm-btn-small"
                onClick={() => patch({ attachments: [...attachments, createAttachment()] })}
              >
                + Anexo
              </button>
            </section>
          </div>

          {/* Coluna de comentarios e atividade */}
          <aside className="wm-modal-side">
            <h4>Comentários e atividade</h4>
            <div className="wm-comment-box">
              <textarea
                value={commentText}
                placeholder="Escrever um comentário..."
                rows={2}
                onChange={(event) => setCommentText(event.target.value)}
              />
              <button
                type="button"
                className="wm-btn wm-btn-primary wm-btn-small"
                onClick={sendComment}
                disabled={!commentText.trim() || sending}
              >
                {sending ? "Enviando..." : "Comentar"}
              </button>
              {commentError ? <span className="wm-comment-error">{commentError}</span> : null}
            </div>

            <ul className="wm-activity">
              {comments
                .slice()
                .reverse()
                .map((comment) => (
                  <li key={comment.id}>
                    <span className="wm-avatar-sm">{initials(comment.author)}</span>
                    <div>
                      <strong>{comment.author}</strong>
                      <p>{comment.body}</p>
                      <time>{new Date(comment.createdAt).toLocaleString("pt-BR")}</time>
                    </div>
                  </li>
                ))}
              {createdLabel ? (
                <li className="wm-activity-event">
                  <span className="wm-avatar-sm">·</span>
                  <div>
                    <p>Cartão criado</p>
                    <time>{createdLabel}</time>
                  </div>
                </li>
              ) : null}
            </ul>
          </aside>
        </div>
      </div>
    </div>
  );
}

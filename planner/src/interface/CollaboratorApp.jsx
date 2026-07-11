import { useCallback, useEffect, useMemo, useState } from "react";
import { plannerApi } from "../persistence/api.js";
import { computeNextBlock, executionProgress, orderBlocks } from "../engine/engine.js";
import { BLOCK_STATES } from "../engine/constants.js";

// Interface do colaborador. Extremamente simples.
// Mostra apenas: nome, mapa atual, proximo bloco, descricao, checklist e Concluir.
// O colaborador NUNCA ve o canvas, nunca edita mapas, nunca altera conexoes.
export default function CollaboratorApp() {
  const [collaborators, setCollaborators] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [data, setData] = useState(null);
  const [status, setStatus] = useState("");

  useEffect(() => {
    plannerApi
      .listCollaborators()
      .then(({ collaborators: list }) => setCollaborators(list))
      .catch((error) => setStatus(error.message));
  }, []);

  const loadExecution = useCallback(async (collaboratorId) => {
    if (!collaboratorId) {
      setData(null);
      return;
    }
    setStatus("");
    try {
      const result = await plannerApi.getCollaboratorExecution(collaboratorId);
      setData(result);
    } catch (error) {
      setStatus(error.message);
    }
  }, []);

  useEffect(() => {
    loadExecution(selectedId);
  }, [selectedId, loadExecution]);

  const nextBlock = useMemo(() => {
    if (!data?.execution) return null;
    const ordered = orderBlocks(
      data.blocks.map((block) => ({
        id: block.blockId,
        blockId: block.blockId,
        createdAt: block.updatedAt,
      })),
      data.connections,
    );
    const stateByBlockId = new Map(data.blocks.map((block) => [block.blockId, block.status]));
    const next = computeNextBlock(ordered, stateByBlockId);
    if (!next) return null;
    return data.blocks.find((block) => block.blockId === next.blockId) || null;
  }, [data]);

  const progress = useMemo(() => (data?.blocks ? executionProgress(data.blocks) : null), [data]);

  const handleComplete = useCallback(async () => {
    if (!nextBlock) return;
    try {
      const updated = await plannerApi.updateExecutionBlock(nextBlock.executionBlockId, BLOCK_STATES.DONE);
      setData(updated);
    } catch (error) {
      setStatus(error.message);
    }
  }, [nextBlock]);

  const handleStart = useCallback(async () => {
    if (!nextBlock) return;
    try {
      const updated = await plannerApi.updateExecutionBlock(
        nextBlock.executionBlockId,
        BLOCK_STATES.IN_PROGRESS,
      );
      setData(updated);
    } catch (error) {
      setStatus(error.message);
    }
  }, [nextBlock]);

  return (
    <div className="wm-collab">
      <div className="wm-collab-picker">
        <label>
          Colaborador
          <select value={selectedId} onChange={(event) => setSelectedId(event.target.value)}>
            <option value="">Selecione...</option>
            {collaborators.map((collaborator) => (
              <option key={collaborator.id} value={collaborator.id}>
                {collaborator.name}
                {collaborator.currentMapName ? ` — ${collaborator.currentMapName}` : ""}
              </option>
            ))}
          </select>
        </label>
      </div>

      {status ? <div className="wm-status">{status}</div> : null}

      {!selectedId ? (
        <div className="wm-collab-empty">Selecione um colaborador para ver o mapa atual.</div>
      ) : !data?.execution ? (
        <div className="wm-collab-empty">Nenhum mapa atribuído a este colaborador.</div>
      ) : (
        <div className="wm-collab-card">
          <div className="wm-collab-map">
            <span>Mapa atual</span>
            <h2>{data.execution.mapName}</h2>
            {progress ? (
              <div className="wm-progress">
                <div className="wm-progress-bar" style={{ width: `${Math.round(progress.ratio * 100)}%` }} />
                <span>
                  {progress.done}/{progress.total} concluídos
                </span>
              </div>
            ) : null}
          </div>

          {nextBlock ? (
            <div className="wm-next-block" style={{ borderTopColor: nextBlock.color }}>
              <span className="wm-next-label">Próximo bloco</span>
              <h3>{nextBlock.title || "Sem título"}</h3>
              {nextBlock.description ? <p>{nextBlock.description}</p> : null}

              {nextBlock.checklist?.length ? (
                <ul className="wm-collab-checklist">
                  {nextBlock.checklist.map((item) => (
                    <li key={item.id} className={item.done ? "is-done" : ""}>
                      <span className="wm-check-mark">{item.done ? "✓" : "○"}</span>
                      {item.text}
                    </li>
                  ))}
                </ul>
              ) : null}

              <div className="wm-collab-actions">
                {nextBlock.status === BLOCK_STATES.NOT_STARTED ? (
                  <button type="button" className="wm-btn" onClick={handleStart}>
                    Iniciar
                  </button>
                ) : null}
                <button type="button" className="wm-btn wm-btn-primary" onClick={handleComplete}>
                  Concluir
                </button>
              </div>
            </div>
          ) : (
            <div className="wm-collab-done">
              <h3>Tudo concluído</h3>
              <p>Não há blocos pendentes neste mapa.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

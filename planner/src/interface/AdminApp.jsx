import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ReactFlowProvider,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  useReactFlow,
} from "@xyflow/react";
import MapCanvas from "../canvas/MapCanvas.jsx";
import BoardView from "../canvas/BoardView.jsx";
import CardModal from "./CardModal.jsx";
import DatePicker from "./DatePicker.jsx";
import { plannerApi } from "../persistence/api.js";
import {
  createAnchorBlock,
  createAttachment,
  createBlock,
  createCard,
  createChecklistItem,
  createConnection,
  createList,
  duplicateBlock,
} from "../engine/engine.js";
import { BLOCK_COLORS } from "../engine/constants.js";
import {
  blockToNode,
  connectionToEdge,
  edgeToConnection,
  nodeToBlock,
} from "./adapters.js";

// Data local no formato yyyy-mm-dd (sem fuso UTC atrapalhar).
function toISODate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(isoDate, amount) {
  const [year, month, day] = isoDate.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + amount);
  return toISODate(date);
}

const WEEKDAYS_PT = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
const MONTHS_LONG_PT = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

function AdminAppInner() {
  const rf = useReactFlow();
  const [maps, setMaps] = useState([]);
  const [collaborators, setCollaborators] = useState([]);
  const [currentMap, setCurrentMap] = useState(null);
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [status, setStatus] = useState("");
  const [dirty, setDirty] = useState(false);
  const [creatingMap, setCreatingMap] = useState(false);
  const [newMapName, setNewMapName] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [assignCollaboratorId, setAssignCollaboratorId] = useState("");
  const [snapToGrid, setSnapToGrid] = useState(false);
  const [lists, setLists] = useState([]);
  const [viewMode, setViewMode] = useState("canvas");
  const [openCardId, setOpenCardId] = useState(null);
  const [focusDate, setFocusDate] = useState(() => toISODate(new Date()));
  const [onlyDay, setOnlyDay] = useState(false);
  const [clock, setClock] = useState(() => new Date());
  const [selectedCollaboratorId, setSelectedCollaboratorId] = useState(null);
  const [mapsCollapsed, setMapsCollapsed] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const selectedCollaborator = useMemo(
    () => collaborators.find((item) => item.id === selectedCollaboratorId) || null,
    [collaborators, selectedCollaboratorId],
  );

  // Relogio ao vivo, atualiza a cada segundo.
  useEffect(() => {
    const timer = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const focusDateObj = useMemo(() => {
    const [year, month, day] = focusDate.split("-").map(Number);
    return new Date(year, month - 1, day);
  }, [focusDate]);

  const dayCount = useMemo(
    () => nodes.filter((node) => node.data.kind !== "anchor" && node.data.dueDate === focusDate).length,
    [nodes, focusDate],
  );

  const selectedBlock = useMemo(
    () => nodes.find((node) => node.id === selectedNodeId) || null,
    [nodes, selectedNodeId],
  );

  const refreshMaps = useCallback(async () => {
    if (!selectedCollaboratorId) {
      setMaps([]);
      return [];
    }
    const { maps: list } = await plannerApi.listMaps(selectedCollaboratorId);
    setMaps(list);
    return list;
  }, [selectedCollaboratorId]);

  const updateBlockData = useCallback((id, patch) => {
    setNodes((current) =>
      current.map((node) => (node.id === id ? { ...node, data: { ...node.data, ...patch } } : node)),
    );
    setDirty(true);
  }, []);

  // Injeta o callback de edicao inline em cada no.
  const toNode = useCallback(
    (block) => {
      const node = blockToNode(block);
      return { ...node, data: { ...node.data, onChange: updateBlockData } };
    },
    [updateBlockData],
  );

  // Carrega colaboradores uma vez ao montar.
  useEffect(() => {
    plannerApi
      .listCollaborators()
      .then(({ collaborators: list }) => setCollaborators(list))
      .catch(() => {});
  }, []);

  // Ao trocar de colaborador, recarrega os mapas dele e limpa o editor.
  useEffect(() => {
    setCurrentMap(null);
    setNodes([]);
    setEdges([]);
    setLists([]);
    setSelectedNodeId(null);
    setOpenCardId(null);
    if (selectedCollaboratorId) {
      refreshMaps().catch((error) => setStatus(error.message));
    }
  }, [selectedCollaboratorId, refreshMaps]);

  const loadMap = useCallback(
    async (id) => {
      const data = await plannerApi.getMap(id);
      setCurrentMap(data.map);
      setNodes(data.blocks.map(toNode));
      setEdges(data.connections.map(connectionToEdge));
      setLists(data.lists || []);
      setSelectedNodeId(null);
      setOpenCardId(null);
      setDirty(false);
      setStatus("");
    },
    [toNode],
  );

  const confirmCreateMap = useCallback(async () => {
    const name = newMapName.trim();
    if (!name) return;
    try {
      const data = await plannerApi.createMap({ name, collaboratorId: selectedCollaboratorId });
      setCreatingMap(false);
      setNewMapName("");
      await refreshMaps();
      await loadMap(data.map.id);
    } catch (error) {
      setStatus(error.message);
    }
  }, [newMapName, refreshMaps, loadMap, selectedCollaboratorId]);

  const handleDeleteMap = useCallback(async () => {
    if (!currentMap) return;
    if (!window.confirm(`Excluir o mapa "${currentMap.name}"? Esta acao nao pode ser desfeita.`)) return;
    await plannerApi.deleteMap(currentMap.id);
    setCurrentMap(null);
    setNodes([]);
    setEdges([]);
    setLists([]);
    setSelectedNodeId(null);
    setOpenCardId(null);
    await refreshMaps();
  }, [currentMap, refreshMaps]);

  const onNodesChange = useCallback((changes) => {
    setNodes((current) => applyNodeChanges(changes, current));
    if (changes.some((change) => change.type !== "select" && change.type !== "dimensions")) {
      setDirty(true);
    }
  }, []);

  const onEdgesChange = useCallback((changes) => {
    setEdges((current) => applyEdgeChanges(changes, current));
    if (changes.some((change) => change.type !== "select")) setDirty(true);
  }, []);

  const onConnect = useCallback((connection) => {
    if (connection.source === connection.target) return;
    const engineConnection = createConnection(connection.source, connection.target);
    setEdges((current) => addEdge(connectionToEdge(engineConnection), current));
    setDirty(true);
  }, []);

  const onSelectionChange = useCallback(({ nodes: selected }) => {
    setSelectedNodeId(selected.length === 1 ? selected[0].id : null);
  }, []);

  const handleAddBlock = useCallback(() => {
    if (!currentMap) return;
    const center = rf.screenToFlowPosition
      ? rf.screenToFlowPosition({
          x: window.innerWidth / 2,
          y: window.innerHeight / 2,
        })
      : { x: 200, y: 200 };
    const block = createBlock({ x: center.x, y: center.y });
    setNodes((current) => [...current, toNode(block)]);
    setSelectedNodeId(block.id);
    setDirty(true);
  }, [currentMap, rf, toNode]);

  const handleAddAnchor = useCallback(() => {
    if (!currentMap) return;
    const center = rf.screenToFlowPosition
      ? rf.screenToFlowPosition({
          x: window.innerWidth / 2,
          y: window.innerHeight / 2,
        })
      : { x: 200, y: 200 };
    const block = createAnchorBlock({ x: center.x, y: center.y });
    setNodes((current) => [...current, toNode(block)]);
    setSelectedNodeId(block.id);
    setDirty(true);
  }, [currentMap, rf, toNode]);

  const handleDuplicate = useCallback(() => {
    if (!selectedBlock) return;
    const clone = duplicateBlock(nodeToBlock(selectedBlock));
    setNodes((current) => [...current, toNode(clone)]);
    setSelectedNodeId(clone.id);
    setDirty(true);
  }, [selectedBlock, toNode]);

  const handleDeleteBlock = useCallback(() => {
    if (!selectedNodeId) return;
    setNodes((current) => current.filter((node) => node.id !== selectedNodeId));
    setEdges((current) =>
      current.filter((edge) => edge.source !== selectedNodeId && edge.target !== selectedNodeId),
    );
    setSelectedNodeId(null);
    setDirty(true);
  }, [selectedNodeId]);

  const updateSelectedData = useCallback(
    (patch) => {
      if (!selectedNodeId) return;
      setNodes((current) =>
        current.map((node) =>
          node.id === selectedNodeId ? { ...node, data: { ...node.data, ...patch } } : node,
        ),
      );
      setDirty(true);
    },
    [selectedNodeId],
  );

  // Salva o mapa imediatamente (usado no autosave e antes de comentar).
  const saveNow = useCallback(async () => {
    if (!currentMap) return;
    const viewport = rf.getViewport ? rf.getViewport() : { x: 0, y: 0, zoom: 1 };
    await plannerApi.saveMap(currentMap.id, {
      name: currentMap.name,
      description: currentMap.description,
      canvas: viewport,
      blocks: nodes.map(nodeToBlock),
      connections: edges.map(edgeToConnection),
      lists,
    });
    setDirty(false);
    refreshMaps().catch(() => {});
  }, [currentMap, rf, nodes, edges, lists, refreshMaps]);

  // Salvamento automatico: sempre que houver mudanca, salva apos um curto intervalo.
  useEffect(() => {
    if (!currentMap || !dirty) return undefined;
    const timer = setTimeout(async () => {
      try {
        await saveNow();
        setStatus("");
      } catch (error) {
        setStatus(`Erro ao salvar: ${error.message}`);
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [nodes, edges, lists, dirty, currentMap, saveNow]);

  const confirmAssign = useCallback(async () => {
    if (!currentMap || !assignCollaboratorId) return;
    try {
      await plannerApi.createExecution({ mapId: currentMap.id, collaboratorId: assignCollaboratorId });
      const collaborator = collaborators.find((item) => item.id === assignCollaboratorId);
      setStatus(`Mapa atribuído a ${collaborator?.name || "colaborador"}.`);
      setAssigning(false);
      setAssignCollaboratorId("");
      const { collaborators: list } = await plannerApi.listCollaborators();
      setCollaborators(list);
    } catch (error) {
      setStatus(`Erro ao atribuir: ${error.message}`);
    }
  }, [currentMap, assignCollaboratorId, collaborators]);

  // --- Operacoes do Quadro (Kanban) ---
  const cardsInList = useCallback(
    (listId) =>
      nodes
        .filter((node) => node.data.listId === listId)
        .sort((a, b) => (a.data.boardOrder ?? 0) - (b.data.boardOrder ?? 0)),
    [nodes],
  );

  // Layout automatico na tela branca: cada coluna do Quadro vira uma coluna
  // alinhada no canvas; a ordem do cartao vira a linha. Nada de amontoado.
  const cardCanvasPosition = useCallback(
    (listId, order) => {
      const LIST_X0 = 60;
      const COL_GAP = 260;
      const CARD_Y0 = 120;
      const ROW_GAP = 132;
      const columnIndex = Math.max(0, lists.findIndex((list) => list.id === listId));
      return {
        x: LIST_X0 + columnIndex * COL_GAP,
        y: CARD_Y0 + order * ROW_GAP,
      };
    },
    [lists],
  );

  const handleAddCard = useCallback(
    (listId, title = "Novo cartão") => {
      const order = cardsInList(listId).length;
      const { x, y } = cardCanvasPosition(listId, order);
      const card = createCard({ listId, title: title || "Novo cartão", boardOrder: order, x, y });
      // Tarefa nasce prevista para o dia selecionado na agenda.
      card.dueDate = focusDate;
      setNodes((current) => [...current, toNode(card)]);
      setDirty(true);
    },
    [cardsInList, cardCanvasPosition, toNode, focusDate],
  );

  const handleMoveCard = useCallback(
    (cardId, targetListId, targetIndex) => {
      const listKey = targetListId || null;
      setNodes((current) => {
        const moving = current.find((node) => node.id === cardId);
        if (!moving) return current;
        const target = current
          .filter((node) => node.id !== cardId && (node.data.listId || null) === listKey)
          .sort((a, b) => (a.data.boardOrder ?? 0) - (b.data.boardOrder ?? 0));
        const clampedIndex = Math.max(0, Math.min(targetIndex, target.length));
        target.splice(clampedIndex, 0, moving);
        const orderById = new Map(target.map((node, index) => [node.id, index]));
        return current.map((node) => {
          if (!orderById.has(node.id)) return node;
          const order = orderById.get(node.id);
          const isMoving = node.id === cardId;
          // Reposiciona no canvas apenas quando o cartao pertence a uma coluna.
          const position = listKey ? cardCanvasPosition(listKey, order) : null;
          return {
            ...node,
            position: position || node.position,
            data: {
              ...node.data,
              listId: isMoving ? listKey : node.data.listId,
              boardOrder: order,
            },
          };
        });
      });
      setDirty(true);
    },
    [cardCanvasPosition],
  );

  // Realinha todos os cartoes com coluna, conforme a grade (coluna x ordem).
  const handleReorganize = useCallback(() => {
    setNodes((current) => {
      const byList = new Map();
      current
        .filter((node) => node.data.kind !== "anchor" && node.data.listId)
        .sort((a, b) => (a.data.boardOrder ?? 0) - (b.data.boardOrder ?? 0))
        .forEach((node) => {
          const list = byList.get(node.data.listId) || [];
          list.push(node.id);
          byList.set(node.data.listId, list);
        });
      const orderById = new Map();
      byList.forEach((ids) => ids.forEach((id, index) => orderById.set(id, index)));
      return current.map((node) => {
        if (!orderById.has(node.id)) return node;
        const order = orderById.get(node.id);
        return {
          ...node,
          position: cardCanvasPosition(node.data.listId, order),
          data: { ...node.data, boardOrder: order },
        };
      });
    });
    setDirty(true);
  }, [cardCanvasPosition]);

  const handleAddList = useCallback(() => {
    setLists((current) => [...current, createList("Nova lista", current.length)]);
    setDirty(true);
  }, []);

  const handleRenameList = useCallback((listId, title) => {
    setLists((current) => current.map((list) => (list.id === listId ? { ...list, title } : list)));
    setDirty(true);
  }, []);

  const handleRemoveList = useCallback((listId) => {
    if (!window.confirm("Excluir esta lista e todos os cartões dela?")) return;
    setLists((current) => current.filter((list) => list.id !== listId));
    setNodes((current) => current.filter((node) => node.data.listId !== listId));
    setDirty(true);
  }, []);

  const openCardNode = useMemo(
    () => (openCardId ? nodes.find((node) => node.id === openCardId) || null : null),
    [openCardId, nodes],
  );

  const initials = (name) =>
    String(name || "?")
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase();

  // Tela inicial: escolher o colaborador antes de abrir o editor.
  if (!selectedCollaboratorId) {
    return (
      <div className="wm-gate">
        <div className="wm-gate-card">
          <h2>Selecione o colaborador</h2>
          <p>Os mapas de trabalho são organizados por colaborador. Escolha para começar.</p>
          <div className="wm-gate-list">
            {collaborators.length === 0 ? (
              <span className="wm-muted">Nenhum colaborador cadastrado.</span>
            ) : (
              collaborators.map((collaborator) => (
                <button
                  key={collaborator.id}
                  type="button"
                  className="wm-gate-item"
                  onClick={() => setSelectedCollaboratorId(collaborator.id)}
                >
                  <span className="wm-avatar-lg">{initials(collaborator.name)}</span>
                  <span className="wm-gate-item-info">
                    <strong>{collaborator.name}</strong>
                    {collaborator.currentMapName ? <span>Mapa atual: {collaborator.currentMapName}</span> : null}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`wm-admin${mapsCollapsed ? " is-maps-collapsed" : ""}`}>
      <aside className="wm-maps">
        <div className="wm-maps-head">
          <button
            className="wm-maps-collapse"
            type="button"
            title="Esconder a lista"
            onClick={() => setMapsCollapsed(true)}
          >
            ‹
          </button>
          <button
            className="wm-btn wm-btn-primary"
            type="button"
            onClick={() => {
              setCreatingMap((value) => !value);
              setNewMapName("");
            }}
          >
            {creatingMap ? "Cancelar" : "+ Novo mapa"}
          </button>
        </div>

        {creatingMap ? (
          <form
            className="wm-create-map"
            onSubmit={(event) => {
              event.preventDefault();
              confirmCreateMap();
            }}
          >
            <input
              autoFocus
              placeholder="Nome do mapa (ex: Produção)"
              value={newMapName}
              onChange={(event) => setNewMapName(event.target.value)}
            />
            <button className="wm-btn wm-btn-primary" type="submit" disabled={!newMapName.trim()}>
              Criar mapa
            </button>
          </form>
        ) : null}

        <ul className="wm-map-list">
          {maps.map((map) => (
            <li key={map.id}>
              <button
                type="button"
                className={`wm-map-item${currentMap?.id === map.id ? " is-active" : ""}`}
                onClick={() => loadMap(map.id).catch((error) => setStatus(error.message))}
              >
                <strong>{map.name}</strong>
                <span>{map.blockCount} blocos · {map.connectionCount} conexões</span>
              </button>
            </li>
          ))}
          {maps.length === 0 ? (
            <li className="wm-empty">Nenhum mapa ainda. Clique em "+ Novo mapa".</li>
          ) : null}
        </ul>
      </aside>

      <section className="wm-editor">
        <div className="wm-timebar">
          <div className="wm-clock">
            <span className="wm-clock-time">
              {clock.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </span>
            <span className="wm-clock-date">
              {WEEKDAYS_PT[clock.getDay()]}, {clock.getDate()} de {MONTHS_LONG_PT[clock.getMonth()]}
            </span>
          </div>

          <div className="wm-date-nav">
            <button
              type="button"
              className="wm-date-arrow"
              title="Dia anterior"
              onClick={() => setFocusDate((current) => addDays(current, -1))}
            >
              ‹
            </button>

            <div className="wm-date-current">
              <span className="wm-date-weekday">{WEEKDAYS_PT[focusDateObj.getDay()]}</span>
              <button
                type="button"
                className="wm-date-input"
                onClick={() => setCalendarOpen((value) => !value)}
              >
                {focusDateObj.getDate()} de {MONTHS_LONG_PT[focusDateObj.getMonth()]} de {focusDateObj.getFullYear()}
              </button>
              {calendarOpen ? (
                <DatePicker
                  value={focusDate}
                  onSelect={(next) => setFocusDate(next)}
                  onClose={() => setCalendarOpen(false)}
                />
              ) : null}
            </div>

            <button
              type="button"
              className="wm-date-arrow"
              title="Próximo dia"
              onClick={() => setFocusDate((current) => addDays(current, 1))}
            >
              ›
            </button>

            <button type="button" className="wm-btn wm-btn-small" onClick={() => setFocusDate(toISODate(new Date()))}>
              Hoje
            </button>
          </div>

          <div className="wm-timebar-summary">
            <span className="wm-day-count">
              {dayCount} {dayCount === 1 ? "tarefa" : "tarefas"} neste dia
            </span>
            <button
              type="button"
              className={`wm-btn wm-btn-small${onlyDay ? " is-active" : ""}`}
              onClick={() => setOnlyDay((value) => !value)}
              title="Mostrar apenas os cartões com entrega neste dia"
            >
              {onlyDay ? "Vendo só este dia" : "Só este dia"}
            </button>
          </div>
        </div>

        <div className="wm-collab-bar">
          {mapsCollapsed ? (
            <button
              type="button"
              className="wm-btn wm-btn-small"
              title="Mostrar a lista de mapas"
              onClick={() => setMapsCollapsed(false)}
            >
              ☰ Mapas
            </button>
          ) : null}

          <label className="wm-collab-select">
            <span>Colaborador</span>
            <select
              value={selectedCollaboratorId}
              onChange={(event) => setSelectedCollaboratorId(event.target.value)}
            >
              {collaborators.map((collaborator) => (
                <option key={collaborator.id} value={collaborator.id}>
                  {collaborator.name}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            className="wm-btn wm-btn-small"
            title="Voltar para a escolha de colaborador"
            onClick={() => setSelectedCollaboratorId(null)}
          >
            Trocar
          </button>
        </div>

        <header className="wm-toolbar">
          <div className="wm-toolbar-info">
            {currentMap ? (
              <>
                <strong>{currentMap.name}</strong>
                <span className="wm-autosave">{dirty ? "Salvando..." : "Salvo"}</span>
              </>
            ) : (
              <span>Selecione ou crie um mapa</span>
            )}
          </div>
          <div className="wm-toolbar-actions">
            <button
              className="wm-btn"
              type="button"
              onClick={() => setAssigning((value) => !value)}
              disabled={!currentMap}
            >
              Atribuir
            </button>
            <button className="wm-btn" type="button" onClick={handleDeleteMap} disabled={!currentMap}>
              Excluir mapa
            </button>
          </div>
        </header>

        {assigning && currentMap ? (
          <div className="wm-assign-bar">
            <span>Atribuir "{currentMap.name}" para:</span>
            <select
              value={assignCollaboratorId}
              onChange={(event) => setAssignCollaboratorId(event.target.value)}
            >
              <option value="">Selecione o colaborador...</option>
              {collaborators.map((collaborator) => (
                <option key={collaborator.id} value={collaborator.id}>
                  {collaborator.name}
                </option>
              ))}
            </select>
            <button
              className="wm-btn wm-btn-primary"
              type="button"
              onClick={confirmAssign}
              disabled={!assignCollaboratorId}
            >
              Confirmar
            </button>
          </div>
        ) : null}

        <div className="wm-canvas">
          {!currentMap ? (
            <div className="wm-canvas-empty">
              <p>Crie ou selecione um mapa para começar a organizar suas tarefas no quadro.</p>
            </div>
          ) : (
            <BoardView
              nodes={nodes}
              lists={lists}
              collaborators={collaborators}
              focusDate={focusDate}
              onlyDay={onlyDay}
              onAddCard={handleAddCard}
              onOpenCard={setOpenCardId}
              onMoveCard={handleMoveCard}
              onAddList={handleAddList}
              onRenameList={handleRenameList}
              onRemoveList={handleRemoveList}
            />
          )}
        </div>

        {status ? <div className="wm-status">{status}</div> : null}
      </section>

      {selectedBlock ? (
        <aside className="wm-inspector">
          <h3>{selectedBlock.data.title || "Bloco"}</h3>

          <div className="wm-field">
            <span>Cor</span>
            <div className="wm-colors">
              {BLOCK_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={`wm-color${selectedBlock.data.color === color ? " is-active" : ""}`}
                  style={{ background: color }}
                  onClick={() => updateSelectedData({ color })}
                  aria-label={`Cor ${color}`}
                />
              ))}
            </div>
          </div>

          <div className="wm-field">
            <span>Checklist</span>
            <ul className="wm-checklist">
              {(selectedBlock.data.checklist || []).map((item) => (
                <li key={item.id}>
                  <input
                    type="checkbox"
                    checked={item.done}
                    onChange={(event) =>
                      updateSelectedData({
                        checklist: selectedBlock.data.checklist.map((entry) =>
                          entry.id === item.id ? { ...entry, done: event.target.checked } : entry,
                        ),
                      })
                    }
                  />
                  <input
                    className="wm-checklist-text"
                    value={item.text}
                    onChange={(event) =>
                      updateSelectedData({
                        checklist: selectedBlock.data.checklist.map((entry) =>
                          entry.id === item.id ? { ...entry, text: event.target.value } : entry,
                        ),
                      })
                    }
                  />
                  <button
                    type="button"
                    className="wm-checklist-remove"
                    onClick={() =>
                      updateSelectedData({
                        checklist: selectedBlock.data.checklist.filter((entry) => entry.id !== item.id),
                      })
                    }
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
            <button
              type="button"
              className="wm-btn wm-btn-small"
              onClick={() =>
                updateSelectedData({
                  checklist: [...(selectedBlock.data.checklist || []), createChecklistItem("")],
                })
              }
            >
              + Item
            </button>
          </div>

          <div className="wm-field">
            <span>Anexos</span>
            <ul className="wm-attachments">
              {(selectedBlock.data.attachments || []).map((attachment) => (
                <li key={attachment.id}>
                  <input
                    className="wm-attachment-name"
                    placeholder="Nome"
                    value={attachment.name}
                    onChange={(event) =>
                      updateSelectedData({
                        attachments: selectedBlock.data.attachments.map((entry) =>
                          entry.id === attachment.id ? { ...entry, name: event.target.value } : entry,
                        ),
                      })
                    }
                  />
                  <input
                    className="wm-attachment-url"
                    placeholder="Link (URL)"
                    value={attachment.url}
                    onChange={(event) =>
                      updateSelectedData({
                        attachments: selectedBlock.data.attachments.map((entry) =>
                          entry.id === attachment.id ? { ...entry, url: event.target.value } : entry,
                        ),
                      })
                    }
                  />
                  <button
                    type="button"
                    className="wm-checklist-remove"
                    onClick={() =>
                      updateSelectedData({
                        attachments: selectedBlock.data.attachments.filter(
                          (entry) => entry.id !== attachment.id,
                        ),
                      })
                    }
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
            <button
              type="button"
              className="wm-btn wm-btn-small"
              onClick={() =>
                updateSelectedData({
                  attachments: [...(selectedBlock.data.attachments || []), createAttachment()],
                })
              }
            >
              + Anexo
            </button>
          </div>
        </aside>
      ) : null}

      {openCardNode ? (
        <CardModal
          node={openCardNode}
          collaborators={collaborators}
          onChange={(patch) => updateBlockData(openCardNode.id, patch)}
          onClose={() => setOpenCardId(null)}
          ensureSaved={saveNow}
        />
      ) : null}
    </div>
  );
}

export default function AdminApp() {
  return (
    <ReactFlowProvider>
      <AdminAppInner />
    </ReactFlowProvider>
  );
}

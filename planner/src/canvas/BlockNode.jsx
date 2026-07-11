import { Handle, Position } from "@xyflow/react";
import { useLayoutEffect, useRef } from "react";

// Ajusta a fonte do titulo para caber na largura do bloco (sem quebrar em muitas linhas).
function useAutoFitFont(value, { max = 16, min = 9 } = {}) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    let size = max;
    el.style.fontSize = `${size}px`;
    // Diminui a fonte enquanto o texto transbordar a largura disponivel.
    while (size > min && el.scrollWidth > el.clientWidth) {
      size -= 1;
      el.style.fontSize = `${size}px`;
    }
  }, [value, max, min]);
  return ref;
}

function newRouteId() {
  return `rot-${Date.now().toString(36)}-${Math.random().toString(16).slice(2, 8)}`;
}

// Bloco no canvas com edicao inline de titulo e descricao.
// A escrita acontece direto aqui; o painel lateral cuida de cor, checklist e anexos.
export default function BlockNode({ id, data, selected }) {
  const checklist =
    Array.isArray(data.checklists) && data.checklists.length > 0
      ? data.checklists.flatMap((group) => group.items || [])
      : data.checklist || [];
  const doneCount = checklist.filter((item) => item.done).length;
  const onChange = data.onChange;
  const isAnchor = data.kind === "anchor";
  const routes = Array.isArray(data.routes) ? data.routes : [];
  const titleRef = useAutoFitFont(data.title, { max: isAnchor ? 18 : 16, min: 9 });

  const setRoutes = (next) => onChange?.(id, { routes: next });
  const addRoute = () =>
    setRoutes([...routes, { id: newRouteId(), label: `Rota ${routes.length + 1}` }]);
  const removeRoute = (routeId) => setRoutes(routes.filter((route) => route.id !== routeId));
  const renameRoute = (routeId, label) =>
    setRoutes(routes.map((route) => (route.id === routeId ? { ...route, label } : route)));

  return (
    <div
      className={`wm-node${selected ? " is-selected" : ""}${isAnchor ? " is-anchor" : ""}`}
      style={{ borderTopColor: data.color }}
    >
      <Handle type="target" position={Position.Left} className="wm-handle" />

      <input
        ref={titleRef}
        className="wm-node-title-input nodrag"
        value={data.title}
        placeholder={isAnchor ? "Âncora" : "Título do bloco"}
        onChange={(event) => onChange?.(id, { title: event.target.value })}
      />
      <textarea
        className="wm-node-desc-input nodrag nowheel"
        value={data.description}
        placeholder="Descrição..."
        rows={2}
        onChange={(event) => onChange?.(id, { description: event.target.value })}
      />

      {checklist.length > 0 || data.attachments?.length ? (
        <div className="wm-node-meta">
          {checklist.length > 0 ? (
            <span className="wm-node-chip">✓ {doneCount}/{checklist.length}</span>
          ) : null}
          {data.attachments?.length ? (
            <span className="wm-node-chip">📎 {data.attachments.length}</span>
          ) : null}
        </div>
      ) : null}

      {isAnchor ? (
        <div className="wm-routes">
          {routes.map((route) => (
            <div className="wm-route-row" key={route.id}>
              <input
                className="wm-route-input nodrag"
                value={route.label}
                placeholder="Nome da rota"
                onChange={(event) => renameRoute(route.id, event.target.value)}
              />
              {routes.length > 1 ? (
                <button
                  type="button"
                  className="wm-route-remove nodrag"
                  title="Remover rota"
                  onClick={() => removeRoute(route.id)}
                >
                  ×
                </button>
              ) : null}
              <Handle
                id={route.id}
                type="source"
                position={Position.Right}
                className="wm-handle wm-handle-route"
              />
            </div>
          ))}
          <button type="button" className="wm-route-add nodrag" onClick={addRoute}>
            + Rota
          </button>
        </div>
      ) : (
        <Handle type="source" position={Position.Right} className="wm-handle" />
      )}
    </div>
  );
}

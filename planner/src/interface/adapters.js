// Glue entre o modelo da engine (blocos/conexoes) e o modelo do React Flow
// (nodes/edges). Mantido na camada de interface: a engine e o canvas
// permanecem independentes deste formato.

export function blockToNode(block) {
  return {
    id: block.id,
    type: "block",
    position: { x: block.positionX ?? 0, y: block.positionY ?? 0 },
    data: {
      title: block.title || "",
      description: block.description || "",
      checklist: block.checklist || [],
      checklists: Array.isArray(block.checklists) ? block.checklists : [],
      attachments: block.attachments || [],
      color: block.color || "#2f6df6",
      kind: block.kind || "block",
      routes: Array.isArray(block.routes) ? block.routes : [],
      labels: Array.isArray(block.labels) ? block.labels : [],
      members: Array.isArray(block.members) ? block.members : [],
      startDate: block.startDate ?? null,
      dueDate: block.dueDate ?? null,
      dueTime: block.dueTime ?? null,
      recurrence: block.recurrence || "none",
      reminder: block.reminder || "none",
      completed: Boolean(block.completed),
      listId: block.listId ?? null,
      boardOrder: block.boardOrder ?? 0,
      createdAt: block.createdAt,
    },
  };
}

export function nodeToBlock(node) {
  const d = node.data || {};
  return {
    id: node.id,
    title: d.title || "",
    description: d.description || "",
    checklist: d.checklist || [],
    checklists: Array.isArray(d.checklists) ? d.checklists : [],
    attachments: d.attachments || [],
    color: d.color || "#2f6df6",
    kind: d.kind || "block",
    routes: Array.isArray(d.routes) ? d.routes : [],
    labels: Array.isArray(d.labels) ? d.labels : [],
    members: Array.isArray(d.members) ? d.members : [],
    startDate: d.startDate ?? null,
    dueDate: d.dueDate ?? null,
    dueTime: d.dueTime ?? null,
    recurrence: d.recurrence || "none",
    reminder: d.reminder || "none",
    completed: Boolean(d.completed),
    listId: d.listId ?? null,
    boardOrder: d.boardOrder ?? 0,
    positionX: Math.round(node.position.x),
    positionY: Math.round(node.position.y),
    createdAt: d.createdAt,
  };
}

export function connectionToEdge(connection) {
  return {
    id: connection.id,
    source: connection.source,
    target: connection.target,
    sourceHandle: connection.sourceHandle ?? null,
    targetHandle: connection.targetHandle ?? null,
    type: "smoothstep",
  };
}

export function edgeToConnection(edge) {
  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    sourceHandle: edge.sourceHandle ?? null,
    targetHandle: edge.targetHandle ?? null,
  };
}

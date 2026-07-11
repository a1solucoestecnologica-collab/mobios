import { useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  BackgroundVariant,
  SelectionMode,
  MarkerType,
} from "@xyflow/react";
import BlockNode from "./BlockNode.jsx";

const GRID_SIZE = 20;

// Conexoes discretas e elegantes: linha fina, cantos arredondados e seta aberta leve.
const DEFAULT_EDGE_OPTIONS = {
  type: "smoothstep",
  pathOptions: { borderRadius: 14 },
  style: { strokeWidth: 1.5, stroke: "#b4bdca" },
  markerEnd: { type: MarkerType.Arrow, width: 14, height: 14, strokeWidth: 1.5, color: "#b4bdca" },
};

// Wrapper do React Flow. NAO contem regras de negocio.
// Recebe nodes/edges ja prontos e apenas repassa eventos para cima.
export default function MapCanvas({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onNodeClick,
  onPaneClick,
  onSelectionChange,
  defaultViewport,
  onMoveEnd,
  snapToGrid = false,
}) {
  const nodeTypes = useMemo(() => ({ block: BlockNode }), []);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      onNodeClick={onNodeClick}
      onPaneClick={onPaneClick}
      onSelectionChange={onSelectionChange}
      onMoveEnd={onMoveEnd}
      defaultViewport={defaultViewport}
      defaultEdgeOptions={DEFAULT_EDGE_OPTIONS}
      minZoom={0.1}
      maxZoom={2.5}
      snapToGrid={snapToGrid}
      snapGrid={[GRID_SIZE, GRID_SIZE]}
      deleteKeyCode={["Backspace", "Delete"]}
      multiSelectionKeyCode={["Shift", "Meta", "Control"]}
      selectionOnDrag
      selectionMode={SelectionMode.Partial}
      panOnDrag={[1, 2]}
      fitView={!defaultViewport}
      proOptions={{ hideAttribution: true }}
    >
      <Background variant={BackgroundVariant.Dots} gap={22} size={1.5} color="#d5dbe6" />
      <Controls />
    </ReactFlow>
  );
}

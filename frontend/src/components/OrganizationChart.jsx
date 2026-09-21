import { useEffect, useMemo } from "react";
import {
  Background,
  Controls,
  Handle,
  MiniMap,
  Position,
  ReactFlow,
  useNodesState,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const mediaUrl = (value) => value?.startsWith("/uploads/")
  ? `${new URL(API, window.location.origin).origin}${value}` : value;

function OfficialNode({ data }) {
  return <div className="org-node">
    <Handle type="target" position={Position.Top} className="org-node__handle"/>
    <div className="org-node__body">
      {data.imageUrl ? <div className="org-node__media" style={{ "--org-photo": `url(${data.imageUrl})` }}><img src={data.imageUrl} alt={data.name || data.position} className="org-node__photo"/></div> : <div className="org-node__media org-node__photo--empty">{(data.name || data.position || "?").slice(0, 1)}</div>}
      <div className="org-node__content"><p className="org-node__position">{data.position}</p><h3 className="org-node__name">{data.name || "Nama belum tersedia"}</h3>{data.nip && <p className="org-node__nip"><span>NIP</span> {data.nip}</p>}{data.description && <p className="org-node__description">{data.description}</p>}</div>
    </div>
    <Handle type="source" position={Position.Bottom} className="org-node__handle"/>
  </div>;
}

const nodeTypes = { official: OfficialNode };

function fallbackPositions(officials) {
  const byId = new Map(officials.map((item) => [Number(item.id), item]));
  const levelOf = (item, seen = new Set()) => {
    if (!item.parent_id || seen.has(item.id)) return 0;
    const parent = byId.get(Number(item.parent_id));
    return parent ? 1 + levelOf(parent, new Set([...seen, item.id])) : 0;
  };
  const levels = new Map();
  officials.forEach((item) => {
    const level = levelOf(item);
    if (!levels.has(level)) levels.set(level, []);
    levels.get(level).push(item);
  });
  const result = new Map();
  levels.forEach((items, level) => {
    const perRow = 3;
    items.forEach((item, index) => {
      const row = Math.floor(index / perRow);
      const itemsInRow = Math.min(perRow, items.length - row * perRow);
      const column = index % perRow;
      const width = (itemsInRow - 1) * 470;
      result.set(item.id, { x: column * 470 - width / 2, y: level * 285 + row * 260 });
    });
  });
  return result;
}

export default function OrganizationChart({ officials, editable = false, onMove }) {
  const graph = useMemo(() => {
    const fallback = fallbackPositions(officials);
    return {
      nodes: officials.map((item) => ({
        id: String(item.id),
        type: "official",
        position: item.chart_x == null || item.chart_y == null ? fallback.get(item.id) : { x: Number(item.chart_x), y: Number(item.chart_y) },
        data: { position: item.position, name: item.name, nip: item.nip, description: item.description, imageUrl: mediaUrl(item.image_url) },
        draggable: editable,
      })),
      edges: officials.filter((item) => item.parent_id && officials.some((parent) => Number(parent.id) === Number(item.parent_id))).map((item) => ({
        id: `org-${item.parent_id}-${item.id}`,
        source: String(item.parent_id),
        target: String(item.id),
        type: "smoothstep",
        animated: false,
        style: { stroke: "#39704d", strokeWidth: 2 },
      })),
    };
  }, [officials, editable]);
  const [nodes, setNodes, onNodesChange] = useNodesState(graph.nodes);
  useEffect(() => setNodes(graph.nodes), [graph.nodes, setNodes]);

  return <div className="org-chart" role="img" aria-label="Bagan struktur organisasi Kelurahan Kebon Lega">
    <ReactFlow
      nodes={nodes}
      edges={graph.edges}
      nodeTypes={nodeTypes}
      nodesDraggable={editable}
      onNodesChange={onNodesChange}
      nodesConnectable={false}
      elementsSelectable={editable}
      onNodeDragStop={(_event, node) => onMove?.(Number(node.id), node.position)}
      fitView
      fitViewOptions={{ padding: .16, minZoom: .72, maxZoom: 1 }}
      minZoom={.25}
      maxZoom={1.5}
      proOptions={{ hideAttribution: true }}
    >
      <Background color="#cce6d4" gap={22}/>
      <Controls showInteractive={false}/>
      {editable && <MiniMap pannable zoomable nodeColor="#166534" maskColor="rgba(240,253,244,.72)"/>}
    </ReactFlow>
  </div>;
}

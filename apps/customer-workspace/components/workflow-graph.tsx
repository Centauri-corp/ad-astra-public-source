"use client";
import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  Position,
  ReactFlow,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import {
  Check,
  Compass,
  FileText,
  Layers,
  MessagesSquare,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { memo, useEffect, useState } from "react";
import { GRAPH_CONNECTIONS, NODE_INFO } from "@/lib/scenarios";
import {
  NODE_IDS,
  type NodeId,
  type NodeState,
  type RunState,
} from "@/lib/contract";
import "@xyflow/react/dist/style.css";

type ExecutionData = { nodeId: NodeId; state: NodeState; selected: boolean };
type ExecutionNodeType = Node<ExecutionData, "execution">;
const icons = {
  intention: Compass,
  context: Layers,
  sources: FileText,
  polaris: Sparkles,
  review: ShieldCheck,
  response: MessagesSquare,
  handoff: Compass,
};
function ExecutionNode({ data }: NodeProps<ExecutionNodeType>) {
  const info = NODE_INFO[data.nodeId],
    Icon = icons[data.nodeId];
  return (
    <div
      className={`execution-node ${data.nodeId === "polaris" ? "core-node" : ""} state-${data.state} ${data.selected ? "node-selected" : ""}`}
    >
      <Handle type="target" position={Position.Left} isConnectable={false} />
      {data.nodeId === "polaris" && (
        <div className="core-orbits" aria-hidden="true">
          <i />
          <i />
        </div>
      )}
      <span className="node-icon">
        <Icon size={data.nodeId === "polaris" ? 25 : 18} />
      </span>
      <strong>{info.title}</strong>
      <span className="node-subtitle">{info.subtitle}</span>
      <span className="node-state">
        {data.state === "completed" ? <Check size={10} /> : <i />}
        {data.state === "idle" ? "Not started" : data.state}
      </span>
      <Handle type="source" position={Position.Right} isConnectable={false} />
    </div>
  );
}
const nodeTypes = { execution: ExecutionNode };
function WorkflowGraph({
  run,
  selected,
  onSelect,
}: {
  run: RunState;
  selected: NodeId;
  onSelect: (id: NodeId) => void;
}) {
  const [reduced, setReduced] = useState(true);
  useEffect(() => {
    const q = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(q.matches);
    update();
    q.addEventListener("change", update);
    return () => q.removeEventListener("change", update);
  }, []);
  const nodes: ExecutionNodeType[] = NODE_IDS.map((id) => ({
    id,
    type: "execution",
    position: NODE_INFO[id].position,
    data: { nodeId: id, state: run.nodes[id], selected: selected === id },
    ariaLabel: `${NODE_INFO[id].title}: ${run.nodes[id]}. Select for details.`,
    focusable: true,
  }));
  const edges = GRAPH_CONNECTIONS.map(([source, target]) => ({
    id: `${source}-${target}`,
    source,
    target,
    type: "smoothstep",
    animated:
      !reduced &&
      run.status === "running" &&
      (run.nodes[source] === "running" || run.nodes[target] === "running"),
    style: {
      stroke: run.nodes[source] === "completed" ? "#8cbfc3" : "#304450",
      strokeWidth: 1.3,
    },
  }));
  return (
    <ReactFlow<ExecutionNodeType>
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      fitView
      fitViewOptions={{ padding: 0.12 }}
      minZoom={0.35}
      maxZoom={1.4}
      nodesDraggable={false}
      nodesConnectable={false}
      edgesFocusable={false}
      deleteKeyCode={null}
      onNodeClick={(_, node) => onSelect(node.data.nodeId)}
      aria-label="Read-only sample workflow diagram"
      colorMode="dark"
    >
      <Background
        variant={BackgroundVariant.Dots}
        gap={24}
        size={1}
        color="#233441"
      />
      <Controls showInteractive={false} />
    </ReactFlow>
  );
}
export default memo(WorkflowGraph);

import type { UIMessage } from "ai";

export const GRAPH_VERSION = "polaris-preview.v1";
export const NODE_IDS = [
  "intention",
  "context",
  "sources",
  "polaris",
  "review",
  "response",
  "handoff",
] as const;
export type NodeId = (typeof NODE_IDS)[number];
export type NodeState =
  | "idle"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";
export const SCENARIO_IDS = ["research", "creative", "handoff"] as const;
export type ScenarioId = (typeof SCENARIO_IDS)[number];
export type EventType =
  | "run.started"
  | "node.running"
  | "node.completed"
  | "run.completed";
export type WorkflowEvent = {
  runId: string;
  graphVersion: typeof GRAPH_VERSION;
  scenarioId: ScenarioId;
  sequence: number;
  at: string;
  type: EventType;
  nodeId: NodeId | null;
};
export type WorkspaceMessage = UIMessage<unknown, { workflow: WorkflowEvent }>;
export type RunState = {
  runId: string | null;
  scenarioId: ScenarioId | null;
  lastSequence: number;
  status: "idle" | "waiting" | "running" | "completed" | "failed" | "cancelled";
  nodes: Record<NodeId, NodeState>;
  events: WorkflowEvent[];
};
export const RELEASE_BOUNDARY = Object.freeze({
  identityProvider: "clerk",
  identityAccepted: false,
  liveChat: false,
  workflowEditing: false,
  persistence: false,
  billing: false,
  crmWrites: false,
  eventBasis: "synthetic-scenario-only",
  graphVersion: GRAPH_VERSION,
} as const);
export const isUuid = (value: unknown): value is string =>
  typeof value === "string" &&
  /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(
    value,
  );
export const isScenario = (value: unknown): value is ScenarioId =>
  typeof value === "string" &&
  (SCENARIO_IDS as readonly string[]).includes(value);

export function createRun(
  runId: string | null = null,
  scenarioId: ScenarioId | null = null,
): RunState {
  return {
    runId,
    scenarioId,
    lastSequence: 0,
    status: runId ? "waiting" : "idle",
    nodes: Object.fromEntries(NODE_IDS.map((id) => [id, "idle"])) as Record<
      NodeId,
      NodeState
    >,
    events: [],
  };
}
export function endRun(
  state: RunState,
  status: "failed" | "cancelled",
): RunState {
  if (!["waiting", "running"].includes(state.status)) return state;
  return {
    ...state,
    status,
    nodes: Object.fromEntries(
      NODE_IDS.map((id) => [
        id,
        state.nodes[id] === "running" ? status : state.nodes[id],
      ]),
    ) as Record<NodeId, NodeState>,
  };
}
export function parseEvent(value: unknown): WorkflowEvent | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const v = value as Record<string, unknown>;
  if (
    Object.keys(v).sort().join(",") !==
      "at,graphVersion,nodeId,runId,scenarioId,sequence,type" ||
    !isUuid(v.runId) ||
    v.graphVersion !== GRAPH_VERSION ||
    !isScenario(v.scenarioId) ||
    !Number.isSafeInteger(v.sequence) ||
    Number(v.sequence) < 1 ||
    Number(v.sequence) > 32 ||
    typeof v.at !== "string" ||
    !/^\d{4}-\d\d-\d\dT/.test(v.at) ||
    !Number.isFinite(Date.parse(v.at)) ||
    ![
      "run.started",
      "node.running",
      "node.completed",
      "run.completed",
    ].includes(String(v.type))
  )
    return null;
  if (v.type === "run.started" || v.type === "run.completed") {
    if (v.nodeId !== null) return null;
  } else if (!(NODE_IDS as readonly unknown[]).includes(v.nodeId)) return null;
  return v as WorkflowEvent;
}
export function applyEvent(state: RunState, value: unknown): RunState {
  const event = parseEvent(value);
  if (
    !event ||
    event.runId !== state.runId ||
    event.scenarioId !== state.scenarioId ||
    !["waiting", "running"].includes(state.status) ||
    event.sequence <= state.lastSequence
  )
    return state;
  if (event.sequence !== state.lastSequence + 1) return endRun(state, "failed");
  const next = {
    ...state,
    nodes: { ...state.nodes },
    events: [...state.events, event],
    lastSequence: event.sequence,
  };
  if (event.type === "run.started")
    return state.status === "waiting" && event.sequence === 1
      ? { ...next, status: "running" }
      : endRun(state, "failed");
  if (state.status !== "running") return endRun(state, "failed");
  if (event.type === "run.completed")
    return NODE_IDS.every((id) => state.nodes[id] === "completed")
      ? { ...next, status: "completed" }
      : endRun(state, "failed");
  const id = event.nodeId!;
  if (event.type === "node.running" && state.nodes[id] === "idle")
    next.nodes[id] = "running";
  else if (event.type === "node.completed" && state.nodes[id] === "running")
    next.nodes[id] = "completed";
  else return endRun(state, "failed");
  return next;
}

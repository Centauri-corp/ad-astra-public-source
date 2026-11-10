import {
  GRAPH_VERSION,
  NODE_IDS,
  type NodeId,
  type ScenarioId,
  type WorkflowEvent,
} from "./contract.ts";

export const SCENARIOS = {
  research: {
    label: "Research a possibility",
    short: "Research",
    prompt: "How could a community compare its clean-energy options?",
    heading: "A clearer starting point for the question.",
    answer:
      "Start by comparing the same things: local demand, resilience needs, site constraints and lifetime costs.\n\n1. Define the community’s priorities and the evidence needed.\n2. Compare the options against those priorities.\n3. Ask a qualified specialist to review assumptions before a decision.\n\nThis is a fixed illustrative response, not a feasibility study, live research or professional advice.",
    sources: [
      "Sample project brief",
      "Illustrative comparison checklist",
      "Human-review guide",
    ],
  },
  creative: {
    label: "Shape a creative brief",
    short: "Create",
    prompt:
      "Help me frame a visual direction for a community learning project.",
    heading: "Give the idea a direction you can shape.",
    answer:
      "Begin with the audience, the feeling and the change you want to make.\n\n1. Write a one-sentence creative intention.\n2. Explore two directions: a calm learning space and a more expressive discovery space.\n3. Review legibility, accessibility and asset rights before choosing a direction.\n\nThis is a fixed creative example. No image was generated and no external action was taken.",
    sources: [
      "Sample creative brief",
      "Illustrative visual checklist",
      "Asset-review guide",
    ],
  },
  handoff: {
    label: "Plan a human handoff",
    short: "Coordinate",
    prompt:
      "What should a customer-support handoff include before an action is approved?",
    heading: "Keep the person and the next step connected.",
    answer:
      "A considered handoff makes the request, boundaries and accountable person visible.\n\n1. Capture the question without unnecessary personal information.\n2. Summarize the relevant context and unresolved points.\n3. Request human approval before sending a message or changing an account.\n\nThis is a fixed workflow example. No customer record was read, no ticket was opened and no message was sent.",
    sources: [
      "Sample support brief",
      "Illustrative approval checklist",
      "Handoff guide",
    ],
  },
} as const;
export const NODE_INFO: Record<
  NodeId,
  {
    title: string;
    subtitle: string;
    detail: string;
    position: { x: number; y: number };
  }
> = {
  intention: {
    title: "Your intention",
    subtitle: "A question sets the direction",
    detail:
      "The demo uses your selected scenario. Your typed text stays in this tab; it is not sent to the server.",
    position: { x: 0, y: 220 },
  },
  context: {
    title: "Frame the question",
    subtitle: "Goals · context · boundaries",
    detail:
      "An illustrative task-framing step. This is not a model’s internal reasoning.",
    position: { x: 230, y: 60 },
  },
  sources: {
    title: "Reference points",
    subtitle: "Three sample source labels",
    detail:
      "These are fictional demo references, not retrieved documents or verified citations.",
    position: { x: 230, y: 380 },
  },
  polaris: {
    title: "Astra Polaris",
    subtitle: "Human-directed intelligence",
    detail:
      "The central node illustrates orchestration. No language model or external tool runs in this preview.",
    position: { x: 520, y: 190 },
  },
  review: {
    title: "Human checkpoint",
    subtitle: "Keep judgment in the loop",
    detail:
      "An illustrated checkpoint only. The demo does not request, grant or impersonate a real approval.",
    position: { x: 820, y: 60 },
  },
  response: {
    title: "Response draft",
    subtitle: "A fixed, streamed example",
    detail:
      "The sample response streams through the AI SDK protocol. It is not generated from your question.",
    position: { x: 1060, y: 220 },
  },
  handoff: {
    title: "A considered next step",
    subtitle: "Clear ownership · no action",
    detail:
      "No CRM write, account change, message or purchase occurs. Real execution remains gated.",
    position: { x: 820, y: 380 },
  },
};
export const GRAPH_CONNECTIONS = [
  ["intention", "context"],
  ["intention", "sources"],
  ["context", "polaris"],
  ["sources", "polaris"],
  ["polaris", "review"],
  ["review", "response"],
  ["response", "handoff"],
] as const;
export function scenarioEvents(
  runId: string,
  scenarioId: ScenarioId,
  now: () => string = () => new Date().toISOString(),
): WorkflowEvent[] {
  let sequence = 0;
  const event = (
    type: WorkflowEvent["type"],
    nodeId: NodeId | null,
  ): WorkflowEvent => ({
    runId,
    scenarioId,
    graphVersion: GRAPH_VERSION,
    sequence: ++sequence,
    at: now(),
    type,
    nodeId,
  });
  return [
    event("run.started", null),
    ...NODE_IDS.flatMap((id) => [
      event("node.running", id),
      event("node.completed", id),
    ]),
    event("run.completed", null),
  ];
}

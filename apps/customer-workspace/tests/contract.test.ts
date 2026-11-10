import { test } from "node:test";
import assert from "node:assert/strict";
import {
  applyEvent,
  createRun,
  endRun,
  GRAPH_VERSION,
  NODE_IDS,
  RELEASE_BOUNDARY,
  parseEvent,
} from "../lib/contract.ts";
import {
  scenarioEvents,
  SCENARIOS,
  GRAPH_CONNECTIONS,
} from "../lib/scenarios.ts";
import {
  previewEnabled,
  previewOrigin,
  samePreviewOrigin,
} from "../lib/preview-policy.ts";
import { DemoInputError, readDemoRequest } from "../lib/demo-request.ts";
const runId = "12345678-1234-4123-8123-123456789012";
const otherRun = "12345678-1234-4123-8123-123456789013";
const events = () =>
  scenarioEvents(runId, "research", () => "2026-11-10T00:00:00.000Z");
const env = {
  AD_ASTRA_WORKSPACE_PREVIEW: "true",
  AD_ASTRA_WORKSPACE_ORIGIN: "http://127.0.0.1:4176",
};
test("diagram edges follow the sample event order and every non-root step has an incoming edge", () => {
  for (const [source, target] of GRAPH_CONNECTIONS)
    assert.ok(NODE_IDS.indexOf(source) < NODE_IDS.indexOf(target));
  for (const id of NODE_IDS.slice(1))
    assert.ok(GRAPH_CONNECTIONS.some(([, target]) => target === id));
});
test("all seven nodes require an ordered running/completed event before run completion", () => {
  const initial = createRun(runId, "research"),
    result = events().reduce(applyEvent, initial);
  assert.equal(result.status, "completed");
  assert.equal(result.lastSequence, 16);
  assert.equal(result.events.length, 16);
  assert.ok(NODE_IDS.every((id) => result.nodes[id] === "completed"));
  assert.equal(initial.lastSequence, 0);
});
test("duplicate, foreign-run, wrong-version and foreign-scenario events do not change state", () => {
  const [start] = events();
  const state = applyEvent(createRun(runId, "research"), start);
  for (const event of [
    start,
    { ...start, runId: otherRun },
    { ...start, graphVersion: "untrusted-version" },
    { ...start, scenarioId: "creative" },
  ])
    assert.equal(applyEvent(state, event), state);
});
test("out-of-order events fail closed and premature completion is never successful", () => {
  const started = applyEvent(createRun(runId, "research"), events()[0]);
  assert.equal(applyEvent(started, events()[2]).status, "failed");
  assert.equal(
    applyEvent(started, { ...events()[0], type: "run.completed", sequence: 2 })
      .status,
    "failed",
  );
});
test("terminal cancellation and failure cannot be overwritten by late stream events", () => {
  const active = events()
    .slice(0, 2)
    .reduce(applyEvent, createRun(runId, "research"));
  for (const status of ["cancelled", "failed"] as const) {
    const stopped = endRun(active, status);
    assert.equal(stopped.nodes.intention, status);
    assert.equal(applyEvent(stopped, events()[2]), stopped);
  }
  const completed = events().reduce(applyEvent, createRun(runId, "research"));
  assert.equal(endRun(completed, "failed"), completed);
});
test("event validator rejects unknown fields, node IDs, invalid sequence and timestamps", () => {
  for (const event of [
    null,
    [],
    { ...events()[0], sequence: -1 },
    { ...events()[0], sequence: 33 },
    { ...events()[0], at: "yesterday" },
    { ...events()[0], token: "private" },
    { ...events()[1], nodeId: "send-money" },
    { ...events()[0], nodeId: "intention" },
  ])
    assert.equal(parseEvent(event), null);
  assert.equal(parseEvent(events()[0])?.graphVersion, GRAPH_VERSION);
});
test("all scenarios are fixed, clearly illustrative and do not grant external capabilities", () => {
  assert.equal(Object.keys(SCENARIOS).length, 3);
  for (const scenario of Object.values(SCENARIOS)) {
    assert.match(scenario.answer, /fixed/i);
    assert.equal(scenario.sources.length, 3);
  }
  for (const field of [
    "liveChat",
    "workflowEditing",
    "persistence",
    "billing",
    "crmWrites",
    "identityAccepted",
  ] as const)
    assert.equal(RELEASE_BOUNDARY[field], false);
});
test("preview is disabled by default and cannot be enabled in Vercel production", () => {
  assert.equal(previewEnabled({}), false);
  assert.equal(previewEnabled(env), true);
  assert.equal(previewEnabled({ ...env, VERCEL_ENV: "production" }), false);
  assert.equal(
    previewEnabled({ ...env, AD_ASTRA_WORKSPACE_PREVIEW: "yes" }),
    false,
  );
  for (const origin of [
    "https://evil.example",
    "http://127.0.0.1:4176/",
    "http://127.0.0.1:4176/private",
    "https://adastra.global",
    "http://user:pass@localhost:4176",
    "javascript:alert(1)",
  ])
    assert.equal(
      previewOrigin({ ...env, AD_ASTRA_WORKSPACE_ORIGIN: origin }),
      null,
    );
});
test("demo endpoint origin checks reject cross-site calls and forged Host headers", () => {
  const make = (headers: Record<string, string>) =>
    new Request("http://127.0.0.1:4176/api/demo", { headers });
  assert.equal(
    samePreviewOrigin(
      make({
        origin: env.AD_ASTRA_WORKSPACE_ORIGIN,
        "x-ad-astra-preview": "workflow-v1",
      }),
      env,
    ),
    true,
  );
  const denied: Record<string, string>[] = [
    {
      origin: "https://evil.example",
      host: "127.0.0.1:4176",
      "x-ad-astra-preview": "workflow-v1",
    },
    {
      origin: env.AD_ASTRA_WORKSPACE_ORIGIN,
      "x-ad-astra-preview": "workflow-v1",
      "sec-fetch-site": "cross-site",
    },
    { origin: env.AD_ASTRA_WORKSPACE_ORIGIN },
  ];
  for (const headers of denied)
    assert.equal(samePreviewOrigin(make(headers), env), false);
  assert.equal(
    samePreviewOrigin(make({ "x-ad-astra-preview": "workflow-v1" }), {}),
    false,
  );
});
const request = (body: unknown, headers: Record<string, string> = {}) =>
  new Request("http://127.0.0.1:4176/api/demo", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
test("demo accepts only scenario and run IDs; prompts, roles and tenant fields are refused", async () => {
  const body = { scenarioId: "research", runId };
  assert.deepEqual(await readDemoRequest(request(body)), body);
  for (const change of [
    { question: "private text" },
    { messages: [] },
    { tenantId: "other" },
    { role: "admin" },
    { scenarioId: "__proto__" },
    { runId: "not-a-uuid" },
  ])
    await assert.rejects(
      () => readDemoRequest(request({ ...body, ...change })),
      (error: unknown) =>
        error instanceof DemoInputError && error.status === 422,
    );
});
test("streamed or declared oversized input, invalid JSON and wrong content types are bounded", async () => {
  await assert.rejects(
    () => readDemoRequest(request("x".repeat(257))),
    (e: unknown) => e instanceof DemoInputError && e.status === 413,
  );
  await assert.rejects(
    () => readDemoRequest(request("{}", { "content-length": "999" })),
    (e: unknown) => e instanceof DemoInputError && e.status === 413,
  );
  await assert.rejects(
    () => readDemoRequest(request("{")),
    (e: unknown) => e instanceof DemoInputError && e.status === 400,
  );
  await assert.rejects(
    () => readDemoRequest(request("{}", { "content-type": "text/plain" })),
    (e: unknown) => e instanceof DemoInputError && e.status === 415,
  );
});

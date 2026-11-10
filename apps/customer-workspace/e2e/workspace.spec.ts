import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
const evidence = path.resolve(import.meta.dirname, "../../../LStra/evidence");
test.beforeAll(() => fs.mkdirSync(evidence, { recursive: true }));
test("protected-preview cookies stay same-origin and never replace customer identity or send prompts", async ({
  page,
  context,
}) => {
  await context.addCookies([
    {
      name: "_vercel_jwt",
      value: "synthetic-platform-session",
      domain: "127.0.0.1",
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
  const calls: Promise<{
    path: string;
    cookie?: string;
    authorization?: string;
    body: string | null;
  }>[] = [];
  page.on("request", (request) => {
    if (/\/api\/(demo|access-status)$/.test(request.url())) {
      calls.push(
        request.allHeaders().then((headers) => ({
          path: new URL(request.url()).pathname,
          cookie: headers.cookie,
          authorization: headers.authorization,
          body: request.postData(),
        })),
      );
    }
  });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Preview boundaries and privacy" })
    .click();
  await page
    .getByRole("button", { name: "Check access configuration" })
    .click();
  await expect(page.locator(".access-readiness [role=status]")).toContainText(
    "Customer access remains gated",
  );
  await page.keyboard.press("Escape");
  await page
    .getByLabel("Your question — stays in this tab")
    .fill("LOCAL-HOSTING-PRIVACY-CANARY");
  await page.getByRole("button", { name: "Preview selected scenario" }).click();
  await expect(page.locator(".run-state")).toHaveText("Sample complete");
  expect(calls).toHaveLength(2);
  for (const call of await Promise.all(calls)) {
    expect(call.cookie).toBe("_vercel_jwt=synthetic-platform-session");
    expect(call.authorization).toBeUndefined();
    expect(call.body ?? "").not.toContain("LOCAL-HOSTING-PRIVACY-CANARY");
  }
});
test("access readiness reads configuration only on demand, without tokens or chat text", async ({
  page,
}) => {
  const requests: {
    method: string;
    body: string | null;
    authorization?: string;
    cookie?: string;
  }[] = [];
  page.on("request", (request) => {
    if (request.url().endsWith("/api/access-status")) {
      const headers = request.headers();
      requests.push({
        method: request.method(),
        body: request.postData(),
        authorization: headers.authorization,
        cookie: headers.cookie,
      });
    }
  });
  await page.goto("/");
  await page
    .getByLabel("Your question — stays in this tab")
    .fill("LOCAL-ACCESS-PRIVACY-CANARY");
  await page
    .getByRole("button", { name: "Preview boundaries and privacy" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Customer access readiness" }),
  ).toBeVisible();
  expect(requests).toHaveLength(0);
  await page
    .getByRole("button", { name: "Check access configuration" })
    .click();
  await expect(page.locator(".access-readiness [role=status]")).toContainText(
    "QA verification is not configured",
  );
  expect(requests).toEqual([
    { method: "GET", body: null, authorization: undefined, cookie: undefined },
  ]);
  await page.screenshot({
    path: path.join(evidence, "workspace-access-readiness.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  const modal = await page.getByRole("dialog").boundingBox();
  expect(modal!.width).toBeLessThanOrEqual(358);
  expect(modal!.height).toBeLessThanOrEqual(812);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
  ).toBe(false);
  await page.screenshot({
    path: path.join(evidence, "workspace-access-readiness-mobile.png"),
    fullPage: true,
  });
});
test("unavailable or unsafe readiness metadata cannot paint public access as approved", async ({
  page,
}) => {
  const metadata = {
    schema: "ad-astra-access/v1",
    identityProvider: "clerk",
    sessionBoundary: "qa-configured",
    customerAccess: false,
    providerQaAccepted: false,
    liveChat: false,
    persistence: false,
    privilegedActions: false,
  };
  await page.route("**/api/access-status", (route) =>
    route.fulfill({ json: metadata }),
  );
  await page.goto("/");
  await page
    .getByRole("button", { name: "Preview boundaries and privacy" })
    .click();
  await page
    .getByRole("button", { name: "Check access configuration" })
    .click();
  await expect(page.locator(".access-readiness [role=status]")).toContainText(
    "customer access are not approved",
  );
  await page.unroute("**/api/access-status");
  await page.route("**/api/access-status", (route) =>
    route.fulfill({ json: { ...metadata, customerAccess: true } }),
  );
  await page
    .getByRole("button", { name: "Check access configuration" })
    .click();
  await expect(page.locator(".access-readiness [role=status]")).toContainText(
    "Status unavailable",
  );
  await page.unroute("**/api/access-status");
  await page
    .getByRole("button", { name: "Check access configuration" })
    .click();
  await expect(page.locator(".access-readiness [role=status]")).toContainText(
    "QA verification is not configured",
  );
});
test("unconfigured session handshake cannot be bypassed by forged browser identity", async ({
  request,
}) => {
  const response = await request.post("/api/session", {
    headers: {
      origin: "http://127.0.0.1:4176",
      "x-ad-astra-preview": "workflow-v1",
      authorization: "Bearer a.b.c",
      "x-tenant-id": "other",
      "x-role": "admin",
    },
  });
  expect(response.status()).toBe(503);
  expect(await response.json()).toEqual({
    authenticated: false,
    error: "authentication_unavailable",
  });
});
test("desktop workspace loads with seven read-only nodes, CSP and conservative indexing", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  const response = await page.goto("/");
  await expect(page.locator(".execution-node")).toHaveCount(7);
  expect(response?.headers()["x-robots-tag"]).toContain("noindex");
  expect(response?.headers()["content-security-policy"]).toContain("'nonce-");
  expect(response?.headers()["content-security-policy"]).not.toContain(
    "script-src 'self' 'unsafe-inline'",
  );
  await expect(
    page.getByRole("heading", { name: "Astra Polaris", level: 1 }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
  ).toBe(false);
  expect(errors).toEqual([]);
  await page.screenshot({
    path: path.join(evidence, "workspace-desktop.png"),
    fullPage: true,
  });
});
test("sample streams to chat and all nodes without sending the typed text or history", async ({
  page,
}) => {
  const bodies: unknown[] = [];
  const external: string[] = [];
  page.on("request", (request) => {
    if (request.url().endsWith("/api/demo"))
      bodies.push(request.postDataJSON());
    if (!request.url().startsWith("http://127.0.0.1:4176"))
      external.push(request.url());
  });
  await page.goto("/");
  await page
    .getByLabel("Your question — stays in this tab")
    .fill("LOCAL-PRIVACY-CANARY <img src=x onerror=alert(1)>");
  await page.getByRole("button", { name: "Preview selected scenario" }).click();
  await expect(page.locator(".run-state")).toHaveText("Sample complete");
  await expect(page.locator(".execution-node.state-completed")).toHaveCount(7);
  await expect(page.locator(".message-assistant")).toContainText(
    "fixed illustrative response",
  );
  await expect(page.locator(".message-user")).toContainText(
    "LOCAL-PRIVACY-CANARY",
  );
  expect(bodies).toHaveLength(1);
  expect(Object.keys(bodies[0] as object).sort()).toEqual([
    "runId",
    "scenarioId",
  ]);
  expect(JSON.stringify(bodies)).not.toContain("LOCAL-PRIVACY-CANARY");
  expect(external).toEqual([]);
  expect(await page.locator(".message-user img").count()).toBe(0);
  expect(
    await page.evaluate(() => ({
      local: localStorage.length,
      session: sessionStorage.length,
    })),
  ).toEqual({ local: 0, session: 0 });
  await page.screenshot({
    path: path.join(evidence, "workspace-completed.png"),
    fullPage: true,
  });
});
for (const [label, copy] of [
  ["Shape a creative brief", "fixed creative example"],
  ["Plan a human handoff", "fixed workflow example"],
])
  test(label + " is a clearly labeled scenario", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: label }).click();
    await page
      .getByRole("button", { name: "Preview selected scenario" })
      .click();
    await expect(page.locator(".run-state")).toHaveText("Sample complete");
    await expect(page.locator(".message-assistant")).toContainText(copy);
  });
test("stopping cannot leave a successful or running state, and a new run is independent", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Research a possibility" }).click();
  await page.getByRole("button", { name: "Preview selected scenario" }).click();
  await expect(
    page.getByRole("button", { name: "Stop sample stream" }),
  ).toBeVisible();
  await expect(page.locator(".execution-node.state-running")).toHaveCount(1);
  await page.getByRole("button", { name: "Stop sample stream" }).click();
  await expect(page.locator(".run-state")).toHaveText("Sample stopped");
  await page.waitForTimeout(350);
  await expect(page.locator(".execution-node.state-running")).toHaveCount(0);
  await page.getByRole("button", { name: "Clear conversation" }).click();
  await expect(page.locator(".message")).toHaveCount(0);
  await page.getByRole("button", { name: "Shape a creative brief" }).click();
  await page.getByRole("button", { name: "Preview selected scenario" }).click();
  await expect(page.locator(".run-state")).toHaveText("Sample complete");
});
test("failed stream shows a safe error and permits a working retry", async ({
  page,
}) => {
  await page.route("**/api/demo", (route) => route.abort());
  await page.goto("/");
  await page.getByRole("button", { name: "Research a possibility" }).click();
  await page.getByRole("button", { name: "Preview selected scenario" }).click();
  await expect(page.locator(".stream-error")).toContainText(
    "could not be completed",
  );
  await expect(page.locator(".run-state")).toHaveText("Sample interrupted");
  await page.unroute("**/api/demo");
  await page.getByRole("button", { name: "Retry sample" }).click();
  await expect(page.locator(".run-state")).toHaveText("Sample complete");
});
test("memory clears on reload, modal notes block background focus and Escape closes them", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByLabel("Your question — stays in this tab")
    .fill("ephemeral draft");
  await page.reload();
  await expect(
    page.getByLabel("Your question — stays in this tab"),
  ).toHaveValue("");
  await page
    .getByRole("button", { name: "Preview boundaries and privacy" })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  expect(
    await page
      .getByRole("dialog")
      .evaluate((element) => element.matches(":modal")),
  ).toBe(true);
  await page.getByLabel("Your question — stays in this tab").focus();
  await expect(
    page.getByLabel("Your question — stays in this tab"),
  ).not.toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(
    page.getByRole("button", { name: "Preview boundaries and privacy" }),
  ).toBeFocused();
});
test("a prematurely finished stream cannot report success or leave a running node", async ({
  page,
}) => {
  await page.route("**/api/demo", (route) => {
    const { runId, scenarioId } = route.request().postDataJSON();
    const event = {
      runId,
      scenarioId,
      graphVersion: "polaris-preview.v1",
      at: new Date().toISOString(),
    };
    const parts = [
      { type: "start", messageId: runId },
      {
        type: "data-workflow",
        transient: true,
        data: { ...event, sequence: 1, type: "run.started", nodeId: null },
      },
      {
        type: "data-workflow",
        transient: true,
        data: {
          ...event,
          sequence: 2,
          type: "node.running",
          nodeId: "intention",
        },
      },
      { type: "finish", finishReason: "stop" },
    ];
    return route.fulfill({
      status: 200,
      headers: {
        "content-type": "text/event-stream",
        "x-vercel-ai-ui-message-stream": "v1",
      },
      body:
        parts.map((part) => `data: ${JSON.stringify(part)}\n\n`).join("") +
        "data: [DONE]\n\n",
    });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Research a possibility" }).click();
  await page.getByRole("button", { name: "Preview selected scenario" }).click();
  await expect(page.locator(".run-state")).toHaveText("Sample interrupted");
  await expect(page.locator(".execution-node.state-running")).toHaveCount(0);
  await expect(page.locator(".execution-node.state-completed")).toHaveCount(0);
  await expect(page.locator(".stream-error")).toContainText(
    "could not be completed",
  );
  await page.unroute("**/api/demo");
  await page.getByRole("button", { name: "Retry sample" }).click();
  await expect(page.locator(".run-state")).toHaveText("Sample complete");
});
for (const width of [320, 390, 768])
  test(
    "responsive workspace at " + width + "px has no horizontal overflow",
    async ({ page }) => {
      await page.setViewportSize({ width, height: 844 });
      await page.goto("/");
      await expect(
        page.getByRole("heading", { name: "Astra Polaris", level: 1 }),
      ).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
      ).toBe(false);
      await page
        .getByRole("button", { name: "Show accessible workflow list" })
        .click();
      await expect(
        page.getByRole("list", { name: "Sample workflow steps" }).locator("li"),
      ).toHaveCount(7);
      if (width === 390) {
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.screenshot({
          path: path.join(evidence, "workspace-mobile.png"),
          fullPage: true,
        });
      }
    },
  );
test("the browser diagram cannot drag, delete or connect graph nodes", async ({
  page,
}) => {
  await page.goto("/");
  const node = page.locator(".react-flow__node").first();
  await expect(page.locator(".react-flow__node")).toHaveCount(7);
  const before = await node.getAttribute("style");
  await node.dragTo(page.locator(".workflow-top"));
  expect(await node.getAttribute("style")).toBe(before);
  await node.focus();
  await page.keyboard.press("Delete");
  await expect(page.locator(".react-flow__node")).toHaveCount(7);
  await expect(page.locator(".react-flow__handle.connectable")).toHaveCount(0);
});
test("direct live chat, forged admin graph writes and unsafe demo inputs remain denied", async ({
  request,
}) => {
  expect(
    (
      await request.post("/api/chat", { data: { role: "admin", messages: [] } })
    ).status(),
  ).toBe(503);
  for (const method of ["POST", "PUT", "PATCH", "DELETE"])
    expect(
      (
        await request.fetch("/api/graphs", {
          method,
          data: { role: "admin", nodes: [] },
        })
      ).status(),
    ).toBe(403);
  const headers = {
    origin: "http://127.0.0.1:4176",
    "x-ad-astra-preview": "workflow-v1",
  };
  const valid = {
    scenarioId: "research",
    runId: "12345678-1234-4123-8123-123456789012",
  };
  expect(
    (
      await request.post("/api/demo", {
        headers: { ...headers, origin: "https://evil.example" },
        data: valid,
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await request.post("/api/demo", {
        headers,
        data: { ...valid, question: "private" },
      })
    ).status(),
  ).toBe(422);
  expect(
    (
      await request.post("/api/demo", {
        headers,
        data: { ...valid, question: "x".repeat(1024) },
      })
    ).status(),
  ).toBe(413);
});

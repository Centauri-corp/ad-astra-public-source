import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:net";
import { setTimeout as delay } from "node:timers/promises";
import { signingFixture } from "../fixtures/session-fixture.ts";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
const fixture = signingFixture();
test("server verifier configuration and fixtures are absent from browser JavaScript", () => {
  const root = path.resolve(".next/static");
  const files = readdirSync(root, { recursive: true }).filter((name) =>
    name.endsWith(".js"),
  );
  assert.ok(files.length > 0);
  for (const file of files)
    assert.doesNotMatch(
      readFileSync(path.join(root, file), "utf8"),
      /CLERK_JWT_KEY|AD_ASTRA_AUTH_ISSUER|local-qa-only|BEGIN (?:RSA )?PRIVATE KEY|clerk\.adastra\.global/,
    );
});

async function unusedPort() {
  const listener = createServer();
  listener.listen(0, "127.0.0.1");
  await once(listener, "listening");
  const { port } = listener.address();
  await new Promise((resolve, reject) =>
    listener.close((error) => (error ? reject(error) : resolve())),
  );
  return port;
}

for (const scenario of [
  { name: "default configuration", flag: "", environment: "" },
  {
    name: "production even with the preview flag set",
    flag: "true",
    environment: "production",
  },
  {
    name: "configured non-production session QA",
    flag: "true",
    environment: "preview",
    qa: true,
  },
]) {
  test(
    `built server maintains the access boundary in ${scenario.name}`,
    { timeout: 30000 },
    async () => {
      const port = await unusedPort(),
        origin = `http://127.0.0.1:${port}`;
      const child = spawn(
        process.execPath,
        [
          "node_modules/next/dist/bin/next",
          "start",
          "--hostname",
          "127.0.0.1",
          "--port",
          String(port),
        ],
        {
          env: {
            ...process.env,
            ...fixture.env,
            NODE_ENV: "production",
            NEXT_TELEMETRY_DISABLED: "1",
            AD_ASTRA_WORKSPACE_PREVIEW: scenario.flag,
            AD_ASTRA_WORKSPACE_ORIGIN: origin,
            VERCEL_ENV: scenario.environment,
            VERCEL_GIT_COMMIT_SHA: "a".repeat(40),
          },
          stdio: ["ignore", "pipe", "pipe"],
        },
      );
      let logs = "";
      for (const output of [child.stdout, child.stderr])
        output.on("data", (chunk) => {
          logs = (logs + chunk).slice(-3000);
        });
      try {
        let response;
        for (let attempt = 0; attempt < 80; attempt++) {
          assert.equal(child.exitCode, null, `Preview server exited: ${logs}`);
          try {
            response = await fetch(origin, {
              signal: AbortSignal.timeout(1000),
            });
            break;
          } catch {
            await delay(100);
          }
        }
        assert.ok(response, `Preview server failed to start: ${logs}`);
        assert.equal(response.status, scenario.qa ? 200 : 404);
        assert.match(
          await response.text(),
          scenario.qa
            ? /Discovery workspace preview/
            : /workspace is not released/i,
        );
        assert.match(response.headers.get("x-robots-tag"), /noindex/);
        assert.match(response.headers.get("cache-control"), /no-store/);
        if (!scenario.qa) {
          const demo = await fetch(`${origin}/api/demo`, {
            method: "POST",
            headers: {
              origin,
              "content-type": "application/json",
              "x-ad-astra-preview": "workflow-v1",
            },
            body: JSON.stringify({
              scenarioId: "research",
              runId: "12345678-1234-4123-8123-123456789012",
            }),
          });
          assert.equal(demo.status, 404);
          assert.deepEqual(await demo.json(), { error: "preview_disabled" });
          assert.equal(
            (await fetch(`${origin}/api/session`, { method: "POST" })).status,
            404,
          );
          assert.equal(
            (await fetch(`${origin}/api/access-status`)).status,
            404,
          );
          assert.equal((await fetch(`${origin}/api/preview`)).status, 404);
        } else {
          const headers = {
            origin,
            "x-ad-astra-preview": "workflow-v1",
            authorization: `Bearer ${fixture.token({ azp: origin })}`,
          };
          const session = await fetch(`${origin}/api/session`, {
            method: "POST",
            headers,
          });
          assert.equal(session.status, 200);
          assert.deepEqual(await session.json(), {
            authenticated: true,
            scopeType: "personal",
            customerAccess: false,
            providerQaAccepted: false,
          });
          assert.equal(
            (
              await fetch(`${origin}/api/session`, {
                method: "POST",
                headers: { ...headers, origin: "https://evil.example" },
              })
            ).status,
            403,
          );
          assert.equal(
            (
              await fetch(`${origin}/api/session`, {
                method: "POST",
                headers: { ...headers, authorization: "Bearer a.b.c" },
              })
            ).status,
            401,
          );
          assert.equal(
            (
              await fetch(`${origin}/api/session`, {
                method: "POST",
                headers,
                body: '{"tenantId":"other"}',
              })
            ).status,
            400,
          );
          const metadata = await (
            await fetch(`${origin}/api/access-status`)
          ).json();
          assert.equal(metadata.sessionBoundary, "qa-configured");
          assert.equal(metadata.customerAccess, false);
          assert.equal(metadata.providerQaAccepted, false);
          const build = await (await fetch(`${origin}/api/preview`)).json();
          assert.equal(build.sourceCommit, "a".repeat(40));
          assert.equal(build.customerAccess, false);
          assert.equal(build.liveChat, false);
        }
        assert.equal(
          (await fetch(`${origin}/api/chat`, { method: "POST" })).status,
          503,
        );
        assert.equal(
          (await fetch(`${origin}/api/graphs`, { method: "POST" })).status,
          403,
        );
      } finally {
        if (child.exitCode === null && child.signalCode === null) {
          const exited = once(child, "exit");
          child.kill("SIGTERM");
          const watchdog = setTimeout(() => child.kill("SIGKILL"), 3000);
          try {
            await exited;
          } finally {
            clearTimeout(watchdog);
          }
        }
      }
    },
  );
}

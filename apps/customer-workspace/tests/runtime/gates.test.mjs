import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:net";
import { setTimeout as delay } from "node:timers/promises";

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
]) {
  test(
    `built server denies workspace access in ${scenario.name}`,
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
            NODE_ENV: "production",
            NEXT_TELEMETRY_DISABLED: "1",
            AD_ASTRA_WORKSPACE_PREVIEW: scenario.flag,
            AD_ASTRA_WORKSPACE_ORIGIN: origin,
            VERCEL_ENV: scenario.environment,
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
        assert.equal(response.status, 404);
        assert.match(await response.text(), /workspace is not released/i);
        assert.match(response.headers.get("x-robots-tag"), /noindex/);
        assert.match(response.headers.get("cache-control"), /no-store/);
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

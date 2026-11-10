import { spawn } from "node:child_process";
const production = process.argv.includes("--production");
const child = spawn(
  process.execPath,
  [
    "node_modules/next/dist/bin/next",
    production ? "start" : "dev",
    "--hostname",
    "127.0.0.1",
    "--port",
    "4176",
  ],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      NEXT_TELEMETRY_DISABLED: "1",
      AD_ASTRA_WORKSPACE_PREVIEW: "true",
      AD_ASTRA_WORKSPACE_ORIGIN: "http://127.0.0.1:4176",
    },
  },
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => child.kill(signal));
child.on("exit", (code) => {
  process.exitCode = code ?? 0;
});

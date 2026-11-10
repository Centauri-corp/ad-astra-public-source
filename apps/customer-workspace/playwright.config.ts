import { defineConfig } from "@playwright/test";
import { existsSync } from "node:fs";
import path from "node:path";
export default defineConfig({
  testDir: "./e2e",
  timeout: 25000,
  fullyParallel: false,
  workers: 1,
  reporter: "line",
  outputDir: path.resolve(
    import.meta.dirname,
    "../../LStra/evidence/workspace-browser",
  ),
  use: {
    baseURL: "http://127.0.0.1:4176",
    viewport: { width: 1440, height: 1000 },
    reducedMotion: "reduce",
    launchOptions: {
      executablePath: existsSync("/usr/bin/chromium")
        ? "/usr/bin/chromium"
        : undefined,
      args: ["--no-sandbox", "--disable-dev-shm-usage"],
    },
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "npm run preview:start",
    url: "http://127.0.0.1:4176",
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});

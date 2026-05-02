import { defineConfig, devices } from "@playwright/test";
import fs from "node:fs";

const port = Number(process.env.PLAYWRIGHT_PORT ?? 3100);
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${port}`;
const defaultServerCommand =
  !process.env.CI && fs.existsSync(".env.development")
    ? "node --env-file=.env.development server/index.js"
    : "npm start";
const serverCommand =
  process.env.PLAYWRIGHT_SERVER_COMMAND ?? defaultServerCommand;

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 45_000,
  expect: {
    timeout: 10_000
  },
  fullyParallel: false,
  use: {
    baseURL,
    trace: "on-first-retry"
  },
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: serverCommand,
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 20_000,
        env: {
          ...process.env,
          PORT: String(port)
        }
      },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] }
    }
  ]
});

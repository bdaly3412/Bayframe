import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";
import { defineConfig } from "@playwright/test";

if (existsSync(".env.local")) loadEnvFile(".env.local");

export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 120000,
  expect: { timeout: 10000 },
  reporter: "list",
  outputDir: "output/playwright/test-results",
  use: {
    baseURL: "http://127.0.0.1:3000",
    channel: "chrome",
    viewport: { width: 1440, height: 1000 },
    actionTimeout: 10000,
    navigationTimeout: 15000,
    trace: "off",
    screenshot: "only-on-failure",
    video: "off",
  },
  webServer: {
    command: "pnpm start --hostname 127.0.0.1 --port 3000",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: process.env.BAYFRAME_REUSE_SERVER === "1",
    timeout: 60000,
  },
});

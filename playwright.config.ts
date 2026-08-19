import { join } from "node:path";

import { defineConfig, devices } from "@playwright/test";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;

if (!testDatabaseUrl) {
  throw new Error("TEST_DATABASE_URL is required for Playwright tests.");
}

if (process.env.DATABASE_URL && process.env.DATABASE_URL === testDatabaseUrl) {
  throw new Error("TEST_DATABASE_URL must not match DATABASE_URL.");
}

const baseURL = "http://127.0.0.1:3100";
const nextCli = join(process.cwd(), "node_modules", "next", "dist", "bin", "next");
const nextStartCommand = `"${process.execPath}" "${nextCli}" start --hostname 127.0.0.1 --port 3100`;

export default defineConfig({
  testDir: ".",
  testMatch: ["tests/**/*.spec.ts"],
  globalSetup: "./tests/global-setup.ts",
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: nextStartCommand,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      ...process.env,
      DATABASE_URL: testDatabaseUrl,
      AUTH_SECRET: "signal-room-playwright-secret-at-least-32-characters",
      AUTH_URL: baseURL,
    },
  },
});

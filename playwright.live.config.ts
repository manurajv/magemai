import { defineConfig, devices } from "@playwright/test";

/**
 * Live e2e against project magemai. It does not start emulators.
 * It fails until rules, indexes, functions, and platform settings are deployed,
 * and until Application Default Credentials can mark the synthetic user verified.
 */
export default defineConfig({
  testDir: "tests/e2e",
  testMatch: "**/live.spec.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 180_000,
  use: {
    baseURL: "http://127.0.0.1:5173",
    trace: "on-first-retry",
  },
  webServer: {
    command: "npm run dev -- --host 127.0.0.1 --port 5173",
    url: "http://127.0.0.1:5173",
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      VITE_USE_FIREBASE_EMULATORS: "false",
    },
  },
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } },
    },
  ],
});

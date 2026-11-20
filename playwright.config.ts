import { defineConfig, devices } from "@playwright/test";

const viewport = {
  desktop: { width: 1280, height: 800 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 390, height: 844 },
} as const;

export default defineConfig({
  testDir: "tests/e2e",
  testIgnore: ["**/live.spec.ts"],
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  timeout: 60_000,
  use: {
    baseURL: "http://127.0.0.1:5173",
    trace: "on-first-retry",
  },
  webServer: {
    command: "npm run dev -- --host 127.0.0.1 --port 5173",
    url: "http://127.0.0.1:5173",
    reuseExistingServer: process.env.MAGEMAI_E2E_REUSE === "1",
    timeout: 120_000,
    env: {
      VITE_USE_FIREBASE_EMULATORS: "true",
      VITE_FIREBASE_PROJECT_ID: "demo-magemai",
      VITE_FIREBASE_EMULATOR_HOST: "127.0.0.1",
      VITE_GOOGLE_AUTH_ENABLED: "true",
    },
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: viewport.desktop } },
    { name: "tablet", use: { ...devices["Desktop Chrome"], viewport: viewport.tablet } },
    {
      name: "mobile",
      use: {
        ...devices["Desktop Chrome"],
        viewport: viewport.mobile,
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
});

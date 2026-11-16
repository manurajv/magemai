import { describe, expect, it } from "vitest";

const hosts = [
  "FIREBASE_AUTH_EMULATOR_HOST",
  "FIRESTORE_EMULATOR_HOST",
  "FIREBASE_STORAGE_EMULATOR_HOST",
] as const;

describe("rules harness", () => {
  it("runs only against local emulators", () => {
    for (const name of hosts) {
      const value = process.env[name] ?? "";
      expect(value.startsWith("127.0.0.1") || value.startsWith("localhost"), name).toBe(true);
    }
    expect(process.env.GCLOUD_PROJECT ?? process.env.GOOGLE_CLOUD_PROJECT).not.toBe("magemai");
    expect(process.env.VITE_ALLOW_LIVE_FIREBASE).not.toBe("true");
  });
});

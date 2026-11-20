import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FUNCTIONS_REGION } from "@shared/firebase/region";
import { createFirebase, getFirebase } from "@/lib/firebase/client";
import { type FirebaseClientEnv } from "@/lib/firebase/env";

const calls = vi.hoisted(() => ({
  apps: [] as object[],
  connectAuth: [] as string[],
  connectFirestore: 0,
  connectStorage: 0,
  connectFunctions: 0,
  functionsRegion: "",
}));

vi.mock("firebase/app", () => ({
  getApps: () => calls.apps,
  initializeApp: () => {
    const app = { name: "[DEFAULT]" };
    calls.apps.push(app);
    return app;
  },
  getApp: () => {
    const app = calls.apps[0];
    if (!app) throw new Error("Missing app");
    return app;
  },
}));

vi.mock("firebase/auth", () => ({
  getAuth: () => ({ kind: "auth" }),
  connectAuthEmulator: (_auth: unknown, url: string) => {
    calls.connectAuth.push(url);
  },
}));

vi.mock("firebase/firestore", () => ({
  getFirestore: () => ({ kind: "db" }),
  connectFirestoreEmulator: () => {
    calls.connectFirestore += 1;
  },
}));

vi.mock("firebase/storage", () => ({
  getStorage: () => ({ kind: "storage" }),
  connectStorageEmulator: () => {
    calls.connectStorage += 1;
  },
}));

vi.mock("firebase/functions", () => ({
  getFunctions: (_app: unknown, region: string) => {
    calls.functionsRegion = region;
    return { kind: "functions" };
  },
  connectFunctionsEmulator: () => {
    calls.connectFunctions += 1;
  },
}));

function resetFlags() {
  calls.apps.length = 0;
  calls.connectAuth.length = 0;
  calls.connectFirestore = 0;
  calls.connectStorage = 0;
  calls.connectFunctions = 0;
  calls.functionsRegion = "";
  globalThis.__magemaiEmulatorsConnected = undefined;
}

const liveEnv: FirebaseClientEnv = {
  dev: true,
  prod: false,
  projectId: "magemai",
  apiKey: "public-key",
  authDomain: "example.firebaseapp.com",
  storageBucket: "example.appspot.com",
  messagingSenderId: "000",
  appId: "1:000:web:demo",
};

describe("createFirebase", () => {
  beforeEach(() => {
    resetFlags();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("connects each emulator once and reuses the app", () => {
    getFirebase();
    getFirebase();
    expect(calls.connectAuth).toEqual(["http://127.0.0.1:9099"]);
    expect(calls.connectFirestore).toBe(1);
    expect(calls.connectStorage).toBe(1);
    expect(calls.connectFunctions).toBe(1);
    expect(calls.apps).toHaveLength(1);
    expect(calls.functionsRegion).toBe("asia-south1");
    expect(calls.functionsRegion).toBe(FUNCTIONS_REGION);
  });

  it("does not connect again when the HMR flag is already set", () => {
    globalThis.__magemaiEmulatorsConnected = true;
    getFirebase();
    expect(calls.connectAuth).toHaveLength(0);
    expect(calls.apps).toHaveLength(1);
  });

  it("throws in production before initializing when emulators are requested", () => {
    expect(() =>
      createFirebase({
        dev: false,
        prod: true,
        useEmulators: "true",
        projectId: "demo-magemai",
      }),
    ).toThrow(/localhost/);
    expect(calls.apps).toHaveLength(0);
    expect(calls.connectAuth).toHaveLength(0);
  });

  it("does not connect emulators for live access", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    createFirebase(liveEnv);
    createFirebase(liveEnv);
    expect(calls.connectAuth).toHaveLength(0);
    expect(warn).not.toHaveBeenCalled();
  });
});

import { describe, expect, it } from "vitest";
import {
  DEMO_PROJECT_ID,
  LIVE_PROJECT_ID,
  assertProductionBuildHasNoEmulators,
  firebaseWebConfig,
  resolveFirebaseAccess,
  type FirebaseClientEnv,
} from "@/lib/firebase/env";

function env(overrides: Partial<FirebaseClientEnv> = {}): FirebaseClientEnv {
  return {
    dev: true,
    prod: false,
    ...overrides,
  };
}

const liveKeys = {
  apiKey: "public-key",
  authDomain: "example.firebaseapp.com",
  storageBucket: "example.appspot.com",
  messagingSenderId: "000",
  appId: "1:000:web:demo",
};

describe("resolveFirebaseAccess", () => {
  it("uses live Firebase when the emulator flag is unset", () => {
    expect(resolveFirebaseAccess(env())).toMatchObject({
      mode: "live",
      projectId: LIVE_PROJECT_ID,
    });
  });

  it("uses live Firebase in production when the emulator flag is unset", () => {
    expect(resolveFirebaseAccess(env({ dev: false, prod: true }))).toMatchObject({
      mode: "live",
      projectId: LIVE_PROJECT_ID,
    });
  });

  it("uses the emulator only when the flag is exactly true", () => {
    const access = resolveFirebaseAccess(env({ useEmulators: "true" }));
    expect(access).toMatchObject({
      mode: "emulator",
      projectId: DEMO_PROJECT_ID,
      emulatorHost: "127.0.0.1",
    });
    expect(resolveFirebaseAccess(env({ useEmulators: "false" })).mode).toBe("live");
  });

  it("refuses to point emulators at project magemai", () => {
    expect(() =>
      resolveFirebaseAccess(env({ useEmulators: "true", projectId: LIVE_PROJECT_ID })),
    ).toThrow(/magemai/);
  });

  it("refuses an emulator host other than loopback", () => {
    expect(() =>
      resolveFirebaseAccess(env({ useEmulators: "true", emulatorHost: "localhost" })),
    ).toThrow(/127\.0\.0\.1/);
    expect(() =>
      resolveFirebaseAccess(env({ useEmulators: "true", emulatorHost: "10.0.0.8" })),
    ).toThrow(/127\.0\.0\.1/);
  });

  it("throws in production when the emulator flag is set", () => {
    expect(() =>
      resolveFirebaseAccess(
        env({ dev: false, prod: true, useEmulators: "true", projectId: DEMO_PROJECT_ID }),
      ),
    ).toThrow(/localhost/);
  });

  it("refuses a production build aimed at the emulator project", () => {
    expect(() =>
      resolveFirebaseAccess(env({ dev: false, prod: true, projectId: DEMO_PROJECT_ID })),
    ).toThrow(/demo-magemai/);
  });
});

describe("assertProductionBuildHasNoEmulators", () => {
  it("throws for a production build with the emulator flag", () => {
    expect(() => assertProductionBuildHasNoEmulators("production", "true")).toThrow(/localhost/);
  });

  it("allows a production build with the flag off or unset", () => {
    expect(() => assertProductionBuildHasNoEmulators("production", "false")).not.toThrow();
    expect(() => assertProductionBuildHasNoEmulators("production", undefined)).not.toThrow();
    expect(() => assertProductionBuildHasNoEmulators("development", "true")).not.toThrow();
  });
});

describe("firebaseWebConfig", () => {
  it("fills emulator placeholders and forces the demo project id", () => {
    const access = resolveFirebaseAccess(env({ useEmulators: "true" }));
    const config = firebaseWebConfig(env({ useEmulators: "true" }), access);
    expect(config.projectId).toBe(DEMO_PROJECT_ID);
    expect(config.storageBucket).toBe("demo-magemai.appspot.com");
  });

  it("requires the public web config for live access", () => {
    const access = resolveFirebaseAccess(env());
    expect(() => firebaseWebConfig(env(), access)).toThrow(/VITE_FIREBASE_API_KEY/);
    expect(
      firebaseWebConfig(env({ projectId: LIVE_PROJECT_ID, ...liveKeys }), access).projectId,
    ).toBe(LIVE_PROJECT_ID);
  });
});

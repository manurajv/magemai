import { describe, expect, it } from "vitest";
import {
  DEMO_PROJECT_ID,
  LIVE_FIREBASE_BANNER,
  LIVE_FLAG_IGNORED_WARNING,
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

describe("resolveFirebaseAccess", () => {
  it("uses emulators in development when the flags are unset", () => {
    const access = resolveFirebaseAccess(env());
    expect(access.mode).toBe("emulator");
    if (access.mode !== "emulator") return;
    expect(access.projectId).toBe(DEMO_PROJECT_ID);
    expect(access.emulatorHost).toBe("127.0.0.1");
  });

  it("keeps emulators on when the live flag is also true and warns once in the result", () => {
    const access = resolveFirebaseAccess(
      env({ useEmulators: "true", allowLive: "true", projectId: DEMO_PROJECT_ID }),
    );
    expect(access.mode).toBe("emulator");
    expect(access.warnings).toEqual([LIVE_FLAG_IGNORED_WARNING]);
  });

  it("throws when development turns emulators off without the live opt-in", () => {
    expect(() => resolveFirebaseAccess(env({ useEmulators: "false" }))).toThrow(
      /not explicitly allowed/i,
    );
  });

  it("allows live development only for project magemai when both flags are set", () => {
    const access = resolveFirebaseAccess(
      env({ useEmulators: "false", allowLive: "true", projectId: LIVE_PROJECT_ID }),
    );
    expect(access).toMatchObject({ mode: "live", projectId: LIVE_PROJECT_ID });
  });

  it("refuses live development for any other project id", () => {
    expect(() =>
      resolveFirebaseAccess(
        env({ useEmulators: "false", allowLive: "true", projectId: DEMO_PROJECT_ID }),
      ),
    ).toThrow(/magemai/);
  });

  it("refuses to point emulators at project magemai", () => {
    expect(() =>
      resolveFirebaseAccess(env({ useEmulators: "true", projectId: LIVE_PROJECT_ID })),
    ).toThrow(/magemai/);
  });

  it("refuses an emulator host other than loopback", () => {
    expect(() => resolveFirebaseAccess(env({ emulatorHost: "localhost" }))).toThrow(/127\.0\.0\.1/);
    expect(() => resolveFirebaseAccess(env({ emulatorHost: "10.0.0.8" }))).toThrow(/127\.0\.0\.1/);
  });

  it("throws in production when the emulator flag is set", () => {
    expect(() =>
      resolveFirebaseAccess(
        env({ dev: false, prod: true, useEmulators: "true", projectId: DEMO_PROJECT_ID }),
      ),
    ).toThrow(/localhost/);
  });

  it("uses live Firebase for a production build when emulators are off", () => {
    const access = resolveFirebaseAccess(
      env({ dev: false, prod: true, useEmulators: "false", projectId: LIVE_PROJECT_ID }),
    );
    expect(access.mode).toBe("live");
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
    const access = resolveFirebaseAccess(env());
    expect(firebaseWebConfig(env(), access).projectId).toBe(DEMO_PROJECT_ID);
  });

  it("requires the public web config for live access", () => {
    const access = resolveFirebaseAccess(
      env({ useEmulators: "false", allowLive: "true", projectId: LIVE_PROJECT_ID }),
    );
    expect(() =>
      firebaseWebConfig(env({ useEmulators: "false", allowLive: "true" }), access),
    ).toThrow(/VITE_FIREBASE_API_KEY/);
  });
});

describe("live banner copy", () => {
  it("matches the required sentence", () => {
    expect(LIVE_FIREBASE_BANNER).toBe(
      "LIVE FIREBASE — project magemai. This is not the emulator. Writes affect the real project.",
    );
  });
});

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  DEMO_PROJECT_ID,
  assertDemoProject,
  assertEmulatorHosts,
  assertLiveFirebaseNotAllowed,
  buildExecArgs,
  buildExportArgs,
  buildSeedArgs,
  buildStartArgs,
  deleteEmulatorData,
  envFileSetsFlag,
  stripLiveCredentials,
} from "./emulator-policy";

function projectArg(args: string[]): string {
  const index = args.indexOf("--project");
  return args[index + 1] ?? "";
}

describe("emulator command policy", () => {
  it("accepts only demo-magemai", () => {
    expect(() => assertDemoProject(DEMO_PROJECT_ID)).not.toThrow();
    expect(() => assertDemoProject("magemai")).toThrow(/magemai/);
    expect(() => assertDemoProject("")).toThrow(/Refusing project id/);
  });

  it("refuses the live opt-in", () => {
    expect(() => assertLiveFirebaseNotAllowed("true")).toThrow(/VITE_ALLOW_LIVE_FIREBASE/);
    expect(() => assertLiveFirebaseNotAllowed("false")).not.toThrow();
    expect(() => assertLiveFirebaseNotAllowed(undefined)).not.toThrow();
  });

  it("reads a live opt-in from env file text", () => {
    expect(
      envFileSetsFlag("VITE_ALLOW_LIVE_FIREBASE=true\n", "VITE_ALLOW_LIVE_FIREBASE", "true"),
    ).toBe(true);
    expect(envFileSetsFlag("VITE_ALLOW_LIVE_FIREBASE=\n", "VITE_ALLOW_LIVE_FIREBASE", "true")).toBe(
      false,
    );
    expect(
      envFileSetsFlag("# VITE_ALLOW_LIVE_FIREBASE=true\n", "VITE_ALLOW_LIVE_FIREBASE", "true"),
    ).toBe(false);
  });

  it("removes live credentials from the child environment", () => {
    const env = stripLiveCredentials({
      GOOGLE_APPLICATION_CREDENTIALS: "C:\\secrets\\key.json",
      GCLOUD_PROJECT: "magemai",
      PATH: "C:\\Windows",
    });
    expect(env.GOOGLE_APPLICATION_CREDENTIALS).toBeUndefined();
    expect(env.GCLOUD_PROJECT).toBeUndefined();
    expect(env.PATH).toBe("C:\\Windows");
  });

  it("requires local emulator hosts before tests", () => {
    expect(() =>
      assertEmulatorHosts({
        FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:9099",
        FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080",
        FIREBASE_STORAGE_EMULATOR_HOST: "localhost:9199",
        GCLOUD_PROJECT: DEMO_PROJECT_ID,
      }),
    ).not.toThrow();
    expect(() =>
      assertEmulatorHosts({
        FIREBASE_AUTH_EMULATOR_HOST: "example.com:9099",
        FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080",
        FIREBASE_STORAGE_EMULATOR_HOST: "127.0.0.1:9199",
      }),
    ).toThrow(/FIREBASE_AUTH_EMULATOR_HOST/);
    expect(() =>
      assertEmulatorHosts({
        FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:9099",
        FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080",
        FIREBASE_STORAGE_EMULATOR_HOST: "127.0.0.1:9199",
        GCLOUD_PROJECT: "magemai",
      }),
    ).toThrow(/magemai/);
  });

  it("hardcodes demo-magemai on start, export, seed, and exec", () => {
    const start = buildStartArgs(false);
    expect(start).not.toContain("--import");
    expect(start).toContain("--export-on-exit");
    expect(projectArg(start)).toBe(DEMO_PROJECT_ID);

    const importing = buildStartArgs(true);
    expect(importing).toContain("--import");
    expect(projectArg(importing)).toBe(DEMO_PROJECT_ID);
    expect(projectArg(buildExportArgs())).toBe(DEMO_PROJECT_ID);
    expect(projectArg(buildSeedArgs())).toBe(DEMO_PROJECT_ID);
    expect(buildSeedArgs().at(-1)).toBe("node scripts/seed-emulators.mjs");
    expect(projectArg(buildExecArgs("npm test"))).toBe(DEMO_PROJECT_ID);
    expect(buildExecArgs("npm test")).toContain("--only");
    expect(buildExecArgs("npm test").join(" ")).not.toContain("--project magemai");
  });

  it("deletes only a directory whose final segment is emulator-data", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "magemai-"));
    const keep = path.join(root, "other");
    const target = path.join(root, "emulator-data");
    fs.mkdirSync(keep);
    fs.writeFileSync(path.join(keep, "note.txt"), "keep");
    fs.mkdirSync(target);
    fs.writeFileSync(path.join(target, "note.txt"), "gone");
    expect(() => deleteEmulatorData(keep)).toThrow(/emulator-data/);
    expect(fs.existsSync(keep)).toBe(true);
    deleteEmulatorData(target);
    expect(fs.existsSync(target)).toBe(false);
    fs.rmSync(root, { recursive: true, force: true });
  });
});

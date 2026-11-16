import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function read(relative: string): string {
  return readFileSync(path.join(root, relative), "utf8");
}

describe("toolchain contract", () => {
  it("accepts Node 24 and newer without engine-strict, and recommends 24", () => {
    const pkg = JSON.parse(read("package.json")) as {
      engines: { node: string };
      scripts: Record<string, string>;
    };
    expect(pkg.engines.node).toBe(">=24");
    expect(read(".npmrc")).toContain("engine-strict=false");
    expect(read(".nvmrc").trim()).toBe("24");
    expect(pkg.scripts.deploy).toBeUndefined();
    expect(pkg.scripts["emulators:start"]).toBe("node scripts/emulators.mjs start");
    expect(pkg.scripts["test:e2e"]).toBe("node scripts/emulators.mjs exec -- playwright test");
    expect(Number(process.versions.node.split(".")[0])).toBeGreaterThanOrEqual(24);
  });

  it("keeps Cloud Functions on the nodejs24 runtime", () => {
    const functionsPkg = JSON.parse(read("functions/package.json")) as {
      engines: { node: string };
    };
    expect(functionsPkg.engines.node).toBe("24");
    const firebase = JSON.parse(read("firebase.json")) as {
      functions: Array<{ runtime: string }>;
      emulators: { singleProjectMode: boolean; ui: { enabled: boolean; port: number } };
    };
    expect(firebase.functions[0]?.runtime).toBe("nodejs24");
    expect(firebase.emulators.singleProjectMode).toBe(true);
    expect(firebase.emulators.ui.enabled).toBe(true);
    expect(firebase.emulators.ui.port).toBe(4000);
    const rc = JSON.parse(read(".firebaserc")) as { projects: Record<string, string> };
    expect(rc.projects.default).toBe("demo-magemai");
    expect(rc.projects.live).toBe("magemai");
    expect(Object.keys(rc.projects).sort()).toEqual(["default", "live"]);
    expect(rc.projects.dev).toBeUndefined();
    expect(rc.projects.staging).toBeUndefined();
    expect(rc.projects.prod).toBeUndefined();
  });

  it("denies every Firestore and Storage access in the step 4 rules", () => {
    expect(read("firestore.rules")).toContain("allow read, write: if false");
    expect(read("storage.rules")).toContain("allow read, write: if false");
    expect(read("firestore.rules")).not.toContain("if true");
    expect(read("storage.rules")).not.toContain("if true");
  });

  it("keeps the synthetic seed off the pilot business and off live project ids", () => {
    const seed = read("scripts/seed-emulators.mjs");
    expect(seed).toContain("owner.a@example.test");
    expect(seed).toContain("Test Studio A");
    expect(seed).toContain("Test Studio B");
    expect(seed).toContain("platform.admin@example.test");
    expect(seed).toContain("Refusing to seed the pilot business.");
    const names = [...seed.matchAll(/name: "([^"]+)"/g)].map((match) => match[1] ?? "");
    expect(names.join(" ").toLowerCase()).not.toContain("beyond gravity");
    expect(read("shared/platform/defaults.ts").toLowerCase()).not.toContain("beyond gravity");
  });
});

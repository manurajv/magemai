import { spawnSync } from "node:child_process";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(import.meta.dirname, "..");

describe("admin app initialization", () => {
  it("creates the default app when a handler is loaded the way the callable loads it", () => {
    const compiled = spawnSync(
      process.execPath,
      ["node_modules/typescript/bin/tsc", "-p", "functions/tsconfig.json"],
      { cwd: root, encoding: "utf8" },
    );
    expect(compiled.status, compiled.stdout + compiled.stderr).toBe(0);

    const probe = `
      const { pathToFileURL } = require("node:url");
      const path = require("node:path");
      (async () => {
        const file = path.resolve("lib/functions/src/business.js");
        const handlers = await import(pathToFileURL(file).href);
        if (typeof handlers.checkSlugAvailability !== "function") {
          throw new Error("checkSlugAvailability was not exported");
        }
        const { getApps } = require("firebase-admin/app");
        const { getAuth } = require("firebase-admin/auth");
        if (getApps().length === 0) throw new Error("default app missing");
        getAuth();
        console.log("ready");
      })().catch((error) => {
        console.error(error);
        process.exit(1);
      });
    `;
    const env = { ...process.env };
    delete env.FIREBASE_AUTH_EMULATOR_HOST;
    delete env.FIRESTORE_EMULATOR_HOST;
    delete env.FIREBASE_STORAGE_EMULATOR_HOST;
    env.GCLOUD_PROJECT = "demo-magemai";
    env.GOOGLE_CLOUD_PROJECT = "demo-magemai";
    const result = spawnSync(process.execPath, ["-e", probe], {
      cwd: path.join(root, "functions"),
      encoding: "utf8",
      env,
    });
    expect(result.status, result.stdout + result.stderr).toBe(0);
    expect(result.stdout).toContain("ready");
  });
});

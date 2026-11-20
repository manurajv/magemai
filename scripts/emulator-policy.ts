import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const DEMO_PROJECT_ID = "demo-magemai";
export const FORBIDDEN_PROJECT_ID = "magemai";

export const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const EMULATOR_HOST_VARS = [
  "FIREBASE_AUTH_EMULATOR_HOST",
  "FIRESTORE_EMULATOR_HOST",
  "FIREBASE_STORAGE_EMULATOR_HOST",
] as const;

export function assertDemoProject(projectId: string): void {
  if (projectId !== DEMO_PROJECT_ID) {
    throw new Error(
      `Refusing project id "${projectId}". Emulator commands only run as ${DEMO_PROJECT_ID}.`,
    );
  }
}

export function envFileSetsFlag(contents: string, name: string, expected: string): boolean {
  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (key === name && value === expected) return true;
  }
  return false;
}

export function stripLiveCredentials(env: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const next: NodeJS.ProcessEnv = { ...env };
  delete next.GOOGLE_APPLICATION_CREDENTIALS;
  if (next.GOOGLE_APPLICATION_CREDENTIALS) {
    throw new Error("GOOGLE_APPLICATION_CREDENTIALS is still set in the emulator environment.");
  }
  if (next.GCLOUD_PROJECT === FORBIDDEN_PROJECT_ID) delete next.GCLOUD_PROJECT;
  if (next.GOOGLE_CLOUD_PROJECT === FORBIDDEN_PROJECT_ID) delete next.GOOGLE_CLOUD_PROJECT;
  if (next.FIREBASE_PROJECT === FORBIDDEN_PROJECT_ID) delete next.FIREBASE_PROJECT;
  return next;
}

export function assertEmulatorHosts(env: NodeJS.ProcessEnv): void {
  for (const name of EMULATOR_HOST_VARS) {
    const value = env[name] ?? "";
    const allowed = value.startsWith("127.0.0.1") || value.startsWith("localhost");
    if (!allowed) {
      throw new Error(
        `${name} must start with 127.0.0.1 or localhost before tests run. Received "${value}".`,
      );
    }
  }
  const projectId = env.GCLOUD_PROJECT ?? env.GOOGLE_CLOUD_PROJECT ?? "";
  if (projectId && projectId !== DEMO_PROJECT_ID) {
    throw new Error(
      `Emulator tests only run as ${DEMO_PROJECT_ID}. Received project id "${projectId}".`,
    );
  }
}

export function emulatorMetadataExists(root = repoRoot): boolean {
  return fs.existsSync(path.join(root, "emulator-data", "firebase-export-metadata.json"));
}

export function buildStartArgs(hasMetadata: boolean): string[] {
  const args = ["emulators:start", "--project", DEMO_PROJECT_ID];
  if (hasMetadata) args.push("--import", "./emulator-data");
  args.push("--export-on-exit", "./emulator-data");
  return args;
}

export function buildExportArgs(): string[] {
  return ["emulators:export", "./emulator-data", "--project", DEMO_PROJECT_ID, "--force"];
}

export function buildSeedArgs(): string[] {
  return [
    "emulators:exec",
    "--project",
    DEMO_PROJECT_ID,
    "--only",
    "auth,firestore",
    "node scripts/seed-emulators.mjs",
  ];
}

export function buildExecArgs(innerCommand: string): string[] {
  return [
    "emulators:exec",
    "--project",
    DEMO_PROJECT_ID,
    "--only",
    "auth,firestore,functions,storage",
    innerCommand,
  ];
}

export function deleteEmulatorData(resolvedPath: string): void {
  const realPath = fs.existsSync(resolvedPath) ? fs.realpathSync(resolvedPath) : resolvedPath;
  if (
    path.basename(resolvedPath) !== "emulator-data" ||
    path.basename(realPath) !== "emulator-data"
  ) {
    throw new Error("Refusing to delete a path whose final segment is not emulator-data.");
  }
  fs.rmSync(resolvedPath, { recursive: true, force: true });
}

export function repoEmulatorDataDir(root = repoRoot): string {
  return path.resolve(root, "emulator-data");
}

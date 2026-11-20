import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);

/**
 * Firebase's function discovery times out after 10s. On Windows that load
 * often exceeds 10s ("Cannot determine backend specification"). 60s is enough
 * without hiding a real hang. A higher value already in the environment is kept.
 */
export function withDiscoveryTimeout(env: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const next = { ...env };
  const current = Number(next.FUNCTIONS_DISCOVERY_TIMEOUT ?? "");
  if (!Number.isFinite(current) || current < 60) {
    next.FUNCTIONS_DISCOVERY_TIMEOUT = "60";
  }
  return next;
}

function firebaseCli(): string {
  try {
    return require.resolve("firebase-tools/lib/bin/firebase.js");
  } catch {
    console.error("firebase-tools is not installed. Run npm install from the repository root.");
    process.exit(1);
  }
}

const invokedDirectly =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;

if (invokedDirectly) {
  const child = spawn(
    process.execPath,
    [firebaseCli(), "deploy", "--only", "functions", "--project", "magemai"],
    { stdio: "inherit", env: withDiscoveryTimeout(process.env) },
  );

  child.on("exit", (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }
    process.exit(code ?? 1);
  });
}

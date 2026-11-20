import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  DEMO_PROJECT_ID,
  assertDemoProject,
  assertEmulatorHosts,
  buildExecArgs,
  buildExportArgs,
  buildSeedArgs,
  buildStartArgs,
  deleteEmulatorData,
  emulatorMetadataExists,
  repoEmulatorDataDir,
  repoRoot,
  stripLiveCredentials,
} from "./emulator-policy.ts";

function firebaseCommand() {
  const binName = process.platform === "win32" ? "firebase.cmd" : "firebase";
  const local = path.join(repoRoot, "node_modules", ".bin", binName);
  if (fs.existsSync(local)) return local;
  return binName;
}

function fail(error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}

function guardProject(args) {
  assertDemoProject(DEMO_PROJECT_ID);
  const flag = args.indexOf("--project");
  const projectId = flag === -1 ? "" : args[flag + 1];
  assertDemoProject(projectId ?? "");
}

function childEnv() {
  const env = stripLiveCredentials(process.env);
  env.MAGEMAI_DEPLOY_BLOCKING_AUTH = "true";
  return env;
}

function runFirebase(args) {
  try {
    guardProject(args);
  } catch (error) {
    fail(error);
  }
  let env;
  try {
    env = childEnv();
  } catch (error) {
    fail(error);
  }
  const child = spawn(firebaseCommand(), args, {
    cwd: repoRoot,
    env,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  child.on("error", (error) => fail(error));
  child.on("exit", (code) => process.exit(code ?? 1));
}

function quoteArg(arg) {
  if (/^[A-Za-z0-9_./:@=+-]+$/.test(arg)) return arg;
  return `"${arg.replaceAll('"', "")}"`;
}

function resolveBin(command) {
  if (path.isAbsolute(command) || command.includes("/") || command.includes("\\")) return command;
  const extension = process.platform === "win32" ? ".cmd" : "";
  const local = path.join(repoRoot, "node_modules", ".bin", `${command}${extension}`);
  if (fs.existsSync(local)) return local;
  return command;
}

function runVerified(commandArgs) {
  try {
    assertEmulatorHosts(process.env);
  } catch (error) {
    fail(error);
  }
  if (commandArgs.length === 0) fail("Missing command after --.");
  const [command, ...rest] = commandArgs;
  const child = spawn(resolveBin(command), rest, {
    cwd: repoRoot,
    env: process.env,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  child.on("error", (error) => fail(error));
  child.on("exit", (code) => process.exit(code ?? 1));
}

function buildFunctions() {
  const tsc = path.join(repoRoot, "node_modules", "typescript", "bin", "tsc");
  const result = spawnSync(process.execPath, [tsc, "-p", "functions/tsconfig.json"], {
    cwd: repoRoot,
    stdio: "inherit",
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function main() {
  const subcommand = process.argv[2];
  if (subcommand === "start" || subcommand === "seed" || subcommand === "exec") {
    buildFunctions();
  }
  if (subcommand === "start") {
    runFirebase(buildStartArgs(emulatorMetadataExists()));
    return;
  }
  if (subcommand === "export") {
    runFirebase(buildExportArgs());
    return;
  }
  if (subcommand === "reset") {
    try {
      deleteEmulatorData(repoEmulatorDataDir());
    } catch (error) {
      fail(error);
    }
    console.log("Removed local emulator-data.");
    return;
  }
  if (subcommand === "seed") {
    runFirebase(buildSeedArgs());
    return;
  }
  if (subcommand === "exec") {
    const separator = process.argv.indexOf("--");
    const userArgs = separator === -1 ? [] : process.argv.slice(separator + 1);
    if (userArgs.length === 0) fail("Pass the test command after --.");
    const inner = ["node", "scripts/emulators.mjs", "verify-hosts", "--", ...userArgs].map(
      quoteArg,
    );
    runFirebase(buildExecArgs(inner.join(" ")));
    return;
  }
  if (subcommand === "verify-hosts") {
    const separator = process.argv.indexOf("--");
    const userArgs = separator === -1 ? [] : process.argv.slice(separator + 1);
    runVerified(userArgs);
    return;
  }
  fail("Usage: node scripts/emulators.mjs <start|export|reset|seed|exec|verify-hosts>");
}

const entry = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (entry === fileURLToPath(import.meta.url)) main();

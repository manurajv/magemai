import { readFileSync } from "node:fs";
import path from "node:path";
import readline from "node:readline/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import { stdin, stdout } from "node:process";
import {
  confirmationMatches,
  createAdminStore,
  credentialsAreOutsideRepo,
  EMULATOR_PROJECT_ID,
  EMULATOR_PROJECT_NUMBER,
  ensureAdminApp,
  grantSuperAdmin,
  MAGEMAI_PROJECT_ID,
  MAGEMAI_PROJECT_NUMBER,
  ProvisionError,
  revokeSuperAdmin,
  serviceAccountEmail,
} from "./super-admin-provision.ts";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

type Args = {
  project: string;
  email: string;
  revoke: boolean;
  reason: string;
};

function readArgs(argv: string[]): Args {
  const args: Args = { project: "", email: "", revoke: false, reason: "" };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--") continue;
    if (token === "--project") args.project = argv[(index += 1)] ?? "";
    else if (token === "--email") args.email = argv[(index += 1)] ?? "";
    else if (token === "--reason") args.reason = argv[(index += 1)] ?? "";
    else if (token === "--revoke") args.revoke = true;
    else throw new ProvisionError(`Unknown argument ${token ?? ""}.`, "none");
  }
  return args;
}

async function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({ input: stdin, output: stdout });
  try {
    return (await rl.question(question)).trim();
  } finally {
    rl.close();
  }
}

function emulatorMode(): boolean {
  const firestore = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
  const auth = Boolean(process.env.FIREBASE_AUTH_EMULATOR_HOST);
  if (firestore !== auth) {
    throw new ProvisionError(
      "Set both FIRESTORE_EMULATOR_HOST and FIREBASE_AUTH_EMULATOR_HOST, or neither.",
      "none",
    );
  }
  return firestore && auth;
}

export async function main(argv = process.argv.slice(2)): Promise<void> {
  const args = readArgs(argv);
  if (!args.project || !args.email || !args.email.includes("@")) {
    throw new ProvisionError("Pass --project and --email.", "none");
  }
  if (args.revoke && !args.reason.trim()) {
    throw new ProvisionError("Revoke requires --reason.", "none");
  }

  const emulator = emulatorMode();
  if (emulator && args.project !== EMULATOR_PROJECT_ID) {
    throw new ProvisionError("Emulator provisioning only runs as demo-magemai.", "none");
  }
  if (!emulator && args.project !== MAGEMAI_PROJECT_ID) {
    throw new ProvisionError("Live provisioning only runs as magemai.", "none");
  }

  let operatorEmail = "emulator-operator";
  if (!emulator) {
    const credentials = process.env.GOOGLE_APPLICATION_CREDENTIALS ?? "";
    if (!credentialsAreOutsideRepo(credentials, repoRoot)) {
      throw new ProvisionError(
        "Set GOOGLE_APPLICATION_CREDENTIALS to a service-account JSON file outside this repository.",
        "none",
      );
    }
    operatorEmail = serviceAccountEmail(readFileSync(credentials, "utf8"));
  }

  const projectNumber = emulator ? EMULATOR_PROJECT_NUMBER : MAGEMAI_PROJECT_NUMBER;
  stdout.write(`Project id: ${args.project}\n`);
  stdout.write(`Project number: ${projectNumber}\n`);
  stdout.write(`Email: ${args.email}\n`);
  const typedId = await prompt("Type the project id: ");
  const typedNumber = await prompt("Type the project number: ");
  if (!confirmationMatches(args.project, typedId, typedNumber)) {
    throw new ProvisionError("Confirmation did not match. Nothing was written.", "none");
  }

  ensureAdminApp(args.project, emulator);
  const store = createAdminStore();
  if (args.revoke) {
    const result = await revokeSuperAdmin(store, {
      email: args.email,
      operatorEmail,
      reason: args.reason,
    });
    stdout.write(
      result.outcome === "absent"
        ? "No Auth user exists for that email. Nothing else was changed.\n"
        : `Revoke finished (${result.outcome}). Last step: ${result.lastStep}.\n`,
    );
    return;
  }

  const result = await grantSuperAdmin(store, { email: args.email, operatorEmail });
  stdout.write(`Grant finished (${result.outcome}). Last step: ${result.lastStep}.\n`);
  if (result.createdPassword) {
    stdout.write("One-time password (shown once). The person should use Forgot password:\n");
    stdout.write(`${result.createdPassword}\n`);
  }
  stdout.write("The person must sign out and sign in so the ID token picks up the claim.\n");
}

const invokedDirectly =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;

if (invokedDirectly) {
  main().catch((error: unknown) => {
    if (error instanceof ProvisionError) {
      console.error(error.message);
      console.error(`Last successful step: ${error.lastStep}.`);
    } else {
      console.error(error instanceof Error ? error.message : error);
      console.error("Last successful step: none.");
    }
    process.exit(1);
  });
}

export const DEMO_PROJECT_ID = "demo-magemai";
export const LIVE_PROJECT_ID = "magemai";

export const EMULATOR_PORTS = {
  auth: 9099,
  firestore: 8080,
  storage: 9199,
  functions: 5001,
  hosting: 5000,
  ui: 4000,
} as const;

export type FirebaseMode = "emulator" | "live";

export type FirebaseClientEnv = {
  dev: boolean;
  prod: boolean;
  useEmulators?: string;
  projectId?: string;
  emulatorHost?: string;
  apiKey?: string;
  authDomain?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
};

export type FirebaseAccess =
  | {
      mode: "emulator";
      projectId: typeof DEMO_PROJECT_ID;
      emulatorHost: string;
      warnings: string[];
    }
  | { mode: "live"; projectId: string; warnings: string[] };

const LOOPBACK_HOST = "127.0.0.1";

const PRODUCTION_EMULATOR_ERROR =
  "Production cannot connect to localhost. VITE_USE_FIREBASE_EMULATORS must not be true for a production build.";

/**
 * Live is the default. The emulator is used only when
 * `VITE_USE_FIREBASE_EMULATORS` is exactly `"true"`.
 */
export function resolveFirebaseAccess(env: FirebaseClientEnv): FirebaseAccess {
  if (env.useEmulators === "true") {
    if (env.prod) throw new Error(PRODUCTION_EMULATOR_ERROR);
    const projectId = env.projectId ?? DEMO_PROJECT_ID;
    if (projectId !== DEMO_PROJECT_ID) {
      throw new Error(
        `Refusing to connect the emulators to project "${projectId}". Emulators only use ${DEMO_PROJECT_ID}.`,
      );
    }
    const host = env.emulatorHost ?? LOOPBACK_HOST;
    if (host !== LOOPBACK_HOST) {
      throw new Error(`The emulator host must be ${LOOPBACK_HOST}. Received "${host}".`);
    }
    return { mode: "emulator", projectId: DEMO_PROJECT_ID, emulatorHost: host, warnings: [] };
  }

  const projectId = env.projectId?.trim() || LIVE_PROJECT_ID;
  if (env.prod && projectId === DEMO_PROJECT_ID) {
    throw new Error(
      `A production build cannot use the emulator project ${DEMO_PROJECT_ID}. Set VITE_FIREBASE_PROJECT_ID to ${LIVE_PROJECT_ID}.`,
    );
  }
  return { mode: "live", projectId, warnings: [] };
}

export function assertProductionBuildHasNoEmulators(
  mode: string | undefined,
  useEmulators: string | undefined,
): void {
  if (mode === "production" && useEmulators === "true") {
    throw new Error(PRODUCTION_EMULATOR_ERROR);
  }
}

const LIVE_WEB_KEYS = [
  ["apiKey", "VITE_FIREBASE_API_KEY"],
  ["authDomain", "VITE_FIREBASE_AUTH_DOMAIN"],
  ["storageBucket", "VITE_FIREBASE_STORAGE_BUCKET"],
  ["messagingSenderId", "VITE_FIREBASE_MESSAGING_SENDER_ID"],
  ["appId", "VITE_FIREBASE_APP_ID"],
] as const;

export function firebaseWebConfig(env: FirebaseClientEnv, access: FirebaseAccess) {
  if (access.mode === "emulator") {
    return {
      apiKey: env.apiKey || "demo-api-key",
      authDomain: env.authDomain || "demo-magemai.firebaseapp.com",
      projectId: DEMO_PROJECT_ID,
      // The Storage emulator's bucket is always `{project}.appspot.com`.
      // The live bucket `magemai.firebasestorage.app` comes from `.env.local`.
      storageBucket: env.storageBucket || `${DEMO_PROJECT_ID}.appspot.com`,
      messagingSenderId: env.messagingSenderId || "demo-sender",
      appId: env.appId || "demo-app-id",
    };
  }

  const missing = LIVE_WEB_KEYS.filter(([key]) => !env[key]?.trim()).map(([, name]) => name);
  if (missing.length > 0) {
    throw new Error(
      `Live Firebase is missing ${missing.join(", ")}. Put them in .env.local. They are not committed.`,
    );
  }
  return {
    apiKey: env.apiKey ?? "",
    authDomain: env.authDomain ?? "",
    projectId: access.projectId,
    storageBucket: env.storageBucket ?? "",
    messagingSenderId: env.messagingSenderId ?? "",
    appId: env.appId ?? "",
  };
}

export function readClientEnv(): FirebaseClientEnv {
  return {
    dev: import.meta.env.DEV,
    prod: import.meta.env.PROD,
    useEmulators: import.meta.env.VITE_USE_FIREBASE_EMULATORS,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    emulatorHost: import.meta.env.VITE_FIREBASE_EMULATOR_HOST,
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  };
}

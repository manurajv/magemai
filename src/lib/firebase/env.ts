export const DEMO_PROJECT_ID = "demo-magemai";
export const LIVE_PROJECT_ID = "magemai";
export const DEFAULT_EMULATOR_HOST = "127.0.0.1";

export const LIVE_FIREBASE_BANNER =
  "LIVE FIREBASE — project magemai. This is not the emulator. Writes affect the real project.";

export const LIVE_FLAG_IGNORED_WARNING =
  "VITE_ALLOW_LIVE_FIREBASE was ignored because emulators are enabled.";

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
  useEmulators?: string | undefined;
  allowLive?: string | undefined;
  projectId?: string | undefined;
  emulatorHost?: string | undefined;
  apiKey?: string | undefined;
  authDomain?: string | undefined;
  storageBucket?: string | undefined;
  messagingSenderId?: string | undefined;
  appId?: string | undefined;
};

export type FirebaseAccess =
  | {
      mode: "emulator";
      projectId: typeof DEMO_PROJECT_ID;
      emulatorHost: string;
      warnings: string[];
    }
  | {
      mode: "live";
      projectId: string;
      warnings: string[];
    };

export type FirebaseWebConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
};

function present(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

/**
 * Production builds fail when the emulator flag is on.
 * Vite calls this while loading config, before a bundle is emitted.
 */
export function assertProductionBuildHasNoEmulators(
  mode: string,
  useEmulators: string | undefined,
): void {
  if (mode === "production" && present(useEmulators) === "true") {
    throw new Error(
      "Production cannot connect to localhost. VITE_USE_FIREBASE_EMULATORS must not be true for a production build.",
    );
  }
}

export function resolveFirebaseAccess(env: FirebaseClientEnv): FirebaseAccess {
  const useEmulators = present(env.useEmulators);
  const liveAllowed = present(env.allowLive) === "true";
  const warnings: string[] = [];

  if (env.prod && useEmulators === "true") {
    throw new Error(
      "Production cannot connect to localhost. VITE_USE_FIREBASE_EMULATORS must not be true.",
    );
  }

  const emulatorRequested =
    useEmulators === "true" || (env.dev && useEmulators !== "false" && !liveAllowed);

  if (emulatorRequested) {
    if (useEmulators === "true" && liveAllowed) {
      warnings.push(LIVE_FLAG_IGNORED_WARNING);
    }
    const projectId = present(env.projectId) ?? DEMO_PROJECT_ID;
    if (projectId === LIVE_PROJECT_ID) {
      throw new Error("Refusing to connect emulators with project id magemai. Use demo-magemai.");
    }
    if (projectId !== DEMO_PROJECT_ID) {
      throw new Error(
        `Emulators only allow project id ${DEMO_PROJECT_ID}. Received "${projectId}".`,
      );
    }
    const host = present(env.emulatorHost) ?? DEFAULT_EMULATOR_HOST;
    if (host !== DEFAULT_EMULATOR_HOST) {
      throw new Error(
        `Firebase emulator host must be ${DEFAULT_EMULATOR_HOST}. Received "${host}".`,
      );
    }
    return { mode: "emulator", projectId: DEMO_PROJECT_ID, emulatorHost: host, warnings };
  }

  if (env.prod) {
    const projectId = present(env.projectId);
    if (!projectId) {
      throw new Error("A production build requires VITE_FIREBASE_PROJECT_ID.");
    }
    if (projectId === DEMO_PROJECT_ID) {
      throw new Error("A production build cannot use project id demo-magemai.");
    }
    return { mode: "live", projectId, warnings };
  }

  if (!liveAllowed || useEmulators !== "false") {
    throw new Error(
      "Live Firebase was not explicitly allowed. Set VITE_USE_FIREBASE_EMULATORS=false and VITE_ALLOW_LIVE_FIREBASE=true.",
    );
  }

  const projectId = present(env.projectId);
  if (projectId !== LIVE_PROJECT_ID) {
    throw new Error("Live Firebase during development requires VITE_FIREBASE_PROJECT_ID=magemai.");
  }

  return { mode: "live", projectId, warnings };
}

export function firebaseWebConfig(
  env: FirebaseClientEnv,
  access: FirebaseAccess,
): FirebaseWebConfig {
  if (access.mode === "emulator") {
    return {
      apiKey: present(env.apiKey) ?? "demo-api-key",
      authDomain: present(env.authDomain) ?? `${DEMO_PROJECT_ID}.firebaseapp.com`,
      projectId: DEMO_PROJECT_ID,
      storageBucket: present(env.storageBucket) ?? `${DEMO_PROJECT_ID}.appspot.com`,
      messagingSenderId: present(env.messagingSenderId) ?? "000000000000",
      appId: present(env.appId) ?? "1:000000000000:web:demo",
    };
  }

  const fields: Array<[string, string | undefined]> = [
    ["VITE_FIREBASE_API_KEY", env.apiKey],
    ["VITE_FIREBASE_AUTH_DOMAIN", env.authDomain],
    ["VITE_FIREBASE_STORAGE_BUCKET", env.storageBucket],
    ["VITE_FIREBASE_MESSAGING_SENDER_ID", env.messagingSenderId],
    ["VITE_FIREBASE_APP_ID", env.appId],
  ];
  const missing = fields.filter(([, value]) => !present(value)).map(([name]) => name);
  if (missing.length > 0) {
    throw new Error(`Live Firebase is missing ${missing.join(", ")}.`);
  }

  return {
    apiKey: present(env.apiKey) ?? "",
    authDomain: present(env.authDomain) ?? "",
    projectId: access.projectId,
    storageBucket: present(env.storageBucket) ?? "",
    messagingSenderId: present(env.messagingSenderId) ?? "",
    appId: present(env.appId) ?? "",
  };
}

export function readClientEnv(): FirebaseClientEnv {
  return {
    dev: import.meta.env.DEV,
    prod: import.meta.env.PROD,
    useEmulators: import.meta.env.VITE_USE_FIREBASE_EMULATORS,
    allowLive: import.meta.env.VITE_ALLOW_LIVE_FIREBASE,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    emulatorHost: import.meta.env.VITE_FIREBASE_EMULATOR_HOST,
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  };
}

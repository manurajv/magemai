import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { connectAuthEmulator, getAuth, type Auth } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore, type Firestore } from "firebase/firestore";
import { connectFunctionsEmulator, getFunctions, type Functions } from "firebase/functions";
import { connectStorageEmulator, getStorage, type FirebaseStorage } from "firebase/storage";
import { FUNCTIONS_REGION } from "@shared/firebase/region";
import {
  EMULATOR_PORTS,
  firebaseWebConfig,
  readClientEnv,
  resolveFirebaseAccess,
  type FirebaseClientEnv,
  type FirebaseMode,
} from "@/lib/firebase/env";

export type FirebaseServices = {
  mode: FirebaseMode;
  projectId: string;
  emulatorHost: string | null;
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
  storage: FirebaseStorage;
  functions: Functions;
};

type EmulatorFlags = {
  __magemaiEmulatorsConnected?: boolean;
};

function flags(): EmulatorFlags {
  return globalThis as EmulatorFlags;
}

/**
 * The only Firebase initializer. Emulator connections are recorded on
 * `globalThis` so a Vite HMR reload does not call `connect*Emulator` twice.
 */
export function createFirebase(env: FirebaseClientEnv): FirebaseServices {
  const access = resolveFirebaseAccess(env);

  if (getApps().length === 0) {
    initializeApp(firebaseWebConfig(env, access));
  }

  const app = getApp();
  const auth = getAuth(app);
  const db = getFirestore(app);
  const storage = getStorage(app);
  const functions = getFunctions(app, FUNCTIONS_REGION);

  if (access.mode === "emulator" && flags().__magemaiEmulatorsConnected !== true) {
    const host = access.emulatorHost;
    connectAuthEmulator(auth, `http://${host}:${EMULATOR_PORTS.auth}`, { disableWarnings: true });
    connectFirestoreEmulator(db, host, EMULATOR_PORTS.firestore);
    connectStorageEmulator(storage, host, EMULATOR_PORTS.storage);
    connectFunctionsEmulator(functions, host, EMULATOR_PORTS.functions);
    flags().__magemaiEmulatorsConnected = true;
  }

  return {
    mode: access.mode,
    projectId: access.projectId,
    emulatorHost: access.mode === "emulator" ? access.emulatorHost : null,
    app,
    auth,
    db,
    storage,
    functions,
  };
}

export function getFirebase(): FirebaseServices {
  return createFirebase(readClientEnv());
}

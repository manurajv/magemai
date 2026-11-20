import { getApp, getApps, initializeApp, type App } from "firebase-admin/app";

/**
 * Cloud Functions load handler files with a dynamic import. A side-effect
 * import of this module can run against a different firebase-admin copy than
 * the getAuth() call in the handler, so the default app is missing and every
 * callable returns INTERNAL. Call this and pass the returned app into
 * getAuth, getFirestore, and getStorage.
 */
export function adminApp(): App {
  return getApps().length > 0 ? getApp() : initializeApp();
}

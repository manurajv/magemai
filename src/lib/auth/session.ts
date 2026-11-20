import type { User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { firebaseErrorCode } from "@/lib/auth/errors";
import { getFirebase } from "@/lib/firebase/client";

export const ACTIVE_BUSINESS_STORAGE_KEY = "magemai.activeBusinessId";

const profileWrites = new Map<string, Promise<void>>();
const RETRYABLE_SYNC_CODES = new Set([
  "functions/internal",
  "functions/unavailable",
  "functions/deadline-exceeded",
  "functions/aborted",
]);

export type ProfileSyncReason = "sign-in" | "app-load";

export function clearActiveBusinessHint(): void {
  localStorage.removeItem(ACTIVE_BUSINESS_STORAGE_KEY);
}

/**
 * A sign-in during this page load has a last-sign-in time at or after the
 * page started. A restored session is older than that, so app load syncs
 * only when the profile document is missing.
 */
export function profileSyncReason(
  lastSignInTime: string | null | undefined,
  pageStartedAt: number,
  now = Date.now(),
): ProfileSyncReason {
  const signedIn = Date.parse(lastSignInTime ?? "");
  if (Number.isFinite(signedIn) && signedIn >= pageStartedAt - 2_000 && signedIn <= now + 2_000) {
    return "sign-in";
  }
  return "app-load";
}

export function shouldSyncProfile(reason: ProfileSyncReason, profileExists: boolean): boolean {
  return reason === "sign-in" || !profileExists;
}

export function isRetryableSyncError(error: unknown): boolean {
  return RETRYABLE_SYNC_CODES.has(firebaseErrorCode(error));
}

export function bootstrapAuthUser(
  user: User,
  reason: ProfileSyncReason = "sign-in",
): Promise<void> {
  const previous = profileWrites.get(user.uid) ?? Promise.resolve();
  const run = previous.catch(() => undefined).then(() => syncProfile(user, reason));
  const tracked = run.finally(() => {
    if (profileWrites.get(user.uid) === tracked) profileWrites.delete(user.uid);
  });
  profileWrites.set(user.uid, tracked);
  return run;
}

async function syncProfile(user: User, reason: ProfileSyncReason): Promise<void> {
  const { db, functions } = getFirebase();
  if (reason === "app-load") {
    try {
      const existing = await getDoc(doc(db, "users", user.uid));
      if (!shouldSyncProfile(reason, existing.exists())) return;
    } catch {
      // A failed read still attempts the callable, which is the create path.
    }
  }
  const sync = httpsCallable(functions, "syncAuthProfile");
  try {
    await sync();
  } catch (error) {
    if (!isRetryableSyncError(error)) throw error;
    await sync();
  }
}

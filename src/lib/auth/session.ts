import type { User } from "firebase/auth";
import { doc, runTransaction, serverTimestamp } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { firebaseErrorCode } from "@/lib/auth/errors";
import { getFirebase } from "@/lib/firebase/client";

export const ACTIVE_BUSINESS_STORAGE_KEY = "magemai.activeBusinessId";

const profileWrites = new Map<string, Promise<void>>();

export function clearActiveBusinessHint(): void {
  localStorage.removeItem(ACTIVE_BUSINESS_STORAGE_KEY);
}

export function bootstrapAuthUser(user: User): Promise<void> {
  const previous = profileWrites.get(user.uid) ?? Promise.resolve();
  const run = previous.catch(() => undefined).then(() => persistAuthUser(user));
  const tracked = run.finally(() => {
    if (profileWrites.get(user.uid) === tracked) profileWrites.delete(user.uid);
  });
  profileWrites.set(user.uid, tracked);
  return run;
}

async function persistAuthUser(user: User): Promise<void> {
  const { db, functions } = getFirebase();
  const ref = doc(db, "users", user.uid);
  const displayName = user.displayName?.trim() ?? "";
  await runTransaction(db, async (transaction) => {
    const existing = await transaction.get(ref);
    if (!existing.exists()) {
      transaction.set(ref, {
        id: user.uid,
        email: user.email ?? "",
        emailVerified: user.emailVerified,
        displayName: displayName.length > 0 ? displayName : "Member",
        phoneNumber: null,
        photoPath: null,
        locale: "en",
        status: "active",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastLoginAt: null,
      });
      return;
    }
    const stored = existing.get("displayName");
    if (
      displayName.length > 0 &&
      (stored === "" || stored === "Member") &&
      stored !== displayName
    ) {
      transaction.update(ref, {
        displayName,
        updatedAt: serverTimestamp(),
      });
    }
  });
  const sync = httpsCallable(functions, "syncAuthProfile");
  try {
    await sync();
  } catch (error) {
    if (firebaseErrorCode(error) !== "functions/internal") throw error;
    await sync();
  }
}

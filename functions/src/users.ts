import "./admin.js";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { HttpsError, type CallableRequest } from "firebase-functions/v2/https";
import { AVATAR_MAX_BYTES, isAvatarContentType } from "../../shared/profile/limits.js";
import "./options.js";
import { defaultBucket, stripDownloadTokens as stripObjectTokens } from "./storage.js";

const AVATAR_PATH = (uid: string) => `users/${uid}/avatar`;

function authDisplayName(value: string | undefined): string {
  return value?.trim() ?? "";
}

function shouldFillDisplayName(stored: unknown, authName: string): boolean {
  return authName.length > 0 && (stored === "" || stored === "Member") && stored !== authName;
}

/**
 * Creates `users/{uid}` when it is missing and refreshes Auth-owned fields.
 * A 1st gen Auth trigger cannot run on the nodejs24 runtime, and
 * `beforeUserCreated` needs Identity Platform, so this callable is the only
 * profile-creation path. The client calls it after sign-up and sign-in, and
 * again on app load when the document is missing.
 */
export async function syncAuthProfile(request: CallableRequest) {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Sign in before syncing your profile.");
  }
  const record = await getAuth().getUser(request.auth.uid);
  if (record.disabled) {
    throw new HttpsError("permission-denied", "This account is disabled.");
  }
  const db = getFirestore();
  const ref = db.doc(`users/${record.uid}`);
  const authName = authDisplayName(record.displayName);
  await db.runTransaction(async (tx) => {
    const existing = await tx.get(ref);
    if (existing.exists && existing.get("status") === "disabled") {
      throw new HttpsError("permission-denied", "This account is disabled.");
    }
    const system = {
      id: record.uid,
      email: record.email ?? "",
      emailVerified: record.emailVerified,
      lastLoginAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };
    if (!existing.exists) {
      tx.set(ref, {
        ...system,
        displayName: authName,
        phoneNumber: null,
        photoPath: null,
        locale: "en",
        status: "active",
        createdAt: FieldValue.serverTimestamp(),
      });
      return;
    }
    const patch: {
      id: string;
      email: string;
      emailVerified: boolean;
      lastLoginAt: FieldValue;
      updatedAt: FieldValue;
      displayName?: string;
    } = { ...system };
    if (shouldFillDisplayName(existing.get("displayName"), authName)) {
      patch.displayName = authName;
    }
    tx.update(ref, patch);
  });
  return { ok: true };
}

export async function setUserAvatar(request: CallableRequest) {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Sign in before saving a profile photo.");
  }
  const uid = request.auth.uid;
  const record = await getAuth().getUser(uid);
  if (record.disabled) {
    throw new HttpsError("permission-denied", "This account is disabled.");
  }
  const path = AVATAR_PATH(uid);
  const bucket = defaultBucket();
  const file = bucket.file(path);
  const [exists] = await file.exists();
  if (!exists) {
    throw new HttpsError("not-found", "Upload a profile photo before saving it.");
  }
  const [metadata] = await file.getMetadata();
  const size = Number(metadata.size ?? 0);
  const contentType = metadata.contentType ?? "";
  if (
    !isAvatarContentType(contentType) ||
    !Number.isFinite(size) ||
    size <= 0 ||
    size > AVATAR_MAX_BYTES
  ) {
    throw new HttpsError("invalid-argument", "Choose a JPEG, PNG, or WebP image up to 2 MB.");
  }
  await stripObjectTokens(bucket.name, path);
  const db = getFirestore();
  const userRef = db.doc(`users/${uid}`);
  const userSnap = await userRef.get();
  if (!userSnap.exists) {
    throw new HttpsError("failed-precondition", "Create your profile before saving a photo.");
  }
  if (userSnap.get("status") === "disabled") {
    throw new HttpsError("permission-denied", "This account is disabled.");
  }
  const audit = db.collection("auditLogs").doc();
  const batch = db.batch();
  batch.update(userRef, {
    photoPath: path,
    updatedAt: FieldValue.serverTimestamp(),
  });
  batch.set(audit, {
    id: audit.id,
    scope: "platform",
    businessId: null,
    actorId: uid,
    actorType: "user",
    action: "user.avatar.update",
    targetType: "user",
    targetId: uid,
    summary: "Linked the profile photo.",
    metadata: {},
    createdAt: FieldValue.serverTimestamp(),
  });
  await batch.commit();
  return { photoPath: path };
}

/**
 * Called from the us-east1 storage trigger. The bucket name is left to the
 * trigger so the emulator listens to `<project>.appspot.com` and live listens
 * to the default bucket from `FIREBASE_CONFIG`.
 */
export async function stripFinalizedDownloadTokens(event: {
  data?: { name?: string; bucket?: string };
}): Promise<void> {
  const name = event.data?.name;
  const bucketName = event.data?.bucket;
  if (!name || !bucketName) return;
  await stripObjectTokens(bucketName, name);
}

import { region } from "firebase-functions/v1";
import { FUNCTIONS_REGION } from "../../shared/firebase/region.js";
import "./admin.js";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { onObjectFinalized } from "firebase-functions/v2/storage";
import { AVATAR_MAX_BYTES, isAvatarContentType } from "../../shared/profile/limits.js";
import "./options.js";
import { defaultBucket, stripDownloadTokens as stripObjectTokens } from "./storage.js";

const AVATAR_PATH = (uid: string) => `users/${uid}/avatar`;

export const onAuthUserCreated = region(FUNCTIONS_REGION)
  .auth.user()
  .onCreate(async (record) => {
    const ref = getFirestore().doc(`users/${record.uid}`);
    const existing = await ref.get();
    const system = {
      id: record.uid,
      email: record.email ?? "",
      emailVerified: record.emailVerified,
      status: "active" as const,
      updatedAt: FieldValue.serverTimestamp(),
    };
    if (existing.exists) {
      await ref.update(system);
      return;
    }
    await ref.set({
      ...system,
      displayName: record.displayName?.trim() ?? "",
      phoneNumber: null,
      photoPath: null,
      locale: "en",
      createdAt: FieldValue.serverTimestamp(),
      lastLoginAt: null,
    });
  });

export const syncAuthProfile = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Sign in before syncing your profile.");
  }
  const record = await getAuth().getUser(request.auth.uid);
  if (record.disabled) {
    throw new HttpsError("permission-denied", "This account is disabled.");
  }
  const ref = getFirestore().doc(`users/${record.uid}`);
  const existing = await ref.get();
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
    await ref.set({
      ...system,
      displayName: record.displayName?.trim() ?? "",
      phoneNumber: null,
      photoPath: null,
      locale: "en",
      status: "active",
      createdAt: FieldValue.serverTimestamp(),
    });
  } else {
    await ref.update(system);
  }
  return { ok: true };
});

export const setUserAvatar = onCall(async (request) => {
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
});

export const stripDownloadTokens = onObjectFinalized(async (event) => {
  const name = event.data.name;
  const bucketName = event.data.bucket;
  if (!name || !bucketName) return;
  await stripObjectTokens(bucketName, name);
});

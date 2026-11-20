import { getApp } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";
import { emulatorBucketName, liveDefaultBucketName } from "../../shared/firebase/bucket.js";

/**
 * Emulator uploads land in `<project>.appspot.com`.
 * Live uploads use the project's default bucket. On `magemai` that is
 * `magemai.firebasestorage.app` in us-east1, not the legacy appspot name.
 */
export function defaultBucket() {
  if (process.env.FIREBASE_STORAGE_EMULATOR_HOST) {
    const project =
      process.env.GCLOUD_PROJECT ?? process.env.GOOGLE_CLOUD_PROJECT ?? "demo-magemai";
    return getStorage().bucket(emulatorBucketName(project));
  }
  const app = getApp();
  const project =
    app.options.projectId ??
    process.env.GCLOUD_PROJECT ??
    process.env.GOOGLE_CLOUD_PROJECT ??
    "magemai";
  const configured =
    typeof app.options.storageBucket === "string" ? app.options.storageBucket : undefined;
  return getStorage().bucket(liveDefaultBucketName(project, configured));
}

type ObjectMetadata = {
  metadata?: Record<string, string | number | boolean | null> | null;
};

/**
 * Clears `firebaseStorageDownloadTokens` on one object.
 * The file is passed in so a test can use the Admin SDK app that uploaded it.
 */
export async function clearDownloadToken(file: {
  getMetadata: () => Promise<[ObjectMetadata, ...unknown[]]>;
  setMetadata: (metadata: { metadata: Record<string, string | null> }) => Promise<unknown>;
}): Promise<void> {
  const [metadata] = await file.getMetadata();
  const custom = metadata.metadata ?? {};
  if (custom.magemaiDownloadTokenStripped === "true") return;
  const next: Record<string, string | null> = {};
  for (const [key, value] of Object.entries(custom)) {
    if (typeof value === "string") next[key] = value;
  }
  // Production removes the key when the value is null. The Storage emulator
  // keeps the previous token; docs/setup.md records that difference.
  next.firebaseStorageDownloadTokens = null;
  next.magemaiDownloadTokenStripped = "true";
  await file.setMetadata({ metadata: next });
}

export async function stripDownloadTokens(bucketName: string, objectPath: string): Promise<void> {
  await clearDownloadToken(getStorage().bucket(bucketName).file(objectPath));
}

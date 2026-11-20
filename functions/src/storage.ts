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

export async function stripDownloadTokens(bucketName: string, objectPath: string): Promise<void> {
  const file = getStorage().bucket(bucketName).file(objectPath);
  const [metadata] = await file.getMetadata();
  const custom = metadata.metadata ?? {};
  if (custom.magemaiDownloadTokenStripped === "true") return;
  await file.setMetadata({
    metadata: {
      ...custom,
      firebaseStorageDownloadTokens: null,
      magemaiDownloadTokenStripped: "true",
    },
  });
}

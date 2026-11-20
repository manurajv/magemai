import { getStorage } from "firebase-admin/storage";

/**
 * Emulator uploads land in `<project>.appspot.com`.
 * Live uploads use the project's default bucket, which is not hardcoded here.
 */
export function defaultBucket() {
  if (process.env.FIREBASE_STORAGE_EMULATOR_HOST) {
    const project =
      process.env.GCLOUD_PROJECT ?? process.env.GOOGLE_CLOUD_PROJECT ?? "demo-magemai";
    return getStorage().bucket(`${project}.appspot.com`);
  }
  return getStorage().bucket();
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

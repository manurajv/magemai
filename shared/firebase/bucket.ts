/** Storage emulator default bucket. Live projects do not use this name. */
export function emulatorBucketName(projectId: string): string {
  return `${projectId}.appspot.com`;
}

/**
 * Live default bucket. New Firebase projects name it
 * `{projectId}.firebasestorage.app`. `FIREBASE_CONFIG.storageBucket` sometimes
 * still reports the legacy `{projectId}.appspot.com` name, which is not the
 * bucket on `magemai` (`magemai.firebasestorage.app`).
 */
export function liveDefaultBucketName(projectId: string, configuredBucket?: string): string {
  const configured = configuredBucket?.trim().replace(/^gs:\/\//, "") ?? "";
  if (configured && configured !== emulatorBucketName(projectId)) {
    return configured;
  }
  return `${projectId}.firebasestorage.app`;
}

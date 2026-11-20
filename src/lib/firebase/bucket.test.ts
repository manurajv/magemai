import { describe, expect, it } from "vitest";
import { emulatorBucketName, liveDefaultBucketName } from "@shared/firebase/bucket";
import { FUNCTIONS_REGION, STORAGE_REGION } from "@shared/firebase/region";

describe("storage bucket names", () => {
  it("keeps the emulator on the appspot bucket", () => {
    expect(emulatorBucketName("demo-magemai")).toBe("demo-magemai.appspot.com");
  });

  it("uses the live default bucket, including when config still names appspot", () => {
    expect(liveDefaultBucketName("magemai")).toBe("magemai.firebasestorage.app");
    expect(liveDefaultBucketName("magemai", "magemai.appspot.com")).toBe(
      "magemai.firebasestorage.app",
    );
    expect(liveDefaultBucketName("magemai", "gs://magemai.firebasestorage.app")).toBe(
      "magemai.firebasestorage.app",
    );
  });

  it("keeps a configured live bucket that is not the legacy appspot name", () => {
    expect(liveDefaultBucketName("magemai", "magemai.firebasestorage.app")).toBe(
      "magemai.firebasestorage.app",
    );
  });

  it("places only the storage trigger outside asia-south1", () => {
    expect(FUNCTIONS_REGION).toBe("asia-south1");
    expect(STORAGE_REGION).toBe("us-east1");
  });
});

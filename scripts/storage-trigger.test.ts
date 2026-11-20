import { beforeAll, describe, expect, it } from "vitest";

type StorageEndpoint = {
  region?: string[];
  eventTrigger?: { eventFilters?: { bucket?: string } };
};

describe("stripDownloadTokens trigger", () => {
  let endpoint: StorageEndpoint;

  beforeAll(async () => {
    process.env.FIREBASE_CONFIG = JSON.stringify({
      projectId: "demo-magemai",
      storageBucket: "demo-magemai.appspot.com",
    });
    process.env.GCLOUD_PROJECT = "demo-magemai";
    const users = await import("../functions/src/users.ts");
    endpoint = (users.stripDownloadTokens as unknown as { __endpoint: StorageEndpoint }).__endpoint;
  });

  it("deploys in the bucket region and listens to the configured bucket", () => {
    expect(endpoint.region).toEqual(["us-east1"]);
    expect(endpoint.eventTrigger?.eventFilters?.bucket).toBe("demo-magemai.appspot.com");
  });
});

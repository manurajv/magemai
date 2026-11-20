import { describe, expect, it } from "vitest";
import { isRetryableSyncError, profileSyncReason, shouldSyncProfile } from "@/lib/auth/session";

describe("profile sync", () => {
  const pageStartedAt = Date.parse("2026-11-20T06:00:00.000Z");

  it("treats a sign-in during this page as a full sync", () => {
    expect(
      profileSyncReason("Fri, 20 Nov 2026 06:00:05 GMT", pageStartedAt, pageStartedAt + 5_000),
    ).toBe("sign-in");
    expect(shouldSyncProfile("sign-in", true)).toBe(true);
    expect(shouldSyncProfile("sign-in", false)).toBe(true);
  });

  it("syncs a restored session only when the profile is missing", () => {
    expect(profileSyncReason("Thu, 19 Nov 2026 06:00:00 GMT", pageStartedAt, pageStartedAt)).toBe(
      "app-load",
    );
    expect(shouldSyncProfile("app-load", false)).toBe(true);
    expect(shouldSyncProfile("app-load", true)).toBe(false);
  });

  it("retries one transient callable failure and not a permission error", () => {
    expect(isRetryableSyncError({ code: "functions/internal" })).toBe(true);
    expect(isRetryableSyncError({ code: "functions/unavailable" })).toBe(true);
    expect(isRetryableSyncError({ code: "functions/aborted" })).toBe(true);
    expect(isRetryableSyncError({ code: "functions/permission-denied" })).toBe(false);
    expect(isRetryableSyncError(new Error("offline"))).toBe(false);
  });
});

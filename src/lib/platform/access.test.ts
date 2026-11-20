import { describe, expect, it } from "vitest";
import { isPlatformPermission } from "@shared/permissions";
import { platformAccessDecision } from "@/lib/platform/access";

describe("platform access", () => {
  it("denies a missing claim before it reads the registry", () => {
    expect(platformAccessDecision("no", "loading")).toBe("denied-claim");
    expect(platformAccessDecision("loading", "active")).toBe("loading");
  });

  it("denies a revoked registry even when the claim is still present", () => {
    expect(platformAccessDecision("yes", "inactive")).toBe("denied-registry");
    expect(platformAccessDecision("yes", "active")).toBe("ready");
    expect(platformAccessDecision("yes", "error")).toBe("error");
  });

  it("keeps platform permissions off the business role map", () => {
    expect(isPlatformPermission("platform.businesses.setStatus")).toBe(true);
    expect(isPlatformPermission("business.profile.update")).toBe(false);
  });
});

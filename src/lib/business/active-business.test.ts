import { describe, expect, it } from "vitest";
import { roleHas } from "@shared/permissions";
import { chooseActiveBusinessId } from "@/lib/business/active-business";
import { visibleBusinessNavigation } from "@/app/navigation/items";

describe("chooseActiveBusinessId", () => {
  const older = { businessId: "alpha", createdAtMs: 10 };
  const newer = { businessId: "beta", createdAtMs: 20 };

  it("keeps a stored id that is still an active membership", () => {
    expect(chooseActiveBusinessId([older, newer], "alpha")).toBe("alpha");
  });

  it("falls back to the newest membership when the stored id is gone", () => {
    expect(chooseActiveBusinessId([older, newer], "revoked")).toBe("beta");
    expect(chooseActiveBusinessId([older, newer], null)).toBe("beta");
  });

  it("returns null when the person has no active membership", () => {
    expect(chooseActiveBusinessId([], "alpha")).toBeNull();
  });
});

describe("dashboard permissions", () => {
  it("lets staff read the profile and hides settings", () => {
    expect(roleHas("staff", "business.profile.read")).toBe(true);
    expect(roleHas("staff", "business.settings.read")).toBe(false);
    expect(roleHas("staff", "audit.business.read")).toBe(false);
    const labels = visibleBusinessNavigation("staff").map((item) => item.label);
    expect(labels).toContain("Business profile");
    expect(labels).not.toContain("Settings");
    expect(labels).toContain("Services");
  });

  it("lets a manager read settings and not change them", () => {
    expect(roleHas("manager", "business.settings.read")).toBe(true);
    expect(roleHas("manager", "business.settings.update")).toBe(false);
    expect(roleHas("owner", "business.settings.update")).toBe(true);
  });
});

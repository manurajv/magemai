import { describe, expect, it } from "vitest";
import {
  businessPermissions,
  businessRoles,
  platformPermissions,
  roleHas,
  type BusinessPermission,
  type BusinessRole,
} from "@shared/permissions";

/**
 * Architecture section 10. Empty cells are denied. There is no business.delete.
 * Platform permissions are not business-role grants.
 */
const allowed: Record<BusinessRole, readonly BusinessPermission[]> = {
  owner: [...businessPermissions],
  admin: [...businessPermissions],
  manager: [
    "business.profile.read",
    "business.profile.update",
    "business.settings.read",
    "business.image.update",
    "membership.list",
    "dashboard.access",
  ],
  staff: ["business.profile.read", "dashboard.access"],
};

describe("permission matrix", () => {
  it("matches architecture section 10, including the denied cells", () => {
    expect([...businessRoles]).toEqual(["owner", "admin", "manager", "staff"]);
    expect([...platformPermissions]).toEqual([
      "platform.users.read",
      "platform.businesses.read",
      "platform.businesses.setStatus",
      "platform.businesses.setVerification",
      "platform.audit.read",
      "platform.settings.read",
    ]);
    expect(businessPermissions).not.toContain("business.delete");
    for (const role of businessRoles) {
      for (const permission of businessPermissions) {
        expect(roleHas(role, permission), `${role} ${permission}`).toBe(
          allowed[role].includes(permission),
        );
      }
    }
    expect(roleHas("not-a-role", "dashboard.access")).toBe(false);
    expect(roleHas("staff", "business.settings.update")).toBe(false);
    expect(roleHas("staff", "audit.business.read")).toBe(false);
    expect(roleHas("manager", "business.settings.update")).toBe(false);
    expect(roleHas("manager", "audit.business.read")).toBe(false);
    expect(roleHas("admin", "audit.business.read")).toBe(true);
  });
});

export const businessRoles = ["owner", "admin", "manager", "staff"] as const;

export type BusinessRole = (typeof businessRoles)[number];

export const businessPermissions = [
  "business.profile.read",
  "business.profile.update",
  "business.settings.read",
  "business.settings.update",
  "business.image.update",
  "membership.list",
  "audit.business.read",
  "dashboard.access",
] as const;

export type BusinessPermission = (typeof businessPermissions)[number];

const grants: Record<BusinessRole, readonly BusinessPermission[]> = {
  owner: businessPermissions,
  admin: businessPermissions,
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

export function isBusinessRole(value: unknown): value is BusinessRole {
  return typeof value === "string" && (businessRoles as readonly string[]).includes(value);
}

export function roleHas(role: unknown, permission: BusinessPermission): boolean {
  if (!isBusinessRole(role)) return false;
  return grants[role].includes(permission);
}

export function roleLabel(role: BusinessRole): string {
  return role.slice(0, 1).toUpperCase() + role.slice(1);
}

export const platformPermissions = [
  "platform.users.read",
  "platform.businesses.read",
  "platform.businesses.setStatus",
  "platform.businesses.setVerification",
  "platform.audit.read",
  "platform.settings.read",
] as const;

export type PlatformPermission = (typeof platformPermissions)[number];

export function isPlatformPermission(value: unknown): value is PlatformPermission {
  return typeof value === "string" && (platformPermissions as readonly string[]).includes(value);
}

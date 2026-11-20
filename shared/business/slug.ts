import { SLUG_MAX, SLUG_MIN } from "./limits.js";

/** These slugs stay reserved even when platform settings omit them. */
export const CODE_RESERVED_SLUGS = [
  "admin",
  "super-admin",
  "superadmin",
  "login",
  "register",
  "account",
  "search",
  "api",
  "auth",
  "onboarding",
  "dashboard",
  "settings",
  "new",
  "edit",
  "magemai",
  "mavixas",
  "www",
  "app",
  "null",
  "undefined",
] as const;

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function suggestSlug(name: string): string {
  const folded = name.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
  if (!/[A-Za-z]/.test(folded)) return "";
  const slug = folded
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, SLUG_MAX)
    .replace(/-+$/g, "");
  if (slug.length < SLUG_MIN || !/[a-z]/.test(slug) || !SLUG_PATTERN.test(slug)) return "";
  return slug;
}

export function reservedSlugSet(extra: readonly string[] = []): Set<string> {
  const reserved = new Set<string>(CODE_RESERVED_SLUGS);
  for (const slug of extra) {
    const normalized = slug.trim().toLowerCase();
    if (normalized) reserved.add(normalized);
  }
  return reserved;
}

export function isReservedSlug(slug: string, extra: readonly string[] = []): boolean {
  return reservedSlugSet(extra).has(slug.trim().toLowerCase());
}

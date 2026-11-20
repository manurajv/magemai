import { ACTIVE_BUSINESS_STORAGE_KEY } from "@/lib/auth/session";

export type MembershipChoice = {
  businessId: string;
  createdAtMs: number;
};

export function readActiveBusinessId(): string | null {
  const stored = localStorage.getItem(ACTIVE_BUSINESS_STORAGE_KEY);
  return stored && stored.trim().length > 0 ? stored : null;
}

export function writeActiveBusinessId(businessId: string): void {
  localStorage.setItem(ACTIVE_BUSINESS_STORAGE_KEY, businessId);
}

/**
 * Keep the stored id only when it is still an active membership. Otherwise
 * use the newest membership. No memberships means there is nothing to open.
 */
export function chooseActiveBusinessId(
  memberships: readonly MembershipChoice[],
  storedId: string | null,
): string | null {
  if (memberships.length === 0) return null;
  if (storedId && memberships.some((item) => item.businessId === storedId)) return storedId;
  const newest = [...memberships].sort((left, right) => {
    if (right.createdAtMs !== left.createdAtMs) return right.createdAtMs - left.createdAtMs;
    return left.businessId < right.businessId ? -1 : 1;
  })[0];
  return newest?.businessId ?? null;
}

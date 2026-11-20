import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import {
  isBusinessRole,
  roleHas,
  type BusinessPermission,
  type BusinessRole,
} from "@shared/permissions";
import type { BusinessProfileInput, BusinessSettingsInput } from "@shared/validation/business";
import { firebaseErrorCode, unexpectedCallableMessage } from "@/lib/auth/errors";
import { getFirebase } from "@/lib/firebase/client";

export type BusinessLifecycle = "active" | "suspended";
export type VerificationStatus = "unverified" | "pending" | "verified" | "rejected";

export type ActiveMembership = {
  businessId: string;
  role: BusinessRole;
  name: string;
  createdAtMs: number;
  businessStatus: BusinessLifecycle;
  verificationStatus: VerificationStatus;
};

export type BusinessRecord = BusinessProfileInput &
  BusinessSettingsInput & {
    id: string;
    slug: string;
    status: BusinessLifecycle;
    verificationStatus: VerificationStatus;
  };

function millis(value: unknown): number {
  if (
    typeof value === "object" &&
    value !== null &&
    "toMillis" in value &&
    typeof value.toMillis === "function"
  ) {
    const result = value.toMillis();
    return typeof result === "number" ? result : 0;
  }
  return 0;
}

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function nullableText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function lifecycle(value: unknown): BusinessLifecycle | null {
  return value === "active" || value === "suspended" ? value : null;
}

function verification(value: unknown): VerificationStatus {
  if (
    value === "unverified" ||
    value === "pending" ||
    value === "verified" ||
    value === "rejected"
  ) {
    return value;
  }
  return "unverified";
}

export async function loadActiveMemberships(uid: string): Promise<ActiveMembership[]> {
  const { db } = getFirebase();
  const snap = await getDocs(
    query(
      collection(db, "businessMembers"),
      where("userId", "==", uid),
      where("status", "==", "active"),
    ),
  );
  const memberships = await Promise.all(
    snap.docs.map(async (member) => {
      const role = member.get("role");
      const businessId = text(member.get("businessId"));
      if (!isBusinessRole(role) || businessId.length === 0) return null;
      const business = await getDoc(doc(db, "businesses", businessId));
      const status = lifecycle(business.get("status"));
      if (!business.exists() || !status) return null;
      return {
        businessId,
        role,
        name: text(business.get("name")) || "Business",
        createdAtMs: millis(member.get("createdAt")),
        businessStatus: status,
        verificationStatus: verification(business.get("verificationStatus")),
      } satisfies ActiveMembership;
    }),
  );
  return memberships.filter((item): item is ActiveMembership => item !== null);
}

export async function readBusiness(businessId: string): Promise<BusinessRecord> {
  const snap = await getDoc(doc(getFirebase().db, "businesses", businessId));
  if (!snap.exists()) throw new Error("This business was not found.");
  const contact = (snap.get("contact") ?? {}) as Record<string, unknown>;
  const address = (snap.get("address") ?? {}) as Record<string, unknown>;
  const settings = (snap.get("settings") ?? {}) as Record<string, unknown>;
  const status = lifecycle(snap.get("status"));
  if (!status) throw new Error("This business was not found.");
  return {
    id: businessId,
    name: text(snap.get("name")),
    slug: text(snap.get("slug")),
    categoryId: text(snap.get("categoryId")),
    description: text(snap.get("description")),
    contact: {
      email: text(contact.email),
      phone: nullableText(contact.phone),
      website: nullableText(contact.website),
    },
    address: {
      line1: text(address.line1),
      line2: nullableText(address.line2),
      city: text(address.city),
      region: nullableText(address.region),
      postalCode: nullableText(address.postalCode),
      country: text(address.country),
    },
    timezone: text(snap.get("timezone")),
    currency: text(snap.get("currency")),
    language: text(snap.get("language")),
    notificationEmail: nullableText(settings.notificationEmail),
    status,
    verificationStatus: verification(snap.get("verificationStatus")),
  };
}

export function mapDashboardError(error: unknown): string {
  const unexpected = unexpectedCallableMessage(error);
  if (unexpected) return unexpected;
  const code = firebaseErrorCode(error);
  const message = error instanceof Error ? error.message : "";
  if (code === "functions/permission-denied") {
    return message || "You cannot change this business.";
  }
  if (code === "functions/failed-precondition") {
    return message || "This business cannot be edited right now.";
  }
  if (code === "functions/invalid-argument") return message || "Check the form and try again.";
  if (code === "functions/unauthenticated") return "Sign in before saving.";
  return "The business could not be saved. Try again.";
}

export async function saveBusinessProfile(
  businessId: string,
  input: BusinessProfileInput,
): Promise<void> {
  const call = httpsCallable(getFirebase().functions, "updateBusinessProfile");
  await call({ businessId, ...input });
}

export async function saveBusinessSettings(
  businessId: string,
  input: BusinessSettingsInput,
): Promise<void> {
  const call = httpsCallable(getFirebase().functions, "updateBusinessSettings");
  await call({ businessId, ...input });
}

export function canEdit(role: BusinessRole, permission: BusinessPermission, suspended: boolean) {
  return !suspended && roleHas(role, permission);
}

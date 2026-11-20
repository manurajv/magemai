import {
  collection,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
  where,
  type QueryConstraint,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import type { BusinessLifecycle, VerificationStatus } from "@shared/validation/platform";
import { firebaseErrorCode, unexpectedCallableMessage } from "@/lib/auth/errors";
import { getFirebase } from "@/lib/firebase/client";

export const PLATFORM_PAGE_SIZE = 25;

export type Page<T> = {
  rows: T[];
  cursor: QueryDocumentSnapshot | null;
  hasMore: boolean;
};

export type PlatformUserRow = {
  id: string;
  email: string;
  displayName: string;
  status: string;
  emailVerified: boolean;
  createdAtMs: number;
};

export type PlatformBusinessRow = {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  ownerLabel: string;
  status: BusinessLifecycle;
  verificationStatus: VerificationStatus;
  createdAtMs: number;
};

export type PlatformAuditRow = {
  id: string;
  scope: string;
  businessId: string;
  actorId: string;
  action: string;
  summary: string;
  createdAtMs: number;
};

export type BusinessChangeResult = {
  changed: boolean;
  auditId: string | null;
  summary: string | null;
  from: string;
  to: string;
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

function text(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function pageOf<T>(docs: QueryDocumentSnapshot[], rows: T[]): Page<T> {
  return {
    rows,
    cursor: docs.at(-1) ?? null,
    hasMore: docs.length === PLATFORM_PAGE_SIZE,
  };
}

async function paged(
  constraints: QueryConstraint[],
  cursor: QueryDocumentSnapshot | null,
  name: string,
) {
  const { db } = getFirebase();
  const applied = cursor ? [...constraints, startAfter(cursor)] : constraints;
  const snap = await getDocs(query(collection(db, name), ...applied));
  return snap.docs;
}

export async function countCollection(name: "users" | "businesses"): Promise<number> {
  const { db } = getFirebase();
  const snap = await getCountFromServer(collection(db, name));
  return snap.data().count;
}

export async function readOwnPlatformAdmin(uid: string): Promise<"active" | "inactive"> {
  const snap = await getDoc(doc(getFirebase().db, "platformAdmins", uid));
  return snap.exists() && snap.get("status") === "active" ? "active" : "inactive";
}

export async function loadPlatformUsers(
  cursor: QueryDocumentSnapshot | null,
): Promise<Page<PlatformUserRow>> {
  const docs = await paged(
    [orderBy("createdAt", "desc"), limit(PLATFORM_PAGE_SIZE)],
    cursor,
    "users",
  );
  return pageOf(
    docs,
    docs.map((item) => ({
      id: item.id,
      email: text(item.get("email")),
      displayName: text(item.get("displayName")),
      status: text(item.get("status"), "active"),
      emailVerified: item.get("emailVerified") === true,
      createdAtMs: millis(item.get("createdAt")),
    })),
  );
}

function lifecycle(value: unknown): BusinessLifecycle {
  return value === "suspended" ? "suspended" : "active";
}

function verification(value: unknown): VerificationStatus {
  if (
    value === "pending" ||
    value === "verified" ||
    value === "rejected" ||
    value === "unverified"
  ) {
    return value;
  }
  return "unverified";
}

async function ownerLabels(ids: string[]): Promise<Map<string, string>> {
  const { db } = getFirebase();
  const unique = [...new Set(ids)];
  const pairs = await Promise.all(
    unique.map(async (id) => {
      const snap = await getDoc(doc(db, "users", id));
      const email = text(snap.get("email"));
      const name = text(snap.get("displayName"));
      return [id, email || name || id] as const;
    }),
  );
  return new Map(pairs);
}

export async function loadPlatformBusinesses(
  cursor: QueryDocumentSnapshot | null,
  unverifiedOnly: boolean,
): Promise<Page<PlatformBusinessRow>> {
  const constraints: QueryConstraint[] = unverifiedOnly
    ? [
        where("verificationStatus", "!=", "verified"),
        orderBy("verificationStatus"),
        orderBy("createdAt", "desc"),
        limit(PLATFORM_PAGE_SIZE),
      ]
    : [orderBy("createdAt", "desc"), limit(PLATFORM_PAGE_SIZE)];
  const docs = await paged(constraints, cursor, "businesses");
  const owners = await ownerLabels(docs.map((item) => text(item.get("ownerId"))));
  return pageOf(
    docs,
    docs.map((item) => {
      const ownerId = text(item.get("ownerId"));
      return {
        id: item.id,
        name: text(item.get("name")),
        slug: text(item.get("slug")),
        ownerId,
        ownerLabel: owners.get(ownerId) ?? ownerId,
        status: lifecycle(item.get("status")),
        verificationStatus: verification(item.get("verificationStatus")),
        createdAtMs: millis(item.get("createdAt")),
      };
    }),
  );
}

export async function loadPlatformAudit(input: {
  cursor: QueryDocumentSnapshot | null;
  scope: "all" | "platform" | "business";
  businessId: string;
}): Promise<Page<PlatformAuditRow>> {
  const constraints: QueryConstraint[] = [];
  const businessId = input.businessId.trim();
  if (input.scope !== "all") constraints.push(where("scope", "==", input.scope));
  if (businessId) constraints.push(where("businessId", "==", businessId));
  constraints.push(orderBy("createdAt", "desc"), limit(PLATFORM_PAGE_SIZE));
  const docs = await paged(constraints, input.cursor, "auditLogs");
  return pageOf(
    docs,
    docs.map((item) => ({
      id: item.id,
      scope: text(item.get("scope")),
      businessId: text(item.get("businessId")),
      actorId: text(item.get("actorId")),
      action: text(item.get("action")),
      summary: text(item.get("summary")),
      createdAtMs: millis(item.get("createdAt")),
    })),
  );
}

export type PlatformSettingsView = {
  defaultCountry: string;
  defaultCurrency: string;
  defaultLanguage: string;
  defaultTimezone: string;
  maintenanceMode: boolean;
  supportedCurrencies: string[];
  supportedLanguages: string[];
  categories: string[];
};

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

export async function loadPlatformSettingsView(): Promise<PlatformSettingsView> {
  const snap = await getDoc(doc(getFirebase().db, "platformSettings", "global"));
  if (!snap.exists()) {
    throw new Error("Platform settings are not seeded.");
  }
  const categories = Array.isArray(snap.get("businessCategories"))
    ? snap.get("businessCategories")
    : [];
  return {
    defaultCountry: text(snap.get("defaultCountry")),
    defaultCurrency: text(snap.get("defaultCurrency")),
    defaultLanguage: text(snap.get("defaultLanguage")),
    defaultTimezone: text(snap.get("defaultTimezone")),
    maintenanceMode: snap.get("maintenanceMode") === true,
    supportedCurrencies: stringList(snap.get("supportedCurrencies")),
    supportedLanguages: stringList(snap.get("supportedLanguages")),
    categories: categories.flatMap((category: unknown) => {
      if (
        typeof category === "object" &&
        category !== null &&
        "label" in category &&
        typeof category.label === "string"
      ) {
        return [category.label];
      }
      return [];
    }),
  };
}

export function mapPlatformError(error: unknown): string {
  const unexpected = unexpectedCallableMessage(error);
  if (unexpected) return unexpected;
  const code = firebaseErrorCode(error);
  if (code.includes("permission-denied")) return "You do not have platform access.";
  if (code.includes("unauthenticated")) return "Sign in before continuing.";
  if (code.includes("not-found")) return "That business was not found.";
  if (code.includes("invalid-argument")) return "Check the values and try again.";
  if (error instanceof Error && error.message) return error.message;
  return "The platform request failed. Try again.";
}

async function callChange(
  name: "setBusinessStatus" | "setBusinessVerification",
  payload: Record<string, string>,
): Promise<BusinessChangeResult> {
  const result = await httpsCallable(getFirebase().functions, name)(payload);
  const data = result.data;
  if (typeof data !== "object" || data === null) {
    throw new Error("The platform request failed. Try again.");
  }
  const record = data as Partial<BusinessChangeResult>;
  return {
    changed: record.changed === true,
    auditId: typeof record.auditId === "string" ? record.auditId : null,
    summary: typeof record.summary === "string" ? record.summary : null,
    from: typeof record.from === "string" ? record.from : "",
    to: typeof record.to === "string" ? record.to : "",
  };
}

export function saveBusinessStatus(
  businessId: string,
  status: BusinessLifecycle,
): Promise<BusinessChangeResult> {
  return callChange("setBusinessStatus", { businessId, status });
}

export function saveBusinessVerification(
  businessId: string,
  verificationStatus: VerificationStatus,
): Promise<BusinessChangeResult> {
  return callChange("setBusinessVerification", { businessId, verificationStatus });
}

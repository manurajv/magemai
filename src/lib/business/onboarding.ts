import { updateProfile } from "firebase/auth";
import { doc, getDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { ref, uploadBytes } from "firebase/storage";
import { COVER_MAX_BYTES, LOGO_MAX_BYTES } from "@shared/business/limits";
import { isAvatarContentType } from "@shared/profile/limits";
import { type BusinessInput, type PlatformSettingsSnapshot } from "@shared/validation/business";
import { firebaseErrorCode } from "@/lib/auth/errors";
import { ACTIVE_BUSINESS_STORAGE_KEY } from "@/lib/auth/session";
import { getFirebase } from "@/lib/firebase/client";

export type OnboardingSettings = PlatformSettingsSnapshot & {
  defaultCountry: string;
  defaultCurrency: string;
  defaultLanguage: string;
  defaultTimezone: string;
  supportedCountries: string[];
};

export function imageRejection(file: File, kind: "logo" | "cover"): string | null {
  const max = kind === "logo" ? LOGO_MAX_BYTES : COVER_MAX_BYTES;
  const label = kind === "logo" ? "2 MB" : "5 MB";
  if (!isAvatarContentType(file.type)) return "Choose a JPEG, PNG, or WebP image.";
  if (file.size <= 0 || file.size > max) return `Choose an image up to ${label}.`;
  return null;
}

export function mapBusinessError(error: unknown): string {
  const code = firebaseErrorCode(error);
  const message = error instanceof Error ? error.message : "";
  if (code === "functions/already-exists") return "That address is already taken.";
  if (code === "functions/resource-exhausted") {
    return message || "You have reached the limit for new businesses.";
  }
  if (code === "functions/permission-denied") return "Verify your email, then try again.";
  if (code === "functions/unauthenticated") return "Sign in before creating a business.";
  if (code === "functions/failed-precondition") {
    if (message.toLowerCase().includes("platform settings")) {
      return "Platform settings are not available yet.";
    }
    return "Your account is not ready to create a business yet.";
  }
  if (code === "functions/invalid-argument" || code === "functions/not-found") {
    return message || "Check the form and try again.";
  }
  return "The business could not be created. Try again.";
}

export async function readPlatformSettings(): Promise<OnboardingSettings> {
  const snap = await getDoc(doc(getFirebase().db, "platformSettings", "global"));
  if (!snap.exists()) {
    throw new Error("Platform settings are not available yet.");
  }
  const data = snap.data();
  const categories = Array.isArray(data.businessCategories) ? data.businessCategories : [];
  return {
    supportedCurrencies: Array.isArray(data.supportedCurrencies) ? data.supportedCurrencies : [],
    supportedLanguages: Array.isArray(data.supportedLanguages) ? data.supportedLanguages : [],
    reservedSlugs: Array.isArray(data.reservedSlugs) ? data.reservedSlugs : [],
    businessCategories: categories.flatMap((category) => {
      if (
        typeof category === "object" &&
        category !== null &&
        "id" in category &&
        "label" in category &&
        typeof category.id === "string" &&
        typeof category.label === "string"
      ) {
        return [{ id: category.id, label: category.label }];
      }
      return [];
    }),
    defaultCountry: typeof data.defaultCountry === "string" ? data.defaultCountry : "LK",
    defaultCurrency: typeof data.defaultCurrency === "string" ? data.defaultCurrency : "LKR",
    defaultLanguage: typeof data.defaultLanguage === "string" ? data.defaultLanguage : "en",
    defaultTimezone:
      typeof data.defaultTimezone === "string" ? data.defaultTimezone : "Asia/Colombo",
    supportedCountries: Array.isArray(data.supportedCountries) ? data.supportedCountries : ["LK"],
  };
}

export async function checkSlugAvailability(slug: string): Promise<boolean> {
  const call = httpsCallable<{ slug: string }, { available: boolean }>(
    getFirebase().functions,
    "checkSlugAvailability",
  );
  const result = await call({ slug });
  return result.data.available === true;
}

export async function saveOwnerDisplayName(displayName: string): Promise<void> {
  const { auth, db } = getFirebase();
  const current = auth.currentUser;
  if (!current) throw new Error("Sign in again.");
  await updateProfile(current, { displayName });
  await updateDoc(doc(db, "users", current.uid), {
    displayName,
    updatedAt: serverTimestamp(),
  });
}

export async function createBusiness(input: BusinessInput): Promise<string> {
  const call = httpsCallable<BusinessInput, { businessId: string }>(
    getFirebase().functions,
    "createBusiness",
  );
  const result = await call(input);
  const businessId = result.data.businessId;
  if (!businessId) throw new Error("The business could not be created. Try again.");
  return businessId;
}

export async function saveBusinessImage(
  businessId: string,
  kind: "logo" | "cover",
  file: File,
): Promise<void> {
  const problem = imageRejection(file, kind);
  if (problem) throw new Error(problem);
  const { storage, functions } = getFirebase();
  const path = `businesses/${businessId}/brand/${kind}`;
  await uploadBytes(ref(storage, path), file, { contentType: file.type });
  const call = httpsCallable(functions, "setBusinessImage");
  await call({ businessId, kind });
}

export function rememberActiveBusiness(businessId: string): void {
  localStorage.setItem(ACTIVE_BUSINESS_STORAGE_KEY, businessId);
}

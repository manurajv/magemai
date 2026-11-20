import { getAuth } from "firebase-admin/auth";
import { FieldValue, Timestamp, getFirestore } from "firebase-admin/firestore";
import { HttpsError, type CallableRequest } from "firebase-functions/v2/https";
import {
  COVER_MAX_BYTES,
  CREATIONS_PER_DAY,
  CREATION_WINDOW_MS,
  LOGO_MAX_BYTES,
  OWNER_MEMBERSHIP_CAP,
} from "../../shared/business/limits.js";
import { isReservedSlug } from "../../shared/business/slug.js";
import { isAvatarContentType } from "../../shared/profile/limits.js";
import { roleHas } from "../../shared/permissions/index.js";
import {
  businessInputSchema,
  businessProfileUpdateSchema,
  businessSettingsError,
  businessSettingsUpdateSchema,
  emptyToNull,
  type BusinessProfileInput,
  type BusinessSettingsInput,
  type PlatformSettingsSnapshot,
} from "../../shared/validation/business.js";
import "./admin.js";
import "./options.js";
import { defaultBucket, stripDownloadTokens } from "./storage.js";

const BRAND_KINDS = {
  logo: { field: "logoPath", maxBytes: LOGO_MAX_BYTES, label: "2 MB" },
  cover: { field: "coverImagePath", maxBytes: COVER_MAX_BYTES, label: "5 MB" },
} as const;

function requireVerifiedUser(
  requestAuth: { uid: string; token: { email_verified?: boolean } } | undefined,
  purpose = "creating a business",
) {
  if (!requestAuth) {
    throw new HttpsError("unauthenticated", "Sign in before continuing.");
  }
  if (requestAuth.token.email_verified !== true) {
    throw new HttpsError("permission-denied", `Verify your email before ${purpose}.`);
  }
  return requestAuth.uid;
}

async function loadSettings(): Promise<PlatformSettingsSnapshot> {
  const snap = await getFirestore().doc("platformSettings/global").get();
  if (!snap.exists) {
    throw new HttpsError(
      "failed-precondition",
      "Platform settings are not available yet. Seed them, then try again.",
    );
  }
  const data = snap.data() ?? {};
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
  };
}

async function assertAccountActive(uid: string): Promise<void> {
  const record = await getAuth().getUser(uid);
  if (record.disabled) {
    throw new HttpsError("permission-denied", "This account is disabled.");
  }
  const user = await getFirestore().doc(`users/${uid}`).get();
  if (!user.exists || user.get("status") !== "active") {
    throw new HttpsError("failed-precondition", "Your profile is not ready yet. Sign in again.");
  }
}

export async function checkSlugAvailability(request: CallableRequest) {
  const uid = requireVerifiedUser(request.auth);
  await assertAccountActive(uid);
  const parsed = businessInputSchema.shape.slug.safeParse(request.data?.slug);
  if (!parsed.success) return { available: false };
  const settings = await loadSettings();
  if (isReservedSlug(parsed.data, settings.reservedSlugs)) return { available: false };
  const existing = await getFirestore().doc(`businessSlugs/${parsed.data}`).get();
  return { available: !existing.exists };
}

async function enforceCaps(uid: string): Promise<void> {
  const db = getFirestore();
  const since = Timestamp.fromMillis(Date.now() - CREATION_WINDOW_MS);
  const created = await db
    .collection("businesses")
    .where("createdBy", "==", uid)
    .where("createdAt", ">=", since)
    .get();
  if (created.size >= CREATIONS_PER_DAY) {
    throw new HttpsError("resource-exhausted", "You can create up to 10 businesses in 24 hours.");
  }
  const owned = await db
    .collection("businessMembers")
    .where("userId", "==", uid)
    .where("role", "==", "owner")
    .where("status", "==", "active")
    .get();
  if (owned.size >= OWNER_MEMBERSHIP_CAP) {
    throw new HttpsError("resource-exhausted", "You can own up to 25 businesses.");
  }
}

export async function createBusiness(request: CallableRequest) {
  const uid = requireVerifiedUser(request.auth);
  await assertAccountActive(uid);
  const parsed = businessInputSchema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", parsed.error.issues[0]?.message ?? "Check the form.");
  }
  const input = parsed.data;
  const settings = await loadSettings();
  const settingsError = businessSettingsError(input, settings);
  if (settingsError) throw new HttpsError("invalid-argument", settingsError);
  if (isReservedSlug(input.slug, settings.reservedSlugs)) {
    throw new HttpsError("invalid-argument", "Choose a different web address.");
  }

  const db = getFirestore();
  const slugRef = db.doc(`businessSlugs/${input.slug}`);
  const existingSlug = await slugRef.get();
  if (existingSlug.exists) {
    const businessId = String(existingSlug.get("businessId") ?? "");
    const existing = await db.doc(`businesses/${businessId}`).get();
    if (existing.exists && existing.get("ownerId") === uid) {
      return { businessId, created: false };
    }
    throw new HttpsError("already-exists", "That address is already taken.");
  }

  await enforceCaps(uid);

  const businessRef = db.collection("businesses").doc();
  let businessId = businessRef.id;
  let created = true;
  const memberId = `${businessRef.id}_${uid}`;
  const memberRef = db.doc(`businessMembers/${memberId}`);
  const auditRef = db.collection("auditLogs").doc();
  const now = FieldValue.serverTimestamp();
  const business = {
    id: businessRef.id,
    ownerId: uid,
    name: input.name,
    slug: input.slug,
    categoryId: input.categoryId,
    description: input.description,
    contact: {
      email: input.contact.email,
      phone: emptyToNull(input.contact.phone),
      website: emptyToNull(input.contact.website),
    },
    address: {
      line1: input.address.line1,
      line2: emptyToNull(input.address.line2),
      city: input.address.city,
      region: emptyToNull(input.address.region),
      postalCode: emptyToNull(input.address.postalCode),
      country: input.address.country,
    },
    timezone: input.timezone,
    currency: input.currency,
    language: input.language,
    status: "active",
    verificationStatus: "unverified",
    settings: {
      bookingApprovalMode: "manual",
      notificationEmail: null,
      publicProfileEnabled: false,
    },
    logoPath: null,
    coverImagePath: null,
    createdBy: uid,
    updatedBy: uid,
    createdAt: now,
    updatedAt: now,
  };

  await db.runTransaction(async (transaction) => {
    const slugSnap = await transaction.get(slugRef);
    if (slugSnap.exists) {
      const existingId = String(slugSnap.get("businessId") ?? "");
      const current = await transaction.get(db.doc(`businesses/${existingId}`));
      if (current.exists && current.get("ownerId") === uid) {
        businessId = existingId;
        created = false;
        return;
      }
      throw new HttpsError("already-exists", "That address is already taken.");
    }
    transaction.set(slugRef, {
      slug: input.slug,
      businessId: businessRef.id,
      createdAt: now,
    });
    transaction.set(businessRef, business);
    transaction.set(memberRef, {
      id: memberId,
      businessId: businessRef.id,
      userId: uid,
      role: "owner",
      status: "active",
      createdBy: uid,
      revokedAt: null,
      revokedBy: null,
      createdAt: now,
      updatedAt: now,
    });
    transaction.set(auditRef, {
      id: auditRef.id,
      scope: "business",
      businessId: businessRef.id,
      actorId: uid,
      actorType: "user",
      action: "business.create",
      targetType: "business",
      targetId: businessRef.id,
      summary: "Created the business.",
      metadata: { slug: input.slug },
      createdAt: now,
    });
  });

  return { businessId, created };
}

export async function setBusinessImage(request: CallableRequest) {
  const uid = requireVerifiedUser(request.auth);
  await assertAccountActive(uid);
  const businessId = typeof request.data?.businessId === "string" ? request.data.businessId : "";
  const kind =
    request.data?.kind === "cover" ? "cover" : request.data?.kind === "logo" ? "logo" : "";
  if (!businessId || !kind) {
    throw new HttpsError("invalid-argument", "Choose a logo or cover image.");
  }
  const spec = BRAND_KINDS[kind];
  const db = getFirestore();
  const member = await db.doc(`businessMembers/${businessId}_${uid}`).get();
  const role = member.get("role");
  if (
    !member.exists ||
    member.get("status") !== "active" ||
    (role !== "owner" && role !== "admin" && role !== "manager")
  ) {
    throw new HttpsError("permission-denied", "You cannot change this business image.");
  }
  const businessRef = db.doc(`businesses/${businessId}`);
  const business = await businessRef.get();
  const status = business.get("status");
  if (!business.exists || (status !== "active" && status !== "suspended")) {
    throw new HttpsError("failed-precondition", "This business cannot be updated.");
  }
  const objectPath = `businesses/${businessId}/brand/${kind}`;
  const bucket = defaultBucket();
  const file = bucket.file(objectPath);
  const [exists] = await file.exists();
  if (!exists) {
    throw new HttpsError("not-found", "Upload the image before saving it.");
  }
  const [metadata] = await file.getMetadata();
  const size = Number(metadata.size ?? 0);
  const contentType = metadata.contentType ?? "";
  if (
    !isAvatarContentType(contentType) ||
    !Number.isFinite(size) ||
    size <= 0 ||
    size > spec.maxBytes
  ) {
    throw new HttpsError(
      "invalid-argument",
      `Choose a JPEG, PNG, or WebP image up to ${spec.label}.`,
    );
  }
  await stripDownloadTokens(bucket.name, objectPath);
  const auditRef = db.collection("auditLogs").doc();
  const batch = db.batch();
  batch.update(businessRef, {
    [spec.field]: objectPath,
    updatedBy: uid,
    updatedAt: FieldValue.serverTimestamp(),
  });
  batch.set(auditRef, {
    id: auditRef.id,
    scope: "business",
    businessId,
    actorId: uid,
    actorType: "user",
    action: "business.image.update",
    targetType: "business",
    targetId: businessId,
    summary: kind === "logo" ? "Updated the logo." : "Updated the cover image.",
    metadata: { kind },
    createdAt: FieldValue.serverTimestamp(),
  });
  await batch.commit();
  return { path: objectPath };
}

function assertMemberEdit(
  member: { exists: boolean; get: (field: string) => unknown },
  business: { exists: boolean; get: (field: string) => unknown },
  permission: "business.profile.update" | "business.settings.update",
): void {
  if (
    !member.exists ||
    member.get("status") !== "active" ||
    !roleHas(member.get("role"), permission)
  ) {
    throw new HttpsError("permission-denied", "You cannot change this business.");
  }
  if (!business.exists) {
    throw new HttpsError("not-found", "This business was not found.");
  }
  if (business.get("status") !== "active") {
    throw new HttpsError(
      "failed-precondition",
      "This business is suspended. Editing is turned off.",
    );
  }
}

function sameText(stored: unknown, next: string | null): boolean {
  return (stored ?? null) === next;
}

function profileUnchanged(
  business: { get: (field: string) => unknown },
  input: BusinessProfileInput,
): boolean {
  const contact = (business.get("contact") ?? {}) as Record<string, unknown>;
  const address = (business.get("address") ?? {}) as Record<string, unknown>;
  return (
    business.get("name") === input.name &&
    business.get("categoryId") === input.categoryId &&
    business.get("description") === input.description &&
    contact.email === input.contact.email &&
    sameText(contact.phone, emptyToNull(input.contact.phone)) &&
    sameText(contact.website, emptyToNull(input.contact.website)) &&
    address.line1 === input.address.line1 &&
    sameText(address.line2, emptyToNull(input.address.line2)) &&
    address.city === input.address.city &&
    sameText(address.region, emptyToNull(input.address.region)) &&
    sameText(address.postalCode, emptyToNull(input.address.postalCode)) &&
    address.country === input.address.country
  );
}

export async function updateBusinessProfile(request: CallableRequest) {
  const uid = requireVerifiedUser(request.auth, "editing a business");
  await assertAccountActive(uid);
  const parsed = businessProfileUpdateSchema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", parsed.error.issues[0]?.message ?? "Check the form.");
  }
  const { businessId, ...input } = parsed.data;
  const settings = await loadSettings();
  if (!settings.businessCategories.some((category) => category.id === input.categoryId)) {
    throw new HttpsError("invalid-argument", "Choose a category from the list.");
  }
  const db = getFirestore();
  const businessRef = db.doc(`businesses/${businessId}`);
  const memberRef = db.doc(`businessMembers/${businessId}_${uid}`);
  const auditRef = db.collection("auditLogs").doc();
  const now = FieldValue.serverTimestamp();
  let changed = false;
  await db.runTransaction(async (transaction) => {
    const member = await transaction.get(memberRef);
    const business = await transaction.get(businessRef);
    assertMemberEdit(member, business, "business.profile.update");
    if (profileUnchanged(business, input)) return;
    changed = true;
    transaction.update(businessRef, {
      name: input.name,
      categoryId: input.categoryId,
      description: input.description,
      contact: {
        email: input.contact.email,
        phone: emptyToNull(input.contact.phone),
        website: emptyToNull(input.contact.website),
      },
      address: {
        line1: input.address.line1,
        line2: emptyToNull(input.address.line2),
        city: input.address.city,
        region: emptyToNull(input.address.region),
        postalCode: emptyToNull(input.address.postalCode),
        country: input.address.country,
      },
      updatedBy: uid,
      updatedAt: now,
    });
    transaction.set(auditRef, {
      id: auditRef.id,
      scope: "business",
      businessId,
      actorId: uid,
      actorType: "user",
      action: "business.profile.update",
      targetType: "business",
      targetId: businessId,
      summary: "Updated the business profile.",
      metadata: { fields: ["name", "categoryId", "description", "contact", "address"] },
      createdAt: now,
    });
  });
  return { ok: true, changed };
}

function settingsUnchanged(
  business: { get: (field: string) => unknown },
  input: BusinessSettingsInput,
): boolean {
  const settings = (business.get("settings") ?? {}) as Record<string, unknown>;
  return (
    business.get("timezone") === input.timezone &&
    business.get("currency") === input.currency &&
    business.get("language") === input.language &&
    sameText(settings.notificationEmail, emptyToNull(input.notificationEmail))
  );
}

export async function updateBusinessSettings(request: CallableRequest) {
  const uid = requireVerifiedUser(request.auth, "editing business settings");
  await assertAccountActive(uid);
  const parsed = businessSettingsUpdateSchema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", parsed.error.issues[0]?.message ?? "Check the form.");
  }
  const { businessId, ...input } = parsed.data;
  const platform = await loadSettings();
  if (!platform.supportedCurrencies.includes(input.currency)) {
    throw new HttpsError("invalid-argument", "Choose a supported currency.");
  }
  if (!platform.supportedLanguages.includes(input.language)) {
    throw new HttpsError("invalid-argument", "Choose a supported language.");
  }
  const db = getFirestore();
  const businessRef = db.doc(`businesses/${businessId}`);
  const memberRef = db.doc(`businessMembers/${businessId}_${uid}`);
  const auditRef = db.collection("auditLogs").doc();
  const now = FieldValue.serverTimestamp();
  let changed = false;
  await db.runTransaction(async (transaction) => {
    const member = await transaction.get(memberRef);
    const business = await transaction.get(businessRef);
    assertMemberEdit(member, business, "business.settings.update");
    if (settingsUnchanged(business, input)) return;
    changed = true;
    const current = (business.get("settings") ?? {}) as Record<string, unknown>;
    transaction.update(businessRef, {
      timezone: input.timezone,
      currency: input.currency,
      language: input.language,
      settings: {
        bookingApprovalMode: current.bookingApprovalMode ?? "manual",
        notificationEmail: emptyToNull(input.notificationEmail),
        publicProfileEnabled: current.publicProfileEnabled === true,
      },
      updatedBy: uid,
      updatedAt: now,
    });
    transaction.set(auditRef, {
      id: auditRef.id,
      scope: "business",
      businessId,
      actorId: uid,
      actorType: "user",
      action: "business.settings.update",
      targetType: "business",
      targetId: businessId,
      summary: "Updated business settings.",
      metadata: {
        timezone: input.timezone,
        currency: input.currency,
        language: input.language,
      },
      createdAt: now,
    });
  });
  return { ok: true, changed };
}

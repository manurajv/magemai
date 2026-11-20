import { getAuth } from "firebase-admin/auth";
import { FieldValue, Timestamp, getFirestore } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import {
  COVER_MAX_BYTES,
  CREATIONS_PER_DAY,
  CREATION_WINDOW_MS,
  LOGO_MAX_BYTES,
  OWNER_MEMBERSHIP_CAP,
} from "../../shared/business/limits.js";
import { isReservedSlug } from "../../shared/business/slug.js";
import { isAvatarContentType } from "../../shared/profile/limits.js";
import {
  businessInputSchema,
  businessSettingsError,
  emptyToNull,
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
) {
  if (!requestAuth) {
    throw new HttpsError("unauthenticated", "Sign in before continuing.");
  }
  if (requestAuth.token.email_verified !== true) {
    throw new HttpsError("permission-denied", "Verify your email before creating a business.");
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

export const checkSlugAvailability = onCall(async (request) => {
  const uid = requireVerifiedUser(request.auth);
  await assertAccountActive(uid);
  const parsed = businessInputSchema.shape.slug.safeParse(request.data?.slug);
  if (!parsed.success) return { available: false };
  const settings = await loadSettings();
  if (isReservedSlug(parsed.data, settings.reservedSlugs)) return { available: false };
  const existing = await getFirestore().doc(`businessSlugs/${parsed.data}`).get();
  return { available: !existing.exists };
});

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

export const createBusiness = onCall(async (request) => {
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
});

export const setBusinessImage = onCall(async (request) => {
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
});

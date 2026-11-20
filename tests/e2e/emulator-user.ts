import { getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import type { APIRequestContext } from "@playwright/test";
import { platformDefaults } from "../../shared/platform/defaults.ts";

process.env.METADATA_SERVER_DETECTION ??= "none";

function emulatorApp(refusal: string): App {
  const projectId =
    process.env.GCLOUD_PROJECT ?? process.env.GOOGLE_CLOUD_PROJECT ?? "demo-magemai";
  if (projectId === "magemai") throw new Error(refusal);
  return getApps()[0] ?? initializeApp({ projectId });
}

function adminAuth() {
  return getAuth(emulatorApp("Refusing to create an emulator user for the live project."));
}

export async function seedPlatformSettings() {
  const db = getFirestore(
    emulatorApp(
      "Refusing to seed platform settings for the live project from the emulator helper.",
    ),
  );
  await db
    .doc("platformSettings/global")
    .set({ ...platformDefaults, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
}

export async function seedMembership(input: {
  uid: string;
  email: string;
  businessId: string;
  name: string;
  slug: string;
  role?: "owner" | "admin" | "manager" | "staff";
  status?: "active" | "suspended";
  createdAtMs?: number;
}) {
  const db = getFirestore(emulatorApp("Refusing to seed a live business."));
  const role = input.role ?? "owner";
  const createdAt = new Date(input.createdAtMs ?? Date.now());
  await db.doc(`users/${input.uid}`).set(
    {
      id: input.uid,
      email: input.email,
      emailVerified: true,
      displayName: "Member",
      phoneNumber: null,
      photoPath: null,
      locale: "en",
      status: "active",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      lastLoginAt: null,
    },
    { merge: true },
  );
  await db.doc(`businesses/${input.businessId}`).set({
    id: input.businessId,
    name: input.name,
    slug: input.slug,
    categoryId: "photography",
    description: "Portraits",
    contact: { email: "studio@example.test", phone: null, website: null },
    address: {
      line1: "1 Galle Road",
      line2: null,
      city: "Colombo",
      region: null,
      postalCode: null,
      country: "LK",
    },
    timezone: "Asia/Colombo",
    currency: "LKR",
    language: "en",
    status: input.status ?? "active",
    verificationStatus: "unverified",
    ownerId: input.uid,
    settings: {
      bookingApprovalMode: "manual",
      notificationEmail: null,
      publicProfileEnabled: false,
    },
    logoPath: null,
    coverImagePath: null,
    createdBy: input.uid,
    updatedBy: input.uid,
    createdAt,
    updatedAt: createdAt,
  });
  await db.doc(`businessMembers/${input.businessId}_${input.uid}`).set({
    id: `${input.businessId}_${input.uid}`,
    businessId: input.businessId,
    userId: input.uid,
    role,
    status: "active",
    createdBy: input.uid,
    revokedAt: null,
    revokedBy: null,
    createdAt,
    updatedAt: createdAt,
  });
  await db.doc(`businessSlugs/${input.slug}`).set({
    slug: input.slug,
    businessId: input.businessId,
    createdAt,
  });
}

export async function grantPlatformAdmin(uid: string, email: string) {
  const app = emulatorApp("Refusing to grant platform access on the live project.");
  await getAuth(app).setCustomUserClaims(uid, { superAdmin: true });
  const db = getFirestore(app);
  await db.doc(`users/${uid}`).set(
    {
      id: uid,
      email,
      emailVerified: true,
      displayName: "Platform admin",
      phoneNumber: null,
      photoPath: null,
      locale: "en",
      status: "active",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      lastLoginAt: null,
    },
    { merge: true },
  );
  await db.doc(`platformAdmins/${uid}`).set({
    id: uid,
    status: "active",
    grantedBy: "emulator-test",
    grantedAt: FieldValue.serverTimestamp(),
    revokedBy: null,
    revokedAt: null,
    reason: null,
  });
}

export async function revokePlatformRegistry(uid: string) {
  const db = getFirestore(emulatorApp("Refusing to revoke platform access on the live project."));
  await db.doc(`platformAdmins/${uid}`).set(
    {
      status: "revoked",
      revokedBy: "emulator-test",
      revokedAt: FieldValue.serverTimestamp(),
      reason: "emulator revocation",
    },
    { merge: true },
  );
}

export async function ensureVerifiedUser(email: string, password: string, displayName: string) {
  const auth = adminAuth();
  try {
    const existing = await auth.getUserByEmail(email);
    await auth.updateUser(existing.uid, { emailVerified: true, password, displayName });
    return existing.uid;
  } catch (error) {
    const code =
      typeof error === "object" && error !== null && "code" in error ? String(error.code) : "";
    if (code !== "auth/user-not-found") throw error;
    const created = await auth.createUser({ email, password, displayName, emailVerified: true });
    return created.uid;
  }
}

type OobCode = { email?: string; oobCode?: string; requestType?: string };

export async function latestOob(request: APIRequestContext, email: string, requestType: string) {
  const projectId = process.env.GCLOUD_PROJECT ?? "demo-magemai";
  let lastBody = "";
  for (let attempt = 0; attempt < 15; attempt += 1) {
    const response = await request.get(
      `http://127.0.0.1:9099/emulator/v1/projects/${projectId}/oobCodes`,
    );
    lastBody = await response.text();
    const parsed = JSON.parse(lastBody) as { oobCodes?: OobCode[] };
    const match = [...(parsed.oobCodes ?? [])]
      .reverse()
      .find((code) => code.email === email && code.requestType === requestType && code.oobCode);
    if (match?.oobCode) return match.oobCode;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`No ${requestType} code for ${email}. Last response: ${lastBody}`);
}

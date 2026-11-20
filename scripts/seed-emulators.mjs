/**
 * Synthetic emulator seed for project demo-magemai only.
 * Writes the users, businesses, memberships, platform admin, and platform
 * settings from architecture section 24.9. It does not create the pilot business.
 */
import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { platformDefaults } from "../shared/platform/defaults.ts";

const DEMO_PROJECT_ID = "demo-magemai";
const PASSWORD = "emupass-not-for-live";
const PILOT_NAME = "beyond gravity";

const USERS = [
  { email: "owner.a@example.test", displayName: "Owner A", claims: {}, emailVerified: true },
  { email: "owner.b@example.test", displayName: "Owner B", claims: {}, emailVerified: true },
  { email: "staff.a@example.test", displayName: "Staff A", claims: {}, emailVerified: true },
  {
    email: "platform.admin@example.test",
    displayName: "Platform Admin",
    claims: { superAdmin: true },
    emailVerified: true,
  },
  {
    email: "unverified.a@example.test",
    displayName: "Unverified A",
    claims: {},
    emailVerified: false,
  },
];

const BUSINESSES = [
  {
    slug: "test-studio-a",
    name: "Test Studio A",
    ownerEmail: "owner.a@example.test",
    staffEmail: "staff.a@example.test",
  },
  {
    slug: "test-studio-b",
    name: "Test Studio B",
    ownerEmail: "owner.b@example.test",
    staffEmail: null,
  },
];

function fail(message) {
  console.error(message);
  process.exit(1);
}

function assertLocalProject() {
  const projectId = process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || "";
  if (projectId !== DEMO_PROJECT_ID) {
    fail(
      `Refusing to seed project "${projectId || "(unset)"}". Only ${DEMO_PROJECT_ID} is allowed.`,
    );
  }
  for (const name of ["FIREBASE_AUTH_EMULATOR_HOST", "FIRESTORE_EMULATOR_HOST"]) {
    const value = process.env[name] ?? "";
    if (!value.startsWith("127.0.0.1") && !value.startsWith("localhost")) {
      fail(`${name} must be a local emulator before seeding. Received "${value}".`);
    }
  }
  if (process.env.VITE_ALLOW_LIVE_FIREBASE === "true") {
    fail("Refusing to seed while VITE_ALLOW_LIVE_FIREBASE is true.");
  }
}

function assertSynthetic(value) {
  if (value.toLowerCase().includes(PILOT_NAME)) {
    fail("Refusing to seed the pilot business.");
  }
}

function errorCode(error) {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
  ) {
    return error.code;
  }
  return "";
}

async function ensureUser(auth, db, user) {
  assertSynthetic(user.email);
  assertSynthetic(user.displayName);
  let record;
  try {
    record = await auth.getUserByEmail(user.email);
  } catch (error) {
    if (errorCode(error) !== "auth/user-not-found") throw error;
    record = await auth.createUser({
      email: user.email,
      password: PASSWORD,
      displayName: user.displayName,
      emailVerified: user.emailVerified,
    });
  }
  await auth.updateUser(record.uid, {
    emailVerified: user.emailVerified,
    displayName: user.displayName,
  });
  await auth.setCustomUserClaims(record.uid, user.claims);
  const ref = db.doc(`users/${record.uid}`);
  const existing = await ref.get();
  if (!existing.exists) {
    await ref.set({
      id: record.uid,
      email: user.email,
      emailVerified: user.emailVerified,
      displayName: user.displayName,
      phoneNumber: null,
      photoPath: null,
      locale: "en",
      status: "active",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      lastLoginAt: null,
    });
  } else {
    await ref.set({ emailVerified: user.emailVerified }, { merge: true });
  }
  return record.uid;
}

function businessPayload(id, business, ownerId) {
  return {
    id,
    name: business.name,
    slug: business.slug,
    categoryId: "other",
    description: "Synthetic business used only inside the Firebase emulators.",
    contact: { email: business.ownerEmail, phone: null, website: null },
    address: {
      line1: "1 Test Lane",
      line2: null,
      city: "Colombo",
      region: "Western",
      postalCode: "00100",
      country: "LK",
    },
    timezone: "Asia/Colombo",
    currency: "LKR",
    language: "en",
    logoPath: null,
    coverImagePath: null,
    status: "active",
    verificationStatus: "unverified",
    ownerId,
    settings: {
      bookingApprovalMode: "manual",
      notificationEmail: null,
      publicProfileEnabled: false,
    },
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    createdBy: ownerId,
  };
}

async function ensureMembership(db, businessId, userId, role) {
  const id = `${businessId}_${userId}`;
  const ref = db.doc(`businessMembers/${id}`);
  const existing = await ref.get();
  if (existing.exists) return;
  await ref.set({
    id,
    businessId,
    userId,
    role,
    status: "active",
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    createdBy: "system",
    revokedAt: null,
    revokedBy: null,
  });
}

async function ensureBusiness(db, business, uids) {
  assertSynthetic(business.name);
  assertSynthetic(business.slug);
  const ownerId = uids.get(business.ownerEmail);
  if (!ownerId) fail(`Missing owner uid for ${business.ownerEmail}.`);
  const slugRef = db.doc(`businessSlugs/${business.slug}`);
  const slugSnap = await slugRef.get();
  let businessId;
  if (slugSnap.exists) {
    businessId = slugSnap.get("businessId");
    if (typeof businessId !== "string" || !businessId)
      fail(`Slug ${business.slug} has no businessId.`);
  } else {
    const ref = db.collection("businesses").doc();
    businessId = ref.id;
    await ref.set(businessPayload(businessId, business, ownerId));
    await slugRef.set({
      slug: business.slug,
      businessId,
      createdAt: FieldValue.serverTimestamp(),
    });
  }
  await ensureMembership(db, businessId, ownerId, "owner");
  if (business.staffEmail) {
    const staffId = uids.get(business.staffEmail);
    if (!staffId) fail(`Missing staff uid for ${business.staffEmail}.`);
    await ensureMembership(db, businessId, staffId, "staff");
  }
}

async function main() {
  assertLocalProject();
  process.env.METADATA_SERVER_DETECTION = "none";
  const app = initializeApp({ projectId: DEMO_PROJECT_ID });
  const auth = getAuth(app);
  const db = getFirestore(app);
  const uids = new Map();
  for (const user of USERS) {
    uids.set(user.email, await ensureUser(auth, db, user));
  }
  for (const business of BUSINESSES) {
    await ensureBusiness(db, business, uids);
  }
  const adminUid = uids.get("platform.admin@example.test");
  if (!adminUid) fail("Missing platform admin uid.");
  const adminRef = db.doc(`platformAdmins/${adminUid}`);
  if (!(await adminRef.get()).exists) {
    await adminRef.set({
      id: adminUid,
      status: "active",
      grantedBy: "emulator-seed",
      grantedAt: FieldValue.serverTimestamp(),
      revokedBy: null,
      revokedAt: null,
      reason: null,
    });
  }
  await db.doc("platformSettings/global").set(
    {
      ...platformDefaults,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
  await db.doc("auditLogs/seed-platform-settings").set({
    id: "seed-platform-settings",
    scope: "platform",
    businessId: null,
    actorId: "system",
    actorType: "system",
    action: "platform_settings.seed",
    targetType: "platformSettings",
    targetId: "global",
    summary: "Seeded synthetic platform settings in the emulator.",
    metadata: {},
    createdAt: FieldValue.serverTimestamp(),
  });
  const listed = await auth.listUsers();
  const emails = listed.users.map((user) => user.email).sort();
  console.log(`Seeded synthetic emulator data for demo-magemai: ${emails.join(", ")}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

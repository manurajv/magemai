import { readFileSync } from "node:fs";
import { getApps, initializeApp as initializeAdmin } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type Firestore,
} from "firebase/firestore";
import { getBytes, ref, uploadString, type FirebaseStorage } from "firebase/storage";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { emulatorBucketName } from "../../shared/firebase/bucket.ts";
import { clearDownloadToken } from "../../functions/src/storage.ts";

const projectId = process.env.GCLOUD_PROJECT ?? process.env.GOOGLE_CLOUD_PROJECT ?? "demo-magemai";
const ONE_PIXEL_PNG =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

function splitHost(value: string | undefined, fallbackHost: string, fallbackPort: number) {
  const raw = value && value.length > 0 ? value : `${fallbackHost}:${fallbackPort}`;
  const separator = raw.lastIndexOf(":");
  return { host: raw.slice(0, separator), port: Number(raw.slice(separator + 1)) };
}

describe("phase 1 security matrix", () => {
  let testEnv: RulesTestEnvironment;

  beforeAll(async () => {
    if (projectId === "magemai") throw new Error("Rules tests must not use the live project.");
    const firestore = splitHost(process.env.FIRESTORE_EMULATOR_HOST, "127.0.0.1", 8080);
    const storage = splitHost(process.env.FIREBASE_STORAGE_EMULATOR_HOST, "127.0.0.1", 9199);
    testEnv = await initializeTestEnvironment({
      projectId,
      firestore: {
        host: firestore.host,
        port: firestore.port,
        rules: readFileSync("firestore.rules", "utf8"),
      },
      storage: {
        host: storage.host,
        port: storage.port,
        rules: readFileSync("storage.rules", "utf8"),
      },
    });
    await testEnv.clearFirestore();
    await testEnv.clearStorage();
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore() as unknown as Firestore;
      await setDoc(doc(db, "users/alice"), profile("alice"));
      await setDoc(doc(db, "users/bob"), profile("bob"));
      await setDoc(doc(db, "users/pat"), profile("pat"));
      await setDoc(doc(db, "businesses/studio-a"), business("studio-a", "active"));
      await setDoc(doc(db, "businesses/studio-b"), business("studio-b", "active"));
      await setDoc(
        doc(db, "businesses/studio-suspended"),
        business("studio-suspended", "suspended"),
      );
      await setMember(db, "studio-a", "alice", "owner");
      await setMember(db, "studio-a", "maya", "manager");
      await setMember(db, "studio-a", "ada", "admin");
      await setMember(db, "studio-a", "sam", "staff");
      await setMember(db, "studio-a", "rene", "owner", "revoked");
      await setMember(db, "studio-b", "bob", "owner");
      await setMember(db, "studio-suspended", "owen", "owner");
      await setDoc(doc(db, "auditLogs/audit-a"), {
        id: "audit-a",
        scope: "business",
        businessId: "studio-a",
        action: "business.create",
      });
      await setDoc(doc(db, "auditLogs/audit-b"), {
        id: "audit-b",
        scope: "business",
        businessId: "studio-b",
        action: "business.create",
      });
      await setDoc(doc(db, "auditLogs/audit-platform"), {
        id: "audit-platform",
        scope: "platform",
        businessId: null,
        action: "business.status.update",
      });
      await setDoc(doc(db, "platformSettings/global"), { id: "global", defaultCountry: "LK" });
      await setDoc(doc(db, "platformSettings/secret"), { id: "secret", note: "hidden" });
      await setDoc(doc(db, "platformAdmins/sage"), { id: "sage", status: "active" });
      await setDoc(doc(db, "platformAdmins/rory"), { id: "rory", status: "revoked" });
      await setDoc(doc(db, "businessSlugs/studio-a"), {
        slug: "studio-a",
        businessId: "studio-a",
      });
    });
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  function db(uid: string, claims?: Record<string, unknown>) {
    return testEnv
      .authenticatedContext(uid, {
        email: `${uid}@example.test`,
        email_verified: true,
        ...claims,
      })
      .firestore() as unknown as Firestore;
  }

  function storage(uid: string, claims?: Record<string, unknown>) {
    return testEnv
      .authenticatedContext(uid, {
        email: `${uid}@example.test`,
        email_verified: true,
        ...claims,
      })
      .storage() as unknown as FirebaseStorage;
  }

  const anonDb = () => testEnv.unauthenticatedContext().firestore() as unknown as Firestore;
  const anonStorage = () =>
    testEnv.unauthenticatedContext().storage() as unknown as FirebaseStorage;

  it("XT-1 denies a member of A from reading business B and allows their own", async () => {
    await assertSucceeds(getDoc(doc(db("alice"), "businesses/studio-a")));
    await assertFails(getDoc(doc(db("alice"), "businesses/studio-b")));
  });

  it("XT-2 denies a member of A from reading B's membership", async () => {
    await assertFails(getDoc(doc(db("alice"), "businessMembers/studio-b_bob")));
    await assertSucceeds(getDoc(doc(db("alice"), "businessMembers/studio-a_alice")));
  });

  it("XT-3 denies a member of A from listing B's audit logs", async () => {
    await assertFails(getDocs(auditQuery(db("alice"), "studio-b")));
  });

  it("XT-4 and XT-5 deny a member of A from reading or writing B's logo", async () => {
    await assertSucceeds(
      uploadString(ref(storage("bob"), "businesses/studio-b/brand/logo"), ONE_PIXEL_PNG, "base64", {
        contentType: "image/png",
      }),
    );
    await assertFails(getBytes(ref(storage("alice"), "businesses/studio-b/brand/logo")));
    await assertFails(
      uploadString(
        ref(storage("alice"), "businesses/studio-b/brand/logo"),
        ONE_PIXEL_PNG,
        "base64",
        { contentType: "image/png" },
      ),
    );
  });

  it("XT-6, XT-7, and XT-8 deny client writes of businesses, memberships, and audit logs", async () => {
    const alice = db("alice");
    await assertFails(setDoc(doc(alice, "businesses/studio-a"), { name: "Renamed" }));
    await assertFails(updateDoc(doc(alice, "businesses/studio-a"), { status: "suspended" }));
    await assertFails(deleteDoc(doc(alice, "businesses/studio-a")));
    await assertFails(setDoc(doc(alice, "businessMembers/studio-a_sam"), { role: "owner" }));
    await assertFails(updateDoc(doc(alice, "businessMembers/studio-a_alice"), { role: "staff" }));
    await assertFails(setDoc(doc(alice, "auditLogs/forged"), { action: "business.create" }));
    await assertFails(deleteDoc(doc(alice, "auditLogs/audit-a")));
  });

  it("XT-9 denies status changes and unknown fields on the user document", async () => {
    const alice = db("alice");
    await assertFails(
      updateDoc(doc(alice, "users/alice"), { status: "disabled", updatedAt: serverTimestamp() }),
    );
    await assertFails(
      updateDoc(doc(alice, "users/alice"), { superAdmin: true, updatedAt: serverTimestamp() }),
    );
    await assertFails(
      updateDoc(doc(alice, "users/alice"), {
        email: "other@example.test",
        updatedAt: serverTimestamp(),
      }),
    );
    await assertFails(
      updateDoc(doc(alice, "users/alice"), {
        photoPath: "https://example.test/a",
        updatedAt: serverTimestamp(),
      }),
    );
    await assertFails(deleteDoc(doc(alice, "users/alice")));
  });

  it("XT-10 denies a user with no claim from reading another user or listing users", async () => {
    await assertFails(getDoc(doc(db("pat"), "users/alice")));
    await assertFails(getDocs(collection(db("pat"), "users")));
    await assertSucceeds(getDoc(doc(db("pat"), "users/pat")));
  });

  it("XT-12 denies staff from reading their business audit logs", async () => {
    await assertFails(getDoc(doc(db("sam"), "auditLogs/audit-a")));
    await assertFails(getDocs(auditQuery(db("sam"), "studio-a")));
  });

  it("XT-13 lets an owner read business audit logs and denies platform audit logs", async () => {
    await assertSucceeds(getDoc(doc(db("alice"), "auditLogs/audit-a")));
    await assertSucceeds(getDocs(auditQuery(db("alice"), "studio-a")));
    await assertFails(getDoc(doc(db("alice"), "auditLogs/audit-platform")));
    await assertSucceeds(getDoc(doc(db("ada"), "auditLogs/audit-a")));
    await assertFails(getDoc(doc(db("maya"), "auditLogs/audit-a")));
  });

  it("XT-14 lets an active platform admin read both businesses, users, and platform audit logs", async () => {
    const sage = db("sage", { superAdmin: true });
    await assertSucceeds(getDoc(doc(sage, "businesses/studio-a")));
    await assertSucceeds(getDoc(doc(sage, "businesses/studio-b")));
    await assertSucceeds(getDocs(collection(sage, "businesses")));
    await assertSucceeds(getDoc(doc(sage, "users/alice")));
    await assertSucceeds(getDocs(collection(sage, "users")));
    await assertSucceeds(getDoc(doc(sage, "auditLogs/audit-platform")));
    await assertSucceeds(getDocs(collection(sage, "auditLogs")));
  });

  it("XT-15 denies that admin's client SDK from writing audits, businesses, memberships, or the registry", async () => {
    const sage = db("sage", { superAdmin: true });
    await assertFails(setDoc(doc(sage, "auditLogs/forged"), { action: "x" }));
    await assertFails(updateDoc(doc(sage, "businesses/studio-a"), { status: "suspended" }));
    await assertFails(setDoc(doc(sage, "businessMembers/studio-a_sage"), { role: "owner" }));
    await assertFails(updateDoc(doc(sage, "platformAdmins/sage"), { status: "revoked" }));
    await assertFails(setDoc(doc(sage, "platformAdmins/pat"), { status: "active" }));
    await assertFails(updateDoc(doc(sage, "platformSettings/global"), { defaultCountry: "US" }));
  });

  it("XT-16 denies signed-out reads of protected documents and brand objects", async () => {
    const anon = anonDb();
    await assertFails(getDoc(doc(anon, "users/alice")));
    await assertFails(getDoc(doc(anon, "businesses/studio-a")));
    await assertFails(getDoc(doc(anon, "businessMembers/studio-a_alice")));
    await assertFails(getDoc(doc(anon, "platformSettings/global")));
    await assertFails(getDoc(doc(anon, "platformAdmins/sage")));
    await assertFails(getDoc(doc(anon, "auditLogs/audit-a")));
    await assertFails(getDoc(doc(anon, "businessSlugs/studio-a")));
    await assertFails(getBytes(ref(anonStorage(), "businesses/studio-b/brand/logo")));
    await assertFails(getBytes(ref(anonStorage(), "users/alice/avatar")));
  });

  it("XT-17 denies SVG, HEIC, GIF, and an oversize logo", async () => {
    const logo = ref(storage("alice"), "businesses/studio-a/brand/logo");
    await assertFails(
      uploadString(logo, "<svg xmlns='http://www.w3.org/2000/svg'/>", "raw", {
        contentType: "image/svg+xml",
      }),
    );
    await assertFails(uploadString(logo, "heic", "raw", { contentType: "image/heic" }));
    await assertFails(uploadString(logo, "gif", "raw", { contentType: "image/gif" }));
    await assertFails(
      uploadString(logo, "a".repeat(2 * 1024 * 1024 + 1), "raw", { contentType: "image/png" }),
    );
    await assertSucceeds(uploadString(logo, ONE_PIXEL_PNG, "base64", { contentType: "image/png" }));
  });

  it("XT-18 denies reads and writes under the private prefix", async () => {
    const secret = "businesses/studio-a/private/secret";
    await assertFails(
      uploadString(ref(storage("alice"), secret), ONE_PIXEL_PNG, "base64", {
        contentType: "image/png",
      }),
    );
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await uploadString(
        ref(context.storage() as unknown as FirebaseStorage, secret),
        "secret",
        "raw",
        {
          contentType: "text/plain",
        },
      );
    });
    await assertFails(getBytes(ref(storage("alice"), secret)));
    await assertFails(getBytes(ref(storage("sage", { superAdmin: true }), secret)));
  });

  it("lets a suspended business stay readable and rejects a new logo", async () => {
    await assertSucceeds(getDoc(doc(db("owen"), "businesses/studio-suspended")));
    await assertFails(updateDoc(doc(db("owen"), "businesses/studio-suspended"), { name: "Open" }));
    await assertFails(
      uploadString(
        ref(storage("owen"), "businesses/studio-suspended/brand/logo"),
        ONE_PIXEL_PNG,
        "base64",
        { contentType: "image/png" },
      ),
    );
  });

  it("denies a revoked membership and a claim with no registry document", async () => {
    await assertFails(getDoc(doc(db("rene"), "businesses/studio-a")));
    await assertSucceeds(getDoc(doc(db("rene"), "businessMembers/studio-a_rene")));
    const claimOnly = db("claim-only", { superAdmin: true });
    await assertFails(getDocs(collection(claimOnly, "users")));
    await assertFails(getDoc(doc(claimOnly, "businesses/studio-a")));
    await assertFails(getDoc(doc(db("rory", { superAdmin: true }), "users/alice")));
  });

  it("isolates member lists and allows a manager query pinned to their business", async () => {
    await assertSucceeds(
      getDocs(query(collection(db("alice"), "businessMembers"), where("userId", "==", "alice"))),
    );
    await assertFails(getDocs(collection(db("maya"), "businessMembers")));
    await assertSucceeds(
      getDocs(
        query(collection(db("maya"), "businessMembers"), where("businessId", "==", "studio-a")),
      ),
    );
    await assertFails(
      getDocs(
        query(collection(db("sam"), "businessMembers"), where("businessId", "==", "studio-a")),
      ),
    );
    await assertFails(
      getDocs(
        query(collection(db("maya"), "businessMembers"), where("businessId", "==", "studio-b")),
      ),
    );
    await assertFails(getDoc(doc(db("sam"), "businessMembers/studio-a_alice")));
    await assertSucceeds(getDoc(doc(db("maya"), "businessMembers/studio-a_sam")));
  });

  it("denies client access to slug locks and other platform settings", async () => {
    const alice = db("alice");
    await assertFails(getDoc(doc(alice, "businessSlugs/studio-a")));
    await assertFails(getDocs(collection(alice, "businessSlugs")));
    await assertFails(setDoc(doc(alice, "businessSlugs/new-slug"), { slug: "new-slug" }));
    await assertSucceeds(getDoc(doc(alice, "platformSettings/global")));
    await assertFails(getDoc(doc(alice, "platformSettings/secret")));
    await assertFails(getDocs(collection(alice, "platformSettings")));
    await assertSucceeds(getDoc(doc(db("sage", { superAdmin: true }), "platformSettings/secret")));
    await assertFails(getDoc(doc(alice, "customers/one")));
    await assertFails(
      uploadString(
        ref(storage("alice"), "businesses/studio-a/brand/extra"),
        ONE_PIXEL_PNG,
        "base64",
        {
          contentType: "image/png",
        },
      ),
    );
  });

  it("lets staff read a logo, lets a manager replace it, and denies a super-admin storage read", async () => {
    await assertSucceeds(getBytes(ref(storage("sam"), "businesses/studio-a/brand/logo")));
    await assertSucceeds(
      uploadString(
        ref(storage("maya"), "businesses/studio-a/brand/logo"),
        ONE_PIXEL_PNG,
        "base64",
        { contentType: "image/png" },
      ),
    );
    await assertFails(
      uploadString(ref(storage("sam"), "businesses/studio-a/brand/logo"), ONE_PIXEL_PNG, "base64", {
        contentType: "image/png",
      }),
    );
    await assertFails(
      getBytes(ref(storage("sage", { superAdmin: true }), "businesses/studio-a/brand/logo")),
    );
    const cover = ref(storage("alice"), "businesses/studio-a/brand/cover");
    await assertSucceeds(
      uploadString(cover, ONE_PIXEL_PNG, "base64", { contentType: "image/png" }),
    );
    await assertFails(
      uploadString(cover, "a".repeat(5 * 1024 * 1024 + 1), "raw", { contentType: "image/png" }),
    );
  });

  it("clears firebaseStorageDownloadTokens through the Admin SDK on the emulator", async () => {
    const avatar = ref(storage("alice"), "users/alice/avatar");
    await assertSucceeds(
      uploadString(avatar, ONE_PIXEL_PNG, "base64", { contentType: "image/png" }),
    );
    if (getApps().length === 0) initializeAdmin({ projectId });
    const bucket = getStorage().bucket(emulatorBucketName(projectId));
    const file = bucket.file("users/alice/avatar");
    await file.save(Buffer.from(ONE_PIXEL_PNG, "base64"), {
      metadata: {
        contentType: "image/png",
        metadata: { firebaseStorageDownloadTokens: "secret-token" },
      },
    });
    await clearDownloadToken(file);
    const [metadata] = await file.getMetadata();
    expect(metadata.metadata?.magemaiDownloadTokenStripped).toBe("true");
    // The emulator keeps this key. Production null deletes it. See docs/setup.md.
    expect(metadata.metadata?.firebaseStorageDownloadTokens).toBe("secret-token");
    await assertFails(getBytes(ref(anonStorage(), "users/alice/avatar")));
    await assertSucceeds(getBytes(ref(storage("bob"), "users/alice/avatar")));
  });
});

function profile(uid: string) {
  return {
    id: uid,
    email: `${uid}@example.test`,
    emailVerified: true,
    displayName: "Ada",
    phoneNumber: null,
    photoPath: null,
    locale: "en",
    status: "active",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    lastLoginAt: null,
  };
}

function business(id: string, status: "active" | "suspended") {
  return { id, name: id, status, ownerId: "seed" };
}

async function setMember(
  db: Firestore,
  businessId: string,
  userId: string,
  role: string,
  status = "active",
) {
  await setDoc(doc(db, "businessMembers", `${businessId}_${userId}`), {
    id: `${businessId}_${userId}`,
    businessId,
    userId,
    role,
    status,
  });
}

function auditQuery(db: Firestore, businessId: string) {
  return query(
    collection(db, "auditLogs"),
    where("scope", "==", "business"),
    where("businessId", "==", businessId),
  );
}

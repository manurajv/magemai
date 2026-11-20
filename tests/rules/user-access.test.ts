import { readFileSync } from "node:fs";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { initializeApp, deleteApp, type FirebaseApp } from "firebase/app";
import {
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  getAuth,
  getIdTokenResult,
  GoogleAuthProvider,
  signInWithCredential,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import {
  collection,
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

const projectId = process.env.GCLOUD_PROJECT ?? process.env.GOOGLE_CLOUD_PROJECT ?? "demo-magemai";

function splitHost(value: string | undefined, fallbackHost: string, fallbackPort: number) {
  const raw = value && value.length > 0 ? value : `${fallbackHost}:${fallbackPort}`;
  const separator = raw.lastIndexOf(":");
  return {
    host: raw.slice(0, separator),
    port: Number(raw.slice(separator + 1)),
  };
}

const ONE_PIXEL_PNG =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

function profile(uid: string, email: string, emailVerified: boolean) {
  return {
    id: uid,
    email,
    emailVerified,
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

describe("user profile rules", () => {
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
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  function alice() {
    return testEnv.authenticatedContext("alice", {
      email: "alice@example.test",
      email_verified: false,
    });
  }

  it("lets a person create and read their own profile, and update the allow-list", async () => {
    const context = alice();
    const db = context.firestore() as unknown as Firestore;
    await assertSucceeds(
      setDoc(doc(db, "users/alice"), profile("alice", "alice@example.test", false)),
    );
    await assertSucceeds(getDoc(doc(db, "users/alice")));
    await assertSucceeds(
      updateDoc(doc(db, "users/alice"), {
        displayName: "Ada Lovelace",
        phoneNumber: "+94771234567",
        locale: "en",
        updatedAt: serverTimestamp(),
      }),
    );
  });

  it("denies another person's profile, a list, an anonymous read, and a business document", async () => {
    const db = alice().firestore() as unknown as Firestore;
    await assertFails(getDoc(doc(db, "users/bob")));
    await assertFails(getDocs(collection(db, "users")));
    const anon = testEnv.unauthenticatedContext().firestore() as unknown as Firestore;
    await assertFails(getDoc(doc(anon, "users/alice")));
    await assertFails(getDoc(doc(db, "businesses/studio")));
  });

  it("lets an active platform admin read another profile and denies a revoked admin", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore() as unknown as Firestore;
      await setDoc(doc(db, "users/bob"), profile("bob", "bob@example.test", true));
      await setDoc(doc(db, "platformAdmins/admin"), { status: "active" });
      await setDoc(doc(db, "platformAdmins/revoked"), { status: "revoked" });
    });
    const admin = testEnv
      .authenticatedContext("admin", {
        email: "admin@example.test",
        email_verified: true,
        superAdmin: true,
      })
      .firestore() as unknown as Firestore;
    await assertSucceeds(getDoc(doc(admin, "users/bob")));
    const revoked = testEnv
      .authenticatedContext("revoked", {
        email: "revoked@example.test",
        email_verified: true,
        superAdmin: true,
      })
      .firestore() as unknown as Firestore;
    await assertFails(getDoc(doc(revoked, "users/bob")));
    await assertFails(getDocs(collection(revoked, "users")));
  });

  it("denies privileged fields and unknown keys on the client profile", async () => {
    const db = alice().firestore() as unknown as Firestore;
    await assertFails(
      updateDoc(doc(db, "users/alice"), {
        status: "disabled",
        updatedAt: serverTimestamp(),
      }),
    );
    await assertFails(
      updateDoc(doc(db, "users/alice"), {
        superAdmin: true,
        updatedAt: serverTimestamp(),
      }),
    );
    await assertFails(
      setDoc(doc(db, "users/alice"), {
        ...profile("alice", "alice@example.test", false),
        superAdmin: true,
      }),
    );
  });

  it("allows an avatar image for the owner, and denies the wrong type, an oversized file, and a cross-user write", async () => {
    const owner = alice().storage() as unknown as FirebaseStorage;
    const avatar = ref(owner, "users/alice/avatar");
    await assertSucceeds(
      uploadString(avatar, ONE_PIXEL_PNG, "base64", { contentType: "image/png" }),
    );
    const reader = testEnv
      .authenticatedContext("bob", { email: "bob@example.test", email_verified: true })
      .storage() as unknown as FirebaseStorage;
    await assertSucceeds(getBytes(ref(reader, "users/alice/avatar")));
    await assertFails(
      uploadString(ref(reader, "users/alice/avatar"), ONE_PIXEL_PNG, "base64", {
        contentType: "image/png",
      }),
    );
    await assertFails(
      uploadString(avatar, "<svg xmlns='http://www.w3.org/2000/svg'/>", "raw", {
        contentType: "image/svg+xml",
      }),
    );
    await assertFails(uploadString(avatar, "not-an-image", "raw", { contentType: "image/heic" }));
    await assertFails(
      uploadString(avatar, "a".repeat(2 * 1024 * 1024 + 1), "raw", { contentType: "image/png" }),
    );
    const stranger = testEnv.unauthenticatedContext().storage() as unknown as FirebaseStorage;
    await assertFails(getBytes(ref(stranger, "users/alice/avatar")));
    await assertFails(
      uploadString(ref(owner, "businesses/a/brand/logo"), ONE_PIXEL_PNG, "base64", {
        contentType: "image/png",
      }),
    );
  });

  it("lets an owner read the business and upload a logo, and denies everyone else", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore() as unknown as Firestore;
      await setDoc(doc(db, "platformSettings/global"), { id: "global", defaultCountry: "LK" });
      await setDoc(doc(db, "businesses/studio"), {
        id: "studio",
        ownerId: "owner",
        status: "active",
      });
      await setDoc(doc(db, "businessMembers/studio_owner"), {
        id: "studio_owner",
        businessId: "studio",
        userId: "owner",
        role: "owner",
        status: "active",
      });
      await setDoc(doc(db, "businessMembers/studio_staff"), {
        id: "studio_staff",
        businessId: "studio",
        userId: "staff",
        role: "staff",
        status: "active",
      });
    });
    const owner = testEnv
      .authenticatedContext("owner", { email: "owner@example.test", email_verified: true })
      .firestore() as unknown as Firestore;
    await assertSucceeds(getDoc(doc(owner, "businesses/studio")));
    await assertSucceeds(getDoc(doc(owner, "platformSettings/global")));
    await assertSucceeds(
      getDocs(query(collection(owner, "businessMembers"), where("userId", "==", "owner"))),
    );
    await assertFails(setDoc(doc(owner, "businesses/other"), { name: "Direct write" }));
    await assertFails(setDoc(doc(owner, "businessMembers/studio_owner"), { role: "staff" }));
    await assertFails(setDoc(doc(owner, "businessSlugs/studio"), { slug: "studio" }));
    await assertFails(setDoc(doc(owner, "auditLogs/one"), { action: "business.create" }));
    await assertFails(setDoc(doc(owner, "platformSettings/global"), { defaultCountry: "US" }));
    await assertFails(getDocs(collection(owner, "businessMembers")));
    const stranger = testEnv
      .authenticatedContext("stranger", { email: "stranger@example.test", email_verified: true })
      .firestore() as unknown as Firestore;
    await assertFails(getDoc(doc(stranger, "businesses/studio")));
    const anon = testEnv.unauthenticatedContext().firestore() as unknown as Firestore;
    await assertFails(getDoc(doc(anon, "platformSettings/global")));

    const ownerStorage = testEnv
      .authenticatedContext("owner", { email: "owner@example.test", email_verified: true })
      .storage() as unknown as FirebaseStorage;
    await assertSucceeds(
      uploadString(ref(ownerStorage, "businesses/studio/brand/logo"), ONE_PIXEL_PNG, "base64", {
        contentType: "image/png",
      }),
    );
    await assertSucceeds(
      uploadString(ref(ownerStorage, "businesses/studio/brand/cover"), ONE_PIXEL_PNG, "base64", {
        contentType: "image/png",
      }),
    );
    await assertFails(
      uploadString(
        ref(ownerStorage, "businesses/studio/brand/logo"),
        "a".repeat(2 * 1024 * 1024 + 1),
        "raw",
        {
          contentType: "image/png",
        },
      ),
    );
    await assertFails(
      uploadString(ref(ownerStorage, "businesses/studio/private/secret"), ONE_PIXEL_PNG, "base64", {
        contentType: "image/png",
      }),
    );
    const staffStorage = testEnv
      .authenticatedContext("staff", { email: "staff@example.test", email_verified: true })
      .storage() as unknown as FirebaseStorage;
    await assertFails(
      uploadString(ref(staffStorage, "businesses/studio/brand/logo"), ONE_PIXEL_PNG, "base64", {
        contentType: "image/png",
      }),
    );
    const publicStorage = testEnv.unauthenticatedContext().storage() as unknown as FirebaseStorage;
    await assertFails(getBytes(ref(publicStorage, "businesses/studio/brand/logo")));
  });
});

describe("registration claims", () => {
  let app: FirebaseApp;

  beforeAll(() => {
    app = initializeApp(
      {
        apiKey: "demo-api-key",
        authDomain: "demo-magemai.firebaseapp.com",
        projectId,
      },
      "rules-auth",
    );
    const auth = getAuth(app);
    connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  });

  afterAll(async () => {
    await deleteApp(app);
  });

  it("leaves a newly registered token without a superAdmin claim", async () => {
    const auth = getAuth(app);
    const email = `xt19-${Date.now()}@example.test`;
    const credential = await createUserWithEmailAndPassword(auth, email, "emupass-not-for-live");
    const token = await getIdTokenResult(credential.user);
    expect(token.claims.superAdmin).toBeUndefined();
    await signOut(auth);
  });

  it("does not link Google onto an existing password account", async () => {
    const auth = getAuth(app);
    const email = `split-${Date.now()}@example.test`;
    await createUserWithEmailAndPassword(auth, email, "emupass-not-for-live");
    await signOut(auth);
    const credential = GoogleAuthProvider.credential(
      JSON.stringify({ sub: `google-${email}`, email, email_verified: true }),
    );
    await expect(signInWithCredential(auth, credential)).rejects.toThrow(/already uses a password/);
    const passwordSignIn = await signInWithEmailAndPassword(auth, email, "emupass-not-for-live");
    expect(passwordSignIn.user.providerData.map((provider) => provider.providerId)).toEqual([
      "password",
    ]);
    await signOut(auth);
  });
});

import { getApps, initializeApp as initializeAdmin } from "firebase-admin/app";
import { getAuth as getAdminAuth } from "firebase-admin/auth";
import { FieldValue, Timestamp, getFirestore as getAdminFirestore } from "firebase-admin/firestore";
import { initializeApp, deleteApp, type FirebaseApp } from "firebase/app";
import { connectAuthEmulator, getAuth, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, getFirestore, setDoc, connectFirestoreEmulator } from "firebase/firestore";
import { connectFunctionsEmulator, getFunctions, httpsCallable } from "firebase/functions";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { platformDefaults } from "../../shared/platform/defaults.ts";

const projectId = process.env.GCLOUD_PROJECT ?? process.env.GOOGLE_CLOUD_PROJECT ?? "demo-magemai";

function payload(slug: string, extra: Record<string, unknown> = {}) {
  return {
    name: "Test Studio",
    slug,
    categoryId: "photography",
    description: "Portraits",
    contact: { email: "studio@example.test", phone: "", website: "" },
    address: {
      line1: "1 Galle Road",
      line2: "",
      city: "Colombo",
      region: "",
      postalCode: "",
      country: "LK",
    },
    timezone: "Asia/Colombo",
    currency: "LKR",
    language: "en",
    ...extra,
  };
}

describe("business onboarding callables", () => {
  let app: FirebaseApp;

  beforeAll(async () => {
    if (projectId === "magemai") throw new Error("Rules tests must not use the live project.");
    process.env.METADATA_SERVER_DETECTION ??= "none";
    if (getApps().length === 0) initializeAdmin({ projectId });
    await getAdminFirestore()
      .doc("platformSettings/global")
      .set({ ...platformDefaults, updatedAt: FieldValue.serverTimestamp() });
    app = initializeApp(
      {
        apiKey: "demo-api-key",
        authDomain: "demo-magemai.firebaseapp.com",
        projectId,
      },
      "business-onboarding",
    );
    const auth = getAuth(app);
    connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
    const db = getFirestore(app);
    connectFirestoreEmulator(db, "127.0.0.1", 8080);
    const functions = getFunctions(app, "asia-south1");
    connectFunctionsEmulator(functions, "127.0.0.1", 5001);
  });

  afterAll(async () => {
    await deleteApp(app);
  });

  async function signIn(email: string) {
    const password = "emupass-not-for-live";
    const adminAuth = getAdminAuth();
    let user;
    try {
      user = await adminAuth.getUserByEmail(email);
      await adminAuth.updateUser(user.uid, { emailVerified: true, password });
    } catch (error) {
      const code =
        typeof error === "object" && error !== null && "code" in error ? String(error.code) : "";
      if (code !== "auth/user-not-found") throw error;
      user = await adminAuth.createUser({
        email,
        password,
        emailVerified: true,
        displayName: "Owner",
      });
    }
    await getAdminFirestore().doc(`users/${user.uid}`).set(
      {
        id: user.uid,
        email,
        emailVerified: true,
        displayName: "Owner",
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
    const auth = getAuth(app);
    if (auth.currentUser) await signOut(auth);
    await signInWithEmailAndPassword(auth, email, password);
    return user.uid;
  }

  it("stores owner, active, and unverified even when the payload asks for more", async () => {
    const uid = await signIn(`xt20-${Date.now()}@example.test`);
    const slug = `xt20-${Date.now()}`;
    const call = httpsCallable(getFunctions(app, "asia-south1"), "createBusiness");
    const result = await call(
      payload(slug, {
        role: "staff",
        status: "suspended",
        ownerId: "someone-else",
        verificationStatus: "verified",
      }),
    );
    const data = result.data as { businessId: string; created: boolean };
    expect(data.created).toBe(true);
    const business = await getAdminFirestore().doc(`businesses/${data.businessId}`).get();
    expect(business.get("ownerId")).toBe(uid);
    expect(business.get("status")).toBe("active");
    expect(business.get("verificationStatus")).toBe("unverified");
    expect(business.get("role")).toBeUndefined();
    expect(business.get("settings.bookingApprovalMode")).toBe("manual");
    expect(business.get("settings.publicProfileEnabled")).toBe(false);
    const member = await getAdminFirestore().doc(`businessMembers/${data.businessId}_${uid}`).get();
    expect(member.get("role")).toBe("owner");
    expect(member.get("status")).toBe("active");
    const again = await call(payload(slug));
    expect((again.data as { businessId: string; created: boolean }).businessId).toBe(
      data.businessId,
    );
    expect((again.data as { created: boolean }).created).toBe(false);

    const other = await signIn(`xt20-other-${Date.now()}@example.test`);
    await expect(call(payload(slug))).rejects.toThrow(/already taken/);
    expect(other).toBeTruthy();

    const db = getFirestore(app);
    await expect(setDoc(doc(db, "businesses/direct"), { name: "No" })).rejects.toThrow();
  });

  it("reports slug availability without a business id", async () => {
    await signIn(`slug-${Date.now()}@example.test`);
    const call = httpsCallable(getFunctions(app, "asia-south1"), "checkSlugAvailability");
    const reserved = await call({ slug: "admin" });
    expect(reserved.data).toEqual({ available: false });
    const fresh = await call({ slug: `open-${Date.now()}` });
    expect(fresh.data).toEqual({ available: true });
  });

  it("stops at 10 creations in a day and 25 owner memberships", async () => {
    const uid = await signIn(`caps-${Date.now()}@example.test`);
    const db = getAdminFirestore();
    const now = Timestamp.now();
    for (let index = 0; index < 10; index += 1) {
      await db.collection("businesses").add({
        createdBy: uid,
        createdAt: now,
        name: `Cap ${index}`,
      });
    }
    const call = httpsCallable(getFunctions(app, "asia-south1"), "createBusiness");
    await expect(call(payload(`cap-${Date.now()}`))).rejects.toThrow(/10 businesses/);

    const owner = await signIn(`owners-${Date.now()}@example.test`);
    for (let index = 0; index < 25; index += 1) {
      await db.doc(`businessMembers/cap${index}_${owner}`).set({
        userId: owner,
        role: "owner",
        status: "active",
        businessId: `cap${index}`,
      });
    }
    await expect(call(payload(`owners-${Date.now()}`))).rejects.toThrow(/25 businesses/);
  });
});

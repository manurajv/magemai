import { getApps, initializeApp as initializeAdmin } from "firebase-admin/app";
import { getAuth as getAdminAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore as getAdminFirestore } from "firebase-admin/firestore";
import { initializeApp, deleteApp, type FirebaseApp } from "firebase/app";
import { connectAuthEmulator, getAuth, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { connectFirestoreEmulator, doc, getFirestore, setDoc } from "firebase/firestore";
import { connectFunctionsEmulator, getFunctions, httpsCallable } from "firebase/functions";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { platformDefaults } from "../../shared/platform/defaults.ts";

const projectId = process.env.GCLOUD_PROJECT ?? process.env.GOOGLE_CLOUD_PROJECT ?? "demo-magemai";

function profile(name: string) {
  return {
    name,
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
  };
}

describe("business dashboard callables", () => {
  let app: FirebaseApp;

  beforeAll(async () => {
    if (projectId === "magemai") throw new Error("Rules tests must not use the live project.");
    process.env.METADATA_SERVER_DETECTION ??= "none";
    if (getApps().length === 0) initializeAdmin({ projectId });
    await getAdminFirestore()
      .doc("platformSettings/global")
      .set({ ...platformDefaults, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    app = initializeApp(
      { apiKey: "demo-api-key", authDomain: "demo-magemai.firebaseapp.com", projectId },
      "business-dashboard",
    );
    connectAuthEmulator(getAuth(app), "http://127.0.0.1:9099", { disableWarnings: true });
    connectFirestoreEmulator(getFirestore(app), "127.0.0.1", 8080);
    connectFunctionsEmulator(getFunctions(app, "asia-south1"), "127.0.0.1", 5001);
  });

  afterAll(async () => {
    await deleteApp(app);
  });

  async function signIn(email: string, role: "owner" | "manager" | "staff", status = "active") {
    const password = "emupass-not-for-live";
    const adminAuth = getAdminAuth();
    const user = await adminAuth.createUser({
      email,
      password,
      emailVerified: true,
      displayName: "Member",
    });
    const db = getAdminFirestore();
    const businessId = `dash-${user.uid}`;
    await db.doc(`users/${user.uid}`).set({
      id: user.uid,
      email,
      emailVerified: true,
      displayName: "Member",
      phoneNumber: null,
      photoPath: null,
      locale: "en",
      status: "active",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      lastLoginAt: null,
    });
    await db.doc(`businesses/${businessId}`).set({
      id: businessId,
      name: "Dash Studio",
      slug: businessId,
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
      status,
      verificationStatus: "unverified",
      ownerId: user.uid,
      settings: {
        bookingApprovalMode: "manual",
        notificationEmail: null,
        publicProfileEnabled: false,
      },
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    await db.doc(`businessMembers/${businessId}_${user.uid}`).set({
      id: `${businessId}_${user.uid}`,
      businessId,
      userId: user.uid,
      role,
      status: "active",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    const auth = getAuth(app);
    if (auth.currentUser) await signOut(auth);
    await signInWithEmailAndPassword(auth, email, password);
    return { uid: user.uid, businessId };
  }

  it("lets an owner update the profile and ignores privileged fields", async () => {
    const { businessId } = await signIn(`owner-${Date.now()}@example.test`, "owner");
    const client = getFirestore(app);
    await expect(
      setDoc(doc(client, "businesses", businessId), { name: "Direct" }, { merge: true }),
    ).rejects.toThrow(/permission/i);
    const call = httpsCallable(getFunctions(app, "asia-south1"), "updateBusinessProfile");
    await call({
      businessId,
      ...profile("Renamed Studio"),
      status: "suspended",
      verificationStatus: "verified",
      ownerId: "someone-else",
    });
    const stored = await getAdminFirestore().doc(`businesses/${businessId}`).get();
    expect(stored.get("name")).toBe("Renamed Studio");
    expect(stored.get("status")).toBe("active");
    expect(stored.get("verificationStatus")).toBe("unverified");
    expect(stored.get("ownerId")).not.toBe("someone-else");
  });

  it("lets a manager edit the profile and denies settings", async () => {
    const { businessId } = await signIn(`manager-${Date.now()}@example.test`, "manager");
    const functions = getFunctions(app, "asia-south1");
    await httpsCallable(
      functions,
      "updateBusinessProfile",
    )({
      businessId,
      ...profile("Manager Edit"),
    });
    await expect(
      httpsCallable(
        functions,
        "updateBusinessSettings",
      )({
        businessId,
        timezone: "Asia/Colombo",
        currency: "USD",
        language: "en",
        notificationEmail: "",
      }),
    ).rejects.toThrow(/cannot change/i);
  });

  it("denies a staff profile edit and a suspended owner edit", async () => {
    const staff = await signIn(`staff-${Date.now()}@example.test`, "staff");
    await expect(
      httpsCallable(
        getFunctions(app, "asia-south1"),
        "updateBusinessProfile",
      )({ businessId: staff.businessId, ...profile("Nope") }),
    ).rejects.toThrow(/cannot change/i);
    await expect(
      httpsCallable(
        getFunctions(app, "asia-south1"),
        "updateBusinessSettings",
      )({
        businessId: staff.businessId,
        timezone: "Asia/Colombo",
        currency: "USD",
        language: "en",
        notificationEmail: "",
      }),
    ).rejects.toThrow(/cannot change/i);
    const suspended = await signIn(`suspended-${Date.now()}@example.test`, "owner", "suspended");
    await expect(
      httpsCallable(
        getFunctions(app, "asia-south1"),
        "updateBusinessProfile",
      )({ businessId: suspended.businessId, ...profile("Nope") }),
    ).rejects.toThrow(/suspended/i);
    await expect(
      httpsCallable(
        getFunctions(app, "asia-south1"),
        "setBusinessImage",
      )({ businessId: suspended.businessId, kind: "logo" }),
    ).rejects.toThrow(/suspended/i);
  });

  it("lets an owner save settings", async () => {
    const { businessId } = await signIn(`settings-${Date.now()}@example.test`, "owner");
    await httpsCallable(
      getFunctions(app, "asia-south1"),
      "updateBusinessSettings",
    )({
      businessId,
      timezone: "Asia/Colombo",
      currency: "USD",
      language: "en",
      notificationEmail: "desk@example.test",
    });
    const stored = await getAdminFirestore().doc(`businesses/${businessId}`).get();
    expect(stored.get("currency")).toBe("USD");
    expect(stored.get("settings").notificationEmail).toBe("desk@example.test");
    expect(stored.get("settings").publicProfileEnabled).toBe(false);
  });
});

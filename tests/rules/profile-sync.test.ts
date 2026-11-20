import { getApps, initializeApp as initializeAdmin } from "firebase-admin/app";
import { getAuth as getAdminAuth } from "firebase-admin/auth";
import { getFirestore as getAdminFirestore } from "firebase-admin/firestore";
import { initializeApp, deleteApp, type FirebaseApp } from "firebase/app";
import { connectAuthEmulator, getAuth, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { connectFirestoreEmulator, doc, getFirestore, setDoc } from "firebase/firestore";
import { connectFunctionsEmulator, getFunctions, httpsCallable } from "firebase/functions";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const projectId = process.env.GCLOUD_PROJECT ?? process.env.GOOGLE_CLOUD_PROJECT ?? "demo-magemai";

describe("syncAuthProfile", () => {
  let app: FirebaseApp;

  beforeAll(() => {
    if (projectId === "magemai") throw new Error("Rules tests must not use the live project.");
    process.env.METADATA_SERVER_DETECTION ??= "none";
    if (getApps().length === 0) initializeAdmin({ projectId });
    app = initializeApp(
      {
        apiKey: "demo-api-key",
        authDomain: "demo-magemai.firebaseapp.com",
        projectId,
      },
      "profile-sync",
    );
    const auth = getAuth(app);
    connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
    connectFirestoreEmulator(getFirestore(app), "127.0.0.1", 8080);
    connectFunctionsEmulator(getFunctions(app, "asia-south1"), "127.0.0.1", 5001);
  });

  afterAll(async () => {
    await deleteApp(app);
  });

  it("creates the profile from Auth, then keeps owner fields on a second call", async () => {
    const email = `sync-${Date.now()}@example.test`;
    const password = "emupass-not-for-live";
    const adminAuth = getAdminAuth();
    const created = await adminAuth.createUser({ email, password, emailVerified: false });
    const auth = getAuth(app);
    if (auth.currentUser) await signOut(auth);
    await signInWithEmailAndPassword(auth, email, password);

    const db = getFirestore(app);
    await expect(
      setDoc(doc(db, "users", created.uid), {
        id: created.uid,
        email,
        emailVerified: true,
        displayName: "Client",
        phoneNumber: null,
        photoPath: null,
        locale: "en",
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null,
      }),
    ).rejects.toThrow(/permission/i);

    const sync = httpsCallable(getFunctions(app, "asia-south1"), "syncAuthProfile");
    await sync();
    const ref = getAdminFirestore().doc(`users/${created.uid}`);
    const first = await ref.get();
    expect(first.get("status")).toBe("active");
    expect(first.get("email")).toBe(email);
    expect(first.get("emailVerified")).toBe(false);
    expect(first.get("displayName")).toBe("");
    expect(first.get("photoPath")).toBeNull();
    expect(first.get("superAdmin")).toBeUndefined();

    await adminAuth.updateUser(created.uid, { displayName: "Ada", emailVerified: true });
    await ref.update({ displayName: "Custom", phoneNumber: "+94771234567" });
    await sync();
    const second = await ref.get();
    expect(second.get("displayName")).toBe("Custom");
    expect(second.get("phoneNumber")).toBe("+94771234567");
    expect(second.get("emailVerified")).toBe(true);
    expect(second.get("status")).toBe("active");

    await ref.update({ displayName: "Member" });
    await sync();
    const filled = await ref.get();
    expect(filled.get("displayName")).toBe("Ada");
    expect(filled.get("phoneNumber")).toBe("+94771234567");
    await signOut(auth);
  });
});

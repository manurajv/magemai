import { readFileSync } from "node:fs";
import { getApps, initializeApp as initializeAdmin } from "firebase-admin/app";
import { getAuth as getAdminAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore as getAdminFirestore } from "firebase-admin/firestore";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { initializeApp, deleteApp, type FirebaseApp } from "firebase/app";
import { connectAuthEmulator, getAuth, signInWithEmailAndPassword, signOut } from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  type Firestore,
} from "firebase/firestore";
import { connectFunctionsEmulator, getFunctions, httpsCallable } from "firebase/functions";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  createAdminStore,
  grantSuperAdmin,
  revokeSuperAdmin,
} from "../../scripts/super-admin-provision.ts";

const projectId = process.env.GCLOUD_PROJECT ?? process.env.GOOGLE_CLOUD_PROJECT ?? "demo-magemai";

function splitHost(value: string | undefined, fallbackHost: string, fallbackPort: number) {
  const raw = value && value.length > 0 ? value : `${fallbackHost}:${fallbackPort}`;
  const separator = raw.lastIndexOf(":");
  return { host: raw.slice(0, separator), port: Number(raw.slice(separator + 1)) };
}

describe("platform admin rules XT-21 through XT-25", () => {
  let testEnv: RulesTestEnvironment;

  beforeAll(async () => {
    if (projectId === "magemai") throw new Error("Rules tests must not use the live project.");
    const firestore = splitHost(process.env.FIRESTORE_EMULATOR_HOST, "127.0.0.1", 8080);
    testEnv = await initializeTestEnvironment({
      projectId,
      firestore: {
        host: firestore.host,
        port: firestore.port,
        rules: readFileSync("firestore.rules", "utf8"),
      },
    });
    await testEnv.clearFirestore();
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore() as unknown as Firestore;
      await setDoc(doc(db, "users", "person"), { id: "person", email: "person@example.test" });
      await setDoc(doc(db, "users", "admin"), { id: "admin", email: "admin@example.test" });
      await setDoc(doc(db, "businesses", "studio"), {
        id: "studio",
        name: "Studio",
        status: "active",
      });
      await setDoc(doc(db, "auditLogs", "platform-log"), {
        id: "platform-log",
        scope: "platform",
        businessId: null,
        action: "super_admin.provision",
      });
      await setDoc(doc(db, "platformAdmins", "admin"), {
        id: "admin",
        status: "active",
        grantedBy: "test",
        revokedBy: null,
        revokedAt: null,
        reason: null,
      });
      await setDoc(doc(db, "platformAdmins", "revoked"), {
        id: "revoked",
        status: "revoked",
        grantedBy: "test",
        revokedBy: "test",
        reason: "ended",
      });
    });
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  function dbFor(uid: string, superAdmin = false) {
    return testEnv
      .authenticatedContext(uid, {
        email: `${uid}@example.test`,
        email_verified: true,
        ...(superAdmin ? { superAdmin: true } : {}),
      })
      .firestore() as unknown as Firestore;
  }

  it("XT-21 lets an active super-admin read users, businesses, and platform audit logs", async () => {
    const admin = dbFor("admin", true);
    await assertSucceeds(getDoc(doc(admin, "users/person")));
    await assertSucceeds(getDocs(collection(admin, "users")));
    await assertSucceeds(getDoc(doc(admin, "businesses/studio")));
    await assertSucceeds(getDocs(collection(admin, "businesses")));
    await assertSucceeds(getDoc(doc(admin, "auditLogs/platform-log")));
    await assertSucceeds(getDocs(collection(admin, "auditLogs")));
  });

  it("XT-22 denies a normal user those platform reads and another admin record", async () => {
    const person = dbFor("person");
    await assertFails(getDoc(doc(person, "users/admin")));
    await assertFails(getDocs(collection(person, "users")));
    await assertFails(getDocs(collection(person, "businesses")));
    await assertFails(getDoc(doc(person, "auditLogs/platform-log")));
    await assertFails(getDoc(doc(person, "platformAdmins/admin")));
  });

  it("XT-23 denies a revoked admin whose token has no superAdmin claim", async () => {
    const revoked = dbFor("revoked", false);
    await assertFails(getDocs(collection(revoked, "users")));
    await assertFails(getDocs(collection(revoked, "businesses")));
    await assertFails(getDoc(doc(revoked, "auditLogs/platform-log")));
  });

  it("XT-24 denies a revoked admin whose token still has superAdmin", async () => {
    const stale = dbFor("revoked", true);
    await assertFails(getDocs(collection(stale, "users")));
    await assertFails(getDocs(collection(stale, "businesses")));
    await assertFails(getDoc(doc(stale, "auditLogs/platform-log")));
    await assertFails(getDocs(collection(stale, "platformAdmins")));
  });

  it("XT-25 denies client writes to platformAdmins from a normal user and an active admin", async () => {
    const person = dbFor("person");
    const admin = dbFor("admin", true);
    await assertFails(
      setDoc(doc(person, "platformAdmins/person"), { id: "person", status: "active" }),
    );
    await assertFails(updateDoc(doc(admin, "platformAdmins/admin"), { status: "revoked" }));
    await assertFails(
      setDoc(doc(admin, "platformAdmins/newbie"), { id: "newbie", status: "active" }),
    );
  });
});

describe("platform admin callables", () => {
  let app: FirebaseApp;

  beforeAll(async () => {
    if (projectId === "magemai") throw new Error("Rules tests must not use the live project.");
    process.env.METADATA_SERVER_DETECTION ??= "none";
    if (getApps().length === 0) initializeAdmin({ projectId });
    app = initializeApp(
      { apiKey: "demo-api-key", authDomain: "demo-magemai.firebaseapp.com", projectId },
      "platform-admin",
    );
    connectAuthEmulator(getAuth(app), "http://127.0.0.1:9099", { disableWarnings: true });
    connectFunctionsEmulator(getFunctions(app, "asia-south1"), "127.0.0.1", 5001);
  });

  afterAll(async () => {
    await deleteApp(app);
  });

  async function signIn(email: string, claims: Record<string, unknown> | null) {
    const password = "emupass-not-for-live";
    const adminAuth = getAdminAuth();
    const user = await adminAuth.createUser({ email, password, emailVerified: true });
    if (claims) await adminAuth.setCustomUserClaims(user.uid, claims);
    const db = getAdminFirestore();
    await db.doc(`users/${user.uid}`).set({
      id: user.uid,
      email,
      emailVerified: true,
      displayName: "Admin",
      status: "active",
      locale: "en",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    const auth = getAuth(app);
    if (auth.currentUser) await signOut(auth);
    await signInWithEmailAndPassword(auth, email, password);
    return user.uid;
  }

  async function seedBusiness(ownerId: string) {
    const businessId = `biz-${ownerId}`;
    await getAdminFirestore().doc(`businesses/${businessId}`).set({
      id: businessId,
      name: "Callable Studio",
      slug: businessId,
      ownerId,
      status: "active",
      verificationStatus: "unverified",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    return businessId;
  }

  it("XT-21 authorizes setBusinessStatus and writes one audit, then ignores a no-op", async () => {
    const uid = await signIn(`sa-${Date.now()}@example.test`, { superAdmin: true });
    await getAdminFirestore().doc(`platformAdmins/${uid}`).set({
      id: uid,
      status: "active",
      grantedBy: "test",
      grantedAt: FieldValue.serverTimestamp(),
      revokedBy: null,
      revokedAt: null,
      reason: null,
    });
    const businessId = await seedBusiness(uid);
    const call = httpsCallable(getFunctions(app, "asia-south1"), "setBusinessStatus");
    const first = await call({ businessId, status: "suspended" });
    const data = first.data as { changed?: boolean; auditId?: string };
    expect(data.changed).toBe(true);
    const stored = await getAdminFirestore().doc(`businesses/${businessId}`).get();
    expect(stored.get("status")).toBe("suspended");
    const audit = await getAdminFirestore().doc(`auditLogs/${data.auditId}`).get();
    expect(audit.get("action")).toBe("business.status.update");
    expect(audit.get("actorType")).toBe("super_admin");
    expect(audit.get("metadata")).toEqual({ from: "active", to: "suspended" });
    const second = await call({ businessId, status: "suspended" });
    expect((second.data as { changed?: boolean }).changed).toBe(false);
    const logs = await getAdminFirestore()
      .collection("auditLogs")
      .where("targetId", "==", businessId)
      .get();
    expect(logs.size).toBe(1);
    const verify = httpsCallable(getFunctions(app, "asia-south1"), "setBusinessVerification");
    await verify({ businessId, verificationStatus: "pending" });
    expect(
      (await getAdminFirestore().doc(`businesses/${businessId}`).get()).get("verificationStatus"),
    ).toBe("pending");
  });

  it("XT-22 and XT-23 deny setBusinessStatus without an active registry", async () => {
    const person = await signIn(`person-${Date.now()}@example.test`, null);
    const businessId = await seedBusiness(person);
    const call = httpsCallable(getFunctions(app, "asia-south1"), "setBusinessStatus");
    await expect(call({ businessId, status: "suspended" })).rejects.toThrow(/platform access/i);

    const revoked = await signIn(`revoked-${Date.now()}@example.test`, null);
    await getAdminFirestore().doc(`platformAdmins/${revoked}`).set({
      id: revoked,
      status: "revoked",
      reason: "ended",
      revokedBy: "test",
      revokedAt: FieldValue.serverTimestamp(),
    });
    await expect(call({ businessId, status: "suspended" })).rejects.toThrow(/platform access/i);
  });

  it("XT-24 denies setBusinessStatus when the registry is revoked and the token still has the claim", async () => {
    const uid = await signIn(`stale-${Date.now()}@example.test`, { superAdmin: true });
    await getAdminFirestore().doc(`platformAdmins/${uid}`).set({
      id: uid,
      status: "revoked",
      reason: "ended",
      revokedBy: "test",
      revokedAt: FieldValue.serverTimestamp(),
    });
    const businessId = await seedBusiness(uid);
    await expect(
      httpsCallable(
        getFunctions(app, "asia-south1"),
        "setBusinessStatus",
      )({
        businessId,
        status: "suspended",
      }),
    ).rejects.toThrow(/platform access/i);
    const record = await getAdminAuth().getUser(uid);
    expect(record.customClaims?.superAdmin).toBe(true);
  });

  it("grants and revokes through the operator store on the emulator", async () => {
    const email = `script-${Date.now()}@example.test`;
    const store = createAdminStore();
    const granted = await grantSuperAdmin(store, {
      email,
      operatorEmail: "emulator-operator",
    });
    const registry = await getAdminFirestore().doc(`platformAdmins/${granted.uid}`).get();
    expect(registry.get("status")).toBe("active");
    expect((await getAdminAuth().getUser(granted.uid)).customClaims?.superAdmin).toBe(true);
    const profile = await getAdminFirestore().doc(`users/${granted.uid}`).get();
    expect(profile.get("superAdmin")).toBeUndefined();
    const grantedAt = registry.get("grantedAt");
    const again = await grantSuperAdmin(store, { email, operatorEmail: "emulator-operator" });
    expect(again.outcome).toBe("unchanged");
    expect(
      (await getAdminFirestore().doc(`platformAdmins/${granted.uid}`).get()).get("grantedAt"),
    ).toEqual(grantedAt);
    await revokeSuperAdmin(store, {
      email,
      operatorEmail: "emulator-operator",
      reason: "test end",
    });
    const revoked = await getAdminFirestore().doc(`platformAdmins/${granted.uid}`).get();
    expect(revoked.get("status")).toBe("revoked");
    expect(revoked.get("reason")).toBe("test end");
    expect((await getAdminAuth().getUser(granted.uid)).customClaims?.superAdmin).not.toBe(true);
    const audits = await getAdminFirestore()
      .collection("auditLogs")
      .where("targetId", "==", granted.uid)
      .get();
    const actions = audits.docs.map((item) => item.get("action")).sort();
    expect(actions).toEqual(["super_admin.provision", "super_admin.revoke"]);
  });
});

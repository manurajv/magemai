import { readFileSync } from "node:fs";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, type Firestore } from "firebase/firestore";
import { afterAll, beforeAll, describe, it } from "vitest";

const projectId = process.env.GCLOUD_PROJECT ?? process.env.GOOGLE_CLOUD_PROJECT ?? "demo-magemai";

function splitHost(value: string | undefined, fallbackHost: string, fallbackPort: number) {
  const raw = value && value.length > 0 ? value : `${fallbackHost}:${fallbackPort}`;
  const separator = raw.lastIndexOf(":");
  return { host: raw.slice(0, separator), port: Number(raw.slice(separator + 1)) };
}

describe("tenant isolation", () => {
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
      await Promise.all([
        setBusiness(db, "studio-a", "Studio A"),
        setBusiness(db, "studio-b", "Studio B"),
        setMember(db, "studio-a", "alice", "owner"),
        setMember(db, "studio-a", "sam", "staff"),
        setMember(db, "studio-b", "bob", "owner"),
        setAudit(db, "audit-a", "studio-a"),
        setAudit(db, "audit-b", "studio-b"),
      ]);
    });
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  function dbFor(uid: string) {
    return testEnv
      .authenticatedContext(uid, { email: `${uid}@example.test`, email_verified: true })
      .firestore() as unknown as Firestore;
  }

  it("lets a member read their business and denies the other business and its membership", async () => {
    const alice = dbFor("alice");
    await assertSucceeds(getDoc(doc(alice, "businesses/studio-a")));
    await assertSucceeds(getDoc(doc(alice, "businessMembers/studio-a_alice")));
    await assertFails(getDoc(doc(alice, "businesses/studio-b")));
    await assertFails(getDoc(doc(alice, "businessMembers/studio-b_bob")));
  });

  it("lets an owner read their audit row and denies staff and the other tenant", async () => {
    await assertSucceeds(getDoc(doc(dbFor("alice"), "auditLogs/audit-a")));
    await assertFails(getDoc(doc(dbFor("sam"), "auditLogs/audit-a")));
    await assertFails(getDoc(doc(dbFor("bob"), "auditLogs/audit-a")));
    await assertFails(getDoc(doc(dbFor("alice"), "auditLogs/audit-b")));
  });
});

async function setBusiness(db: Firestore, id: string, name: string) {
  await setDoc(doc(db, "businesses", id), { id, name, status: "active", ownerId: "seed" });
}

async function setMember(db: Firestore, businessId: string, userId: string, role: string) {
  await setDoc(doc(db, "businessMembers", `${businessId}_${userId}`), {
    id: `${businessId}_${userId}`,
    businessId,
    userId,
    role,
    status: "active",
  });
}

async function setAudit(db: Firestore, id: string, businessId: string) {
  await setDoc(doc(db, "auditLogs", id), {
    id,
    scope: "business",
    businessId,
    action: "business.create",
  });
}

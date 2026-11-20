import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  confirmationMatches,
  credentialsAreOutsideRepo,
  EMULATOR_PROJECT_ID,
  EMULATOR_PROJECT_NUMBER,
  grantSuperAdmin,
  MAGEMAI_PROJECT_ID,
  MAGEMAI_PROJECT_NUMBER,
  ProvisionError,
  revokeSuperAdmin,
  serviceAccountEmail,
  type AuthUserRecord,
  type RegistryRecord,
  type StoredAudit,
  type SuperAdminStore,
} from "./super-admin-provision.ts";

function memoryStore(): SuperAdminStore & {
  users: Map<string, AuthUserRecord>;
  registries: Map<string, RegistryRecord>;
  profiles: Map<string, Record<string, unknown>>;
  audits: StoredAudit[];
  revokedTokens: string[];
  failOn: string | null;
} {
  let clock = 1_000;
  const users = new Map<string, AuthUserRecord>();
  const registries = new Map<string, RegistryRecord>();
  const profiles = new Map<string, Record<string, unknown>>();
  const audits: StoredAudit[] = [];
  const revokedTokens: string[] = [];
  const api = {
    users,
    registries,
    profiles,
    audits,
    revokedTokens,
    failOn: null as string | null,
    now: () => {
      clock += 1;
      return clock;
    },
    async findUser(email: string) {
      return [...users.values()].find((user) => user.email === email) ?? null;
    },
    async createUser(email: string) {
      const user: AuthUserRecord = {
        uid: `uid-${users.size + 1}`,
        email,
        emailVerified: true,
        displayName: email.split("@")[0] ?? "Member",
        claims: {},
      };
      users.set(user.uid, user);
      return { user, password: "one-time" };
    },
    async setClaims(uid: string, claims: Record<string, unknown>) {
      if (api.failOn === "set-claim") throw new Error("claim write failed");
      const user = users.get(uid);
      if (!user) throw new Error("missing user");
      users.set(uid, { ...user, claims: { ...claims } });
    },
    async revokeRefreshTokens(uid: string) {
      revokedTokens.push(uid);
    },
    async readRegistry(uid: string) {
      return registries.get(uid) ?? null;
    },
    async writeRegistry(record: RegistryRecord) {
      if (api.failOn === "write-registry") throw new Error("registry write failed");
      registries.set(record.id, { ...record });
    },
    async ensureUserProfile(user: AuthUserRecord) {
      const existing = profiles.get(user.uid);
      if (!existing) {
        profiles.set(user.uid, {
          id: user.uid,
          email: user.email,
          emailVerified: true,
          displayName: user.displayName,
          status: "active",
        });
        return;
      }
      profiles.set(user.uid, { ...existing, email: user.email, emailVerified: user.emailVerified });
    },
    async auditsFor(uid: string) {
      return audits.filter((audit) => audit.targetId === uid);
    },
    async writeAudit(input: StoredAudit & { summary: string }) {
      if (api.failOn === "write-audit") throw new Error("audit write failed");
      audits.push({
        action: input.action,
        targetId: input.targetId,
        createdAtMs: input.createdAtMs,
        metadata: input.metadata,
      });
    },
  };
  return api;
}

const operator = { email: "ada@example.test", operatorEmail: "operator@example.test" };

describe("super-admin confirmation", () => {
  it("requires the magemai project id and project number", () => {
    expect(confirmationMatches(MAGEMAI_PROJECT_ID, "magemai", MAGEMAI_PROJECT_NUMBER)).toBe(true);
    expect(confirmationMatches(MAGEMAI_PROJECT_ID, "magemai", "1")).toBe(false);
    expect(confirmationMatches(MAGEMAI_PROJECT_ID, "other", MAGEMAI_PROJECT_NUMBER)).toBe(false);
    expect(
      confirmationMatches(EMULATOR_PROJECT_ID, EMULATOR_PROJECT_ID, EMULATOR_PROJECT_NUMBER),
    ).toBe(true);
  });

  it("rejects a credentials file inside the repository", () => {
    const root = path.resolve("/work/magemai");
    expect(credentialsAreOutsideRepo(path.resolve("/secrets/service-account.json"), root)).toBe(
      true,
    );
    expect(credentialsAreOutsideRepo(path.resolve(root, "service-account.json"), root)).toBe(false);
    expect(credentialsAreOutsideRepo("service-account.json", root)).toBe(false);
  });

  it("reads the service-account email and nothing else", () => {
    expect(
      serviceAccountEmail(JSON.stringify({ client_email: "ops@magemai.iam.gserviceaccount.com" })),
    ).toBe("ops@magemai.iam.gserviceaccount.com");
    expect(() => serviceAccountEmail("{")).toThrow(ProvisionError);
  });
});

describe("super-admin grant and revoke", () => {
  it("creates a user, writes the registry before the claim, and audits once", async () => {
    const store = memoryStore();
    const first = await grantSuperAdmin(store, operator);
    expect(first.outcome).toBe("granted");
    expect(first.createdPassword).toBe("one-time");
    const registry = store.registries.get(first.uid);
    expect(registry?.status).toBe("active");
    expect(registry?.revokedBy).toBeNull();
    expect(store.users.get(first.uid)?.claims.superAdmin).toBe(true);
    expect(store.profiles.get(first.uid)?.superAdmin).toBeUndefined();
    expect(store.audits).toHaveLength(1);
    expect(store.audits[0]?.metadata.regrant).toBeUndefined();

    const grantedAt = registry?.grantedAtMs;
    const second = await grantSuperAdmin(store, operator);
    expect(second.outcome).toBe("unchanged");
    expect(store.registries.get(first.uid)?.grantedAtMs).toBe(grantedAt);
    expect(store.audits).toHaveLength(1);
  });

  it("repairs a partial grant without opening a second audit when the audit already exists", async () => {
    const store = memoryStore();
    store.failOn = "set-claim";
    await expect(grantSuperAdmin(store, operator)).rejects.toMatchObject({
      lastStep: "write-registry",
    });
    const uid = [...store.users.keys()][0] ?? "";
    expect(store.registries.get(uid)?.status).toBe("active");
    expect(store.users.get(uid)?.claims.superAdmin).toBeUndefined();
    store.failOn = null;
    const repaired = await grantSuperAdmin(store, operator);
    expect(repaired.outcome).toBe("granted");
    expect(store.users.get(uid)?.claims.superAdmin).toBe(true);
    expect(store.audits).toHaveLength(1);
  });

  it("writes the missing audit when the claim is already set", async () => {
    const store = memoryStore();
    store.failOn = "write-audit";
    await expect(grantSuperAdmin(store, operator)).rejects.toMatchObject({ lastStep: "set-claim" });
    store.failOn = null;
    await grantSuperAdmin(store, operator);
    expect(store.audits).toHaveLength(1);
    await grantSuperAdmin(store, operator);
    expect(store.audits).toHaveLength(1);
  });

  it("revokes the registry before the claim and is idempotent", async () => {
    const store = memoryStore();
    const granted = await grantSuperAdmin(store, operator);
    const revoked = await revokeSuperAdmin(store, { ...operator, reason: "left the company" });
    expect(revoked.outcome).toBe("revoked");
    const registry = store.registries.get(granted.uid);
    expect(registry?.status).toBe("revoked");
    expect(registry?.reason).toBe("left the company");
    expect(store.users.get(granted.uid)?.claims.superAdmin).toBeUndefined();
    expect(store.revokedTokens).toContain(granted.uid);
    const revokedAt = registry?.revokedAtMs;
    const again = await revokeSuperAdmin(store, { ...operator, reason: "different reason" });
    expect(again.outcome).toBe("unchanged");
    expect(store.registries.get(granted.uid)?.revokedAtMs).toBe(revokedAt);
    expect(store.registries.get(granted.uid)?.reason).toBe("left the company");
    expect(store.audits.filter((audit) => audit.action === "super_admin.revoke")).toHaveLength(1);
    expect(store.revokedTokens.filter((uid) => uid === granted.uid).length).toBeGreaterThan(1);
  });

  it("re-grants a revoked admin with one new audit and cleared revocation fields", async () => {
    const store = memoryStore();
    const granted = await grantSuperAdmin(store, operator);
    await revokeSuperAdmin(store, { ...operator, reason: "pause" });
    const again = await grantSuperAdmin(store, operator);
    expect(again.outcome).toBe("regranted");
    const registry = store.registries.get(granted.uid);
    expect(registry?.status).toBe("active");
    expect(registry?.revokedAtMs).toBeNull();
    expect(registry?.reason).toBeNull();
    expect(store.users.get(granted.uid)?.claims.superAdmin).toBe(true);
    const provision = store.audits.filter((audit) => audit.action === "super_admin.provision");
    expect(provision).toHaveLength(2);
    expect(provision[1]?.metadata.regrant).toBe(true);
  });

  it("exits cleanly when revoke has no user, and records a claim-only account as revoked", async () => {
    const store = memoryStore();
    const missing = await revokeSuperAdmin(store, { ...operator, reason: "unknown" });
    expect(missing.outcome).toBe("absent");
    store.users.set("claim-only", {
      uid: "claim-only",
      email: operator.email,
      emailVerified: true,
      displayName: "Ada",
      claims: { superAdmin: true, locale: "en" },
    });
    await revokeSuperAdmin(store, { ...operator, reason: "claim only" });
    expect(store.registries.get("claim-only")?.status).toBe("revoked");
    expect(store.users.get("claim-only")?.claims).toEqual({ locale: "en" });
  });

  it("requires a reason", async () => {
    const store = memoryStore();
    await expect(revokeSuperAdmin(store, { ...operator, reason: "  " })).rejects.toBeInstanceOf(
      ProvisionError,
    );
  });
});

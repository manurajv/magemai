import { randomBytes } from "node:crypto";
import { applicationDefault, getApps, initializeApp } from "firebase-admin/app";
import { getAuth, type UserRecord } from "firebase-admin/auth";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import path from "node:path";

export const MAGEMAI_PROJECT_ID = "magemai";
export const MAGEMAI_PROJECT_NUMBER = "122706427013";
export const EMULATOR_PROJECT_ID = "demo-magemai";
export const EMULATOR_PROJECT_NUMBER = "0";

export class ProvisionError extends Error {
  readonly lastStep: string;

  constructor(message: string, lastStep: string) {
    super(message);
    this.name = "ProvisionError";
    this.lastStep = lastStep;
  }
}

export function confirmationMatches(
  projectId: string,
  typedId: string,
  typedNumber: string,
): boolean {
  if (typedId.trim() !== projectId) return false;
  if (projectId === MAGEMAI_PROJECT_ID) return typedNumber.trim() === MAGEMAI_PROJECT_NUMBER;
  if (projectId === EMULATOR_PROJECT_ID) return typedNumber.trim() === EMULATOR_PROJECT_NUMBER;
  return false;
}

export function credentialsAreOutsideRepo(credentialsPath: string, repoRoot: string): boolean {
  if (!path.isAbsolute(credentialsPath)) return false;
  const resolved = path.resolve(credentialsPath);
  const root = path.resolve(repoRoot);
  const relative = path.relative(root, resolved);
  if (relative === "") return false;
  return relative.startsWith(`..${path.sep}`) || relative === ".." || path.isAbsolute(relative);
}

export function serviceAccountEmail(jsonText: string): string {
  let parsed: { client_email?: unknown };
  try {
    parsed = JSON.parse(jsonText) as { client_email?: unknown };
  } catch {
    throw new ProvisionError("The service account file is not valid JSON.", "none");
  }
  if (typeof parsed.client_email !== "string" || !parsed.client_email.includes("@")) {
    throw new ProvisionError("The service account file has no client_email.", "none");
  }
  return parsed.client_email;
}

export type AuthUserRecord = {
  uid: string;
  email: string;
  emailVerified: boolean;
  displayName: string;
  claims: Record<string, unknown>;
};

export type RegistryRecord = {
  id: string;
  status: "active" | "revoked";
  grantedBy: string;
  grantedAtMs: number;
  revokedBy: string | null;
  revokedAtMs: number | null;
  reason: string | null;
};

export type AuditInput = {
  action: "super_admin.provision" | "super_admin.revoke";
  targetId: string;
  createdAtMs: number;
  summary: string;
  metadata: Record<string, unknown>;
};

export type StoredAudit = {
  action: string;
  targetId: string;
  createdAtMs: number;
  metadata: Record<string, unknown>;
};

export type SuperAdminStore = {
  now(): number;
  findUser(email: string): Promise<AuthUserRecord | null>;
  createUser(email: string): Promise<{ user: AuthUserRecord; password: string }>;
  setClaims(uid: string, claims: Record<string, unknown>): Promise<void>;
  revokeRefreshTokens(uid: string): Promise<void>;
  readRegistry(uid: string): Promise<RegistryRecord | null>;
  writeRegistry(record: RegistryRecord): Promise<void>;
  ensureUserProfile(user: AuthUserRecord): Promise<void>;
  auditsFor(uid: string): Promise<StoredAudit[]>;
  writeAudit(input: AuditInput): Promise<void>;
};

export type GrantResult = {
  outcome: "unchanged" | "granted" | "regranted";
  uid: string;
  createdPassword: string | null;
  lastStep: string;
};

export type RevokeResult = {
  outcome: "absent" | "unchanged" | "revoked";
  uid: string | null;
  lastStep: string;
};

function failureMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Provisioning failed.";
}

function covers(audits: StoredAudit[], action: string, atMs: number): boolean {
  return audits.some((audit) => audit.action === action && audit.createdAtMs >= atMs);
}

function claimsWithSuperAdmin(claims: Record<string, unknown>, enabled: boolean) {
  const next = { ...claims };
  if (enabled) next.superAdmin = true;
  else delete next.superAdmin;
  return next;
}

export async function grantSuperAdmin(
  store: SuperAdminStore,
  input: { email: string; operatorEmail: string },
): Promise<GrantResult> {
  const done: string[] = [];
  try {
    let user = await store.findUser(input.email);
    let createdPassword: string | null = null;
    if (!user) {
      const created = await store.createUser(input.email);
      user = created.user;
      createdPassword = created.password;
      done.push("create-user");
    } else {
      done.push("load-user");
    }

    await store.ensureUserProfile(user);
    done.push("ensure-user-doc");

    const registry = await store.readRegistry(user.uid);
    const claim = user.claims.superAdmin === true;
    const active = registry?.status === "active";
    const audits = await store.auditsFor(user.uid);
    if (
      active &&
      registry &&
      claim &&
      covers(audits, "super_admin.provision", registry.grantedAtMs)
    ) {
      return {
        outcome: "unchanged",
        uid: user.uid,
        createdPassword,
        lastStep: done.at(-1) ?? "none",
      };
    }

    const prior = [...audits].sort((left, right) => left.createdAtMs - right.createdAtMs).at(-1);
    const regrant = registry?.status === "revoked" || prior?.action === "super_admin.revoke";
    const grantedAtMs = active && registry ? registry.grantedAtMs : store.now();
    let mutated = false;
    if (!active) {
      await store.writeRegistry({
        id: user.uid,
        status: "active",
        grantedBy: input.operatorEmail,
        grantedAtMs,
        revokedBy: null,
        revokedAtMs: null,
        reason: null,
      });
      mutated = true;
      done.push("write-registry");
    }
    if (!claim) {
      await store.setClaims(user.uid, claimsWithSuperAdmin(user.claims, true));
      mutated = true;
      done.push("set-claim");
    }
    const fresh = await store.auditsFor(user.uid);
    if (mutated || !covers(fresh, "super_admin.provision", grantedAtMs)) {
      await store.writeAudit({
        action: "super_admin.provision",
        targetId: user.uid,
        createdAtMs: Math.max(store.now(), grantedAtMs),
        summary: regrant ? "Re-granted platform access." : "Granted platform access.",
        metadata: {
          operator: input.operatorEmail,
          grantedBy: input.operatorEmail,
          ...(regrant ? { regrant: true } : {}),
        },
      });
      done.push("write-audit");
    }
    return {
      outcome: regrant ? "regranted" : "granted",
      uid: user.uid,
      createdPassword,
      lastStep: done.at(-1) ?? "none",
    };
  } catch (error) {
    if (error instanceof ProvisionError) throw error;
    throw new ProvisionError(failureMessage(error), done.at(-1) ?? "none");
  }
}

export async function revokeSuperAdmin(
  store: SuperAdminStore,
  input: { email: string; operatorEmail: string; reason: string },
): Promise<RevokeResult> {
  const reason = input.reason.trim();
  if (!reason) throw new ProvisionError("A reason is required.", "none");
  const done: string[] = [];
  try {
    const user = await store.findUser(input.email);
    if (!user) return { outcome: "absent", uid: null, lastStep: "none" };
    done.push("load-user");

    const registry = await store.readRegistry(user.uid);
    const claim = user.claims.superAdmin === true;
    const revoked = registry?.status === "revoked" && registry.revokedAtMs != null;
    const audits = await store.auditsFor(user.uid);
    if (
      revoked &&
      registry?.revokedAtMs != null &&
      !claim &&
      covers(audits, "super_admin.revoke", registry.revokedAtMs)
    ) {
      await store.revokeRefreshTokens(user.uid);
      done.push("revoke-refresh-tokens");
      return { outcome: "unchanged", uid: user.uid, lastStep: done.at(-1) ?? "none" };
    }

    const revokedAtMs =
      revoked && registry?.revokedAtMs != null ? registry.revokedAtMs : store.now();
    if (!revoked) {
      await store.writeRegistry({
        id: user.uid,
        status: "revoked",
        grantedBy: registry?.grantedBy ?? input.operatorEmail,
        grantedAtMs: registry?.grantedAtMs ?? revokedAtMs,
        revokedBy: input.operatorEmail,
        revokedAtMs,
        reason,
      });
      done.push("write-registry");
    }
    await store.revokeRefreshTokens(user.uid);
    done.push("revoke-refresh-tokens");
    if (claim) {
      await store.setClaims(user.uid, claimsWithSuperAdmin(user.claims, false));
      done.push("remove-claim");
    }
    const fresh = await store.auditsFor(user.uid);
    if (!covers(fresh, "super_admin.revoke", revokedAtMs)) {
      await store.writeAudit({
        action: "super_admin.revoke",
        targetId: user.uid,
        createdAtMs: Math.max(store.now(), revokedAtMs),
        summary: "Revoked platform access.",
        metadata: {
          operator: input.operatorEmail,
          revokedBy: input.operatorEmail,
          reason: registry?.status === "revoked" ? (registry.reason ?? reason) : reason,
        },
      });
      done.push("write-audit");
    }
    return { outcome: "revoked", uid: user.uid, lastStep: done.at(-1) ?? "none" };
  } catch (error) {
    if (error instanceof ProvisionError) throw error;
    throw new ProvisionError(failureMessage(error), done.at(-1) ?? "none");
  }
}

function displayNameFor(email: string): string {
  const local = email.split("@")[0]?.trim() ?? "";
  return local.slice(0, 80) || "Member";
}

function toAuthUser(record: UserRecord): AuthUserRecord {
  return {
    uid: record.uid,
    email: record.email ?? "",
    emailVerified: record.emailVerified,
    displayName: record.displayName ?? displayNameFor(record.email ?? ""),
    claims: { ...(record.customClaims ?? {}) },
  };
}

function millis(value: unknown): number | null {
  if (value instanceof Timestamp) return value.toMillis();
  return null;
}

export function createAdminStore(): SuperAdminStore {
  const auth = getAuth();
  const db = getFirestore();
  return {
    now: () => Date.now(),
    async findUser(email) {
      try {
        return toAuthUser(await auth.getUserByEmail(email));
      } catch (error) {
        const code =
          typeof error === "object" && error !== null && "code" in error ? String(error.code) : "";
        if (code === "auth/user-not-found") return null;
        throw error;
      }
    },
    async createUser(email) {
      const password = randomBytes(18).toString("base64url");
      const displayName = displayNameFor(email);
      const record = await auth.createUser({
        email,
        password,
        displayName,
        emailVerified: true,
      });
      return { user: toAuthUser(record), password };
    },
    async setClaims(uid, claims) {
      await auth.setCustomUserClaims(uid, claims);
    },
    async revokeRefreshTokens(uid) {
      await auth.revokeRefreshTokens(uid);
    },
    async readRegistry(uid) {
      const snap = await db.doc(`platformAdmins/${uid}`).get();
      if (!snap.exists) return null;
      const rawStatus = snap.get("status");
      const status = rawStatus === "active" ? "active" : "revoked";
      const grantedAtMs = millis(snap.get("grantedAt")) ?? 0;
      const revokedAtMs = millis(snap.get("revokedAt"));
      return {
        id: uid,
        status,
        grantedBy: typeof snap.get("grantedBy") === "string" ? snap.get("grantedBy") : "",
        grantedAtMs,
        revokedBy: typeof snap.get("revokedBy") === "string" ? snap.get("revokedBy") : null,
        revokedAtMs,
        reason: typeof snap.get("reason") === "string" ? snap.get("reason") : null,
      };
    },
    async writeRegistry(record) {
      await db.doc(`platformAdmins/${record.id}`).set({
        id: record.id,
        status: record.status,
        grantedBy: record.grantedBy,
        grantedAt: Timestamp.fromMillis(record.grantedAtMs),
        revokedBy: record.revokedBy,
        revokedAt: record.revokedAtMs == null ? null : Timestamp.fromMillis(record.revokedAtMs),
        reason: record.reason,
      });
    },
    async ensureUserProfile(user) {
      const ref = db.doc(`users/${user.uid}`);
      const snap = await ref.get();
      const now = Timestamp.fromMillis(Date.now());
      if (!snap.exists) {
        await ref.set({
          id: user.uid,
          email: user.email,
          emailVerified: true,
          displayName: user.displayName || "Member",
          phoneNumber: null,
          photoPath: null,
          locale: "en",
          status: "active",
          createdAt: now,
          updatedAt: now,
          lastLoginAt: null,
        });
        return;
      }
      await ref.update({
        email: user.email,
        emailVerified: user.emailVerified,
        updatedAt: now,
      });
    },
    async auditsFor(uid) {
      const snap = await db.collection("auditLogs").where("targetId", "==", uid).get();
      return snap.docs.flatMap((doc) => {
        const createdAtMs = millis(doc.get("createdAt"));
        if (createdAtMs == null) return [];
        const metadata = doc.get("metadata");
        return [
          {
            action: String(doc.get("action") ?? ""),
            targetId: uid,
            createdAtMs,
            metadata:
              typeof metadata === "object" && metadata !== null
                ? (metadata as Record<string, unknown>)
                : {},
          },
        ];
      });
    },
    async writeAudit(input) {
      const ref = db.collection("auditLogs").doc();
      await ref.set({
        id: ref.id,
        scope: "platform",
        businessId: null,
        actorId: "system",
        actorType: "system",
        action: input.action,
        targetType: "superAdmin",
        targetId: input.targetId,
        summary: input.summary,
        metadata: input.metadata,
        createdAt: Timestamp.fromMillis(input.createdAtMs),
      });
    },
  };
}

export function ensureAdminApp(projectId: string, emulator: boolean): void {
  if (getApps().length > 0) return;
  if (emulator) {
    process.env.METADATA_SERVER_DETECTION = "none";
    initializeApp({ projectId });
    return;
  }
  initializeApp({ credential: applicationDefault(), projectId });
}

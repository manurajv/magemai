import "./admin.js";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { HttpsError, type CallableRequest } from "firebase-functions/v2/https";
import {
  setBusinessStatusSchema,
  setBusinessVerificationSchema,
} from "../../shared/validation/platform.js";

export async function assertActivePlatformAdmin(request: CallableRequest): Promise<string> {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Sign in before continuing.");
  }
  const uid = request.auth.uid;
  const user = await getAuth().getUser(uid);
  if (user.disabled || user.customClaims?.superAdmin !== true) {
    throw new HttpsError("permission-denied", "Platform access is required.");
  }
  const registry = await getFirestore().doc(`platformAdmins/${uid}`).get();
  if (!registry.exists || registry.get("status") !== "active") {
    throw new HttpsError("permission-denied", "Platform access is required.");
  }
  return uid;
}

type BusinessChange = {
  changed: boolean;
  auditId: string | null;
  summary: string | null;
  from: string;
  to: string;
};

async function changeBusiness(
  uid: string,
  businessId: string,
  field: "status" | "verificationStatus",
  next: string,
): Promise<BusinessChange> {
  const db = getFirestore();
  const businessRef = db.doc(`businesses/${businessId}`);
  const auditRef = db.collection("auditLogs").doc();
  const now = FieldValue.serverTimestamp();
  let changed = false;
  let from = "";
  const action = field === "status" ? "business.status.update" : "business.verification.update";
  const summary =
    field === "status"
      ? next === "suspended"
        ? "Suspended the business."
        : "Reactivated the business."
      : `Set verification to ${next}.`;

  await db.runTransaction(async (transaction) => {
    const business = await transaction.get(businessRef);
    if (!business.exists) {
      throw new HttpsError("not-found", "This business was not found.");
    }
    const current = business.get(field);
    from = typeof current === "string" ? current : "";
    if (from === next) return;
    changed = true;
    transaction.update(businessRef, {
      [field]: next,
      updatedBy: uid,
      updatedAt: now,
    });
    transaction.set(auditRef, {
      id: auditRef.id,
      scope: "platform",
      businessId,
      actorId: uid,
      actorType: "super_admin",
      action,
      targetType: "business",
      targetId: businessId,
      summary,
      metadata: { from, to: next },
      createdAt: now,
    });
  });

  return {
    changed,
    auditId: changed ? auditRef.id : null,
    summary: changed ? summary : null,
    from,
    to: next,
  };
}

export async function setBusinessStatus(request: CallableRequest): Promise<BusinessChange> {
  const uid = await assertActivePlatformAdmin(request);
  const parsed = setBusinessStatusSchema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError(
      "invalid-argument",
      parsed.error.issues[0]?.message ?? "Check the request.",
    );
  }
  return changeBusiness(uid, parsed.data.businessId, "status", parsed.data.status);
}

export async function setBusinessVerification(request: CallableRequest): Promise<BusinessChange> {
  const uid = await assertActivePlatformAdmin(request);
  const parsed = setBusinessVerificationSchema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError(
      "invalid-argument",
      parsed.error.issues[0]?.message ?? "Check the request.",
    );
  }
  return changeBusiness(
    uid,
    parsed.data.businessId,
    "verificationStatus",
    parsed.data.verificationStatus,
  );
}

import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import type { APIRequestContext } from "@playwright/test";

process.env.METADATA_SERVER_DETECTION ??= "none";

function adminAuth() {
  const projectId =
    process.env.GCLOUD_PROJECT ?? process.env.GOOGLE_CLOUD_PROJECT ?? "demo-magemai";
  if (projectId === "magemai") {
    throw new Error("Refusing to create an emulator user for the live project.");
  }
  if (getApps().length === 0) initializeApp({ projectId });
  return getAuth();
}

export async function ensureVerifiedUser(email: string, password: string, displayName: string) {
  const auth = adminAuth();
  try {
    const existing = await auth.getUserByEmail(email);
    await auth.updateUser(existing.uid, { emailVerified: true, password, displayName });
    return existing.uid;
  } catch (error) {
    const code =
      typeof error === "object" && error !== null && "code" in error ? String(error.code) : "";
    if (code !== "auth/user-not-found") throw error;
    const created = await auth.createUser({ email, password, displayName, emailVerified: true });
    return created.uid;
  }
}

type OobCode = { email?: string; oobCode?: string; requestType?: string };

export async function latestOob(request: APIRequestContext, email: string, requestType: string) {
  const projectId = process.env.GCLOUD_PROJECT ?? "demo-magemai";
  let lastBody = "";
  for (let attempt = 0; attempt < 15; attempt += 1) {
    const response = await request.get(
      `http://127.0.0.1:9099/emulator/v1/projects/${projectId}/oobCodes`,
    );
    lastBody = await response.text();
    const parsed = JSON.parse(lastBody) as { oobCodes?: OobCode[] };
    const match = [...(parsed.oobCodes ?? [])]
      .reverse()
      .find((code) => code.email === email && code.requestType === requestType && code.oobCode);
    if (match?.oobCode) return match.oobCode;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`No ${requestType} code for ${email}. Last response: ${lastBody}`);
}

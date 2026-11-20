import type { ActionCodeSettings, User } from "firebase/auth";

export const EMAIL_VERIFIED_MESSAGE = "Email verified";

export type VerificationOutcome = "app" | "sign-in" | "incomplete" | "still-unverified";

type RefreshableUser = Pick<User, "emailVerified" | "reload" | "getIdToken">;

/**
 * The continue URL is where Firebase's hosted handler sends the person after
 * it applies the code. `flow` tells our page that the visit is that redirect,
 * even when the code itself is no longer in the query.
 * When the action URL is this app, `mode` and `oobCode` are present and we
 * apply the code here.
 */
export function emailVerificationSettings(origin: string): ActionCodeSettings {
  return {
    url: `${origin}/auth/action?flow=verifyEmail`,
    handleCodeInApp: false,
  };
}

async function refresh(user: RefreshableUser): Promise<boolean> {
  await user.reload();
  await user.getIdToken(true);
  return user.emailVerified;
}

export async function finishEmailVerification(input: {
  mode: string | null;
  code: string | null;
  flow: string | null;
  applyCode: (code: string) => Promise<void>;
  currentUser: () => RefreshableUser | null;
}): Promise<VerificationOutcome> {
  const asked = input.mode === "verifyEmail" || input.flow === "verifyEmail";
  if (!asked) return "incomplete";

  if (input.code && input.mode === "verifyEmail") {
    try {
      await input.applyCode(input.code);
    } catch (error) {
      const user = input.currentUser();
      if (user && (await refresh(user))) return "app";
      throw error;
    }
  }

  const user = input.currentUser();
  if (!user) return "sign-in";
  return (await refresh(user)) ? "app" : "still-unverified";
}

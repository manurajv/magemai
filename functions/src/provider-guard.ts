import { HttpsError } from "firebase-functions/v2/https";
import { PASSWORD_ACCOUNT_MESSAGE } from "../../shared/auth/messages.js";

type SignInEvent = {
  credential?: { providerId?: string } | null;
  additionalUserInfo?: { providerId?: string } | null;
  data?: { providerData?: Array<{ providerId?: string }> } | null;
};

export function rejectCrossProvider(event: SignInEvent): void {
  const incoming = event.credential?.providerId ?? event.additionalUserInfo?.providerId ?? "";
  if (incoming !== "google.com") return;
  const linked = new Set((event.data?.providerData ?? []).map((provider) => provider.providerId));
  if (linked.has("password") && !linked.has("google.com")) {
    throw new HttpsError("already-exists", PASSWORD_ACCOUNT_MESSAGE);
  }
}

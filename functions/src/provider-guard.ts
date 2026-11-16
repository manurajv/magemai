import { HttpsError } from "firebase-functions/v2/https";
import { beforeUserSignedIn } from "firebase-functions/v2/identity";
import { PASSWORD_ACCOUNT_MESSAGE } from "../../shared/auth/messages.js";
import "./admin.js";
import "./options.js";

export const guardProviderSignIn = beforeUserSignedIn({ timeoutSeconds: 7 }, (event) => {
  const incoming = event.credential?.providerId ?? event.additionalUserInfo?.providerId ?? "";
  if (incoming !== "google.com") return;
  const linked = new Set((event.data?.providerData ?? []).map((provider) => provider.providerId));
  if (linked.has("password") && !linked.has("google.com")) {
    throw new HttpsError("already-exists", PASSWORD_ACCOUNT_MESSAGE);
  }
});

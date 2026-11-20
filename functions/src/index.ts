import "./admin.js";
import "./options.js";
import { beforeUserSignedIn } from "firebase-functions/v2/identity";
import { rejectCrossProvider } from "./provider-guard.js";

export { checkSlugAvailability, createBusiness, setBusinessImage } from "./business.js";
export { setUserAvatar, stripDownloadTokens, syncAuthProfile } from "./users.js";

/**
 * Blocking sign-in functions need Identity Platform, so a normal deploy omits
 * this one. Set MAGEMAI_DEPLOY_BLOCKING_AUTH=true only after Identity Platform
 * is enabled. The emulator sets FUNCTIONS_EMULATOR, which loads the guard for tests.
 */
const deployBlockingAuth =
  process.env.MAGEMAI_DEPLOY_BLOCKING_AUTH === "true" || process.env.FUNCTIONS_EMULATOR === "true";

export const guardProviderSignIn = deployBlockingAuth
  ? beforeUserSignedIn({ timeoutSeconds: 7 }, rejectCrossProvider)
  : undefined;

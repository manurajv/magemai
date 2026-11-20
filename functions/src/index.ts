import "./options.js";
import { beforeUserSignedIn } from "firebase-functions/v2/identity";
import { onCall, type CallableRequest } from "firebase-functions/v2/https";
import { onObjectFinalized } from "firebase-functions/v2/storage";
import { STORAGE_REGION } from "../../shared/firebase/region.js";

/**
 * Discovery and cold start load this file only. Handler modules (Admin SDK,
 * Zod, Storage) load on the first invocation of that function.
 */
type Handler = (request: CallableRequest) => Promise<unknown>;

function lazyCall(load: () => Promise<Handler>) {
  return onCall(async (request) => {
    const handler = await load();
    return handler(request);
  });
}

export const checkSlugAvailability = lazyCall(async () => {
  const handlers = await import("./business.js");
  return handlers.checkSlugAvailability;
});

export const createBusiness = lazyCall(async () => {
  const handlers = await import("./business.js");
  return handlers.createBusiness;
});

export const setBusinessImage = lazyCall(async () => {
  const handlers = await import("./business.js");
  return handlers.setBusinessImage;
});

export const updateBusinessProfile = lazyCall(async () => {
  const handlers = await import("./business.js");
  return handlers.updateBusinessProfile;
});

export const updateBusinessSettings = lazyCall(async () => {
  const handlers = await import("./business.js");
  return handlers.updateBusinessSettings;
});

export const setBusinessStatus = lazyCall(async () => {
  const handlers = await import("./platform.js");
  return handlers.setBusinessStatus;
});

export const setBusinessVerification = lazyCall(async () => {
  const handlers = await import("./platform.js");
  return handlers.setBusinessVerification;
});

export const setUserAvatar = lazyCall(async () => {
  const handlers = await import("./users.js");
  return handlers.setUserAvatar;
});

export const syncAuthProfile = lazyCall(async () => {
  const handlers = await import("./users.js");
  return handlers.syncAuthProfile;
});

export const stripDownloadTokens = onObjectFinalized({ region: STORAGE_REGION }, async (event) => {
  const handlers = await import("./users.js");
  await handlers.stripFinalizedDownloadTokens(event);
});

/**
 * Blocking sign-in functions need Identity Platform, so a normal deploy omits
 * this one. Set MAGEMAI_DEPLOY_BLOCKING_AUTH=true only after Identity Platform
 * is enabled. The emulator sets FUNCTIONS_EMULATOR, which loads the guard for tests.
 */
const deployBlockingAuth =
  process.env.MAGEMAI_DEPLOY_BLOCKING_AUTH === "true" || process.env.FUNCTIONS_EMULATOR === "true";

export const guardProviderSignIn = deployBlockingAuth
  ? beforeUserSignedIn({ timeoutSeconds: 7 }, async (event) => {
      const guard = await import("./provider-guard.js");
      guard.rejectCrossProvider(event);
    })
  : undefined;

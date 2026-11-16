import { setGlobalOptions } from "firebase-functions/v2";
import { FUNCTIONS_REGION } from "../../shared/firebase/region.js";

/**
 * Cloud Functions workspace for Magemai.
 * Deployed runtime: nodejs24. Region: asia-south1.
 * No business functions are exported in Phase 1 step 4.
 * Later callables inherit these options and must stay in asia-south1.
 */
setGlobalOptions({
  region: FUNCTIONS_REGION,
  memory: "256MiB",
  timeoutSeconds: 30,
  minInstances: 0,
});

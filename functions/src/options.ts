import { setGlobalOptions } from "firebase-functions/v2";
import { FUNCTIONS_REGION } from "../../shared/firebase/region.js";

setGlobalOptions({
  region: FUNCTIONS_REGION,
  memory: "256MiB",
  timeoutSeconds: 30,
  minInstances: 0,
});

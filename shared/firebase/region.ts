/** Cloud Functions and Firestore region. Owner-approved decision D13. */
export const FUNCTIONS_REGION = "asia-south1" as const;

/**
 * Default Storage bucket location. `magemai.firebasestorage.app` stays in
 * us-east1 so it remains on the no-cost Storage tier. A Storage trigger must
 * use this region. Every other function stays in `FUNCTIONS_REGION`.
 */
export const STORAGE_REGION = "us-east1" as const;

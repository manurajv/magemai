import { z } from "zod";

export const businessLifecycleSchema = z.enum(["active", "suspended"]);
export const verificationStatusSchema = z.enum(["unverified", "pending", "verified", "rejected"]);

const businessId = z.string().trim().min(1, "Choose a business.");

export const setBusinessStatusSchema = z
  .object({
    businessId,
    status: businessLifecycleSchema,
  })
  .strict();

export const setBusinessVerificationSchema = z
  .object({
    businessId,
    verificationStatus: verificationStatusSchema,
  })
  .strict();

export type BusinessLifecycle = z.infer<typeof businessLifecycleSchema>;
export type VerificationStatus = z.infer<typeof verificationStatusSchema>;

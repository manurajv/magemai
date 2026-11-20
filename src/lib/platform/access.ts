export type ClaimState = "loading" | "yes" | "no";
export type RegistryState = "loading" | "active" | "inactive" | "error";
export type PlatformAccess = "loading" | "denied-claim" | "denied-registry" | "error" | "ready";

export function platformAccessDecision(claim: ClaimState, registry: RegistryState): PlatformAccess {
  if (claim === "loading") return "loading";
  if (claim === "no") return "denied-claim";
  if (registry === "loading") return "loading";
  if (registry === "error") return "error";
  if (registry !== "active") return "denied-registry";
  return "ready";
}

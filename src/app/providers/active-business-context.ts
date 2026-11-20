import { createContext, useContext } from "react";
import type { ActiveMembership } from "@/lib/business/dashboard";

export type ActiveBusinessValue =
  | { status: "loading" }
  | { status: "empty" }
  | { status: "error"; message: string; reload: () => void }
  | {
      status: "ready";
      memberships: readonly ActiveMembership[];
      active: ActiveMembership;
      select: (businessId: string) => void;
    };

export const ActiveBusinessContext = createContext<ActiveBusinessValue>({ status: "loading" });

export function useActiveBusiness(): ActiveBusinessValue {
  return useContext(ActiveBusinessContext);
}

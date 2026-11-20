import { useQuery } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import {
  ActiveBusinessContext,
  type ActiveBusinessValue,
} from "@/app/providers/active-business-context";
import { useAuth } from "@/app/providers/auth-context";
import {
  chooseActiveBusinessId,
  readActiveBusinessId,
  writeActiveBusinessId,
} from "@/lib/business/active-business";
import { loadActiveMemberships } from "@/lib/business/dashboard";
import { clearActiveBusinessHint } from "@/lib/auth/session";

export function ActiveBusinessProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const uid = auth.user?.emailVerified ? auth.user.uid : "";
  const [overrideId, setOverrideId] = useState<string | null>(null);
  const memberships = useQuery({
    queryKey: ["memberships", uid],
    enabled: uid.length > 0,
    queryFn: () => loadActiveMemberships(uid),
  });

  useEffect(() => {
    setOverrideId(null);
  }, [uid]);

  const list = memberships.data ?? [];
  const stored = overrideId ?? readActiveBusinessId();
  const activeId = memberships.isSuccess ? chooseActiveBusinessId(list, stored) : null;
  const active = list.find((item) => item.businessId === activeId) ?? null;

  useEffect(() => {
    if (!uid || !memberships.isSuccess) return;
    if (activeId) writeActiveBusinessId(activeId);
    else clearActiveBusinessHint();
  }, [activeId, memberships.isSuccess, uid]);

  let value: ActiveBusinessValue;
  if (!uid) {
    value = { status: "empty" };
  } else if (memberships.isPending) {
    value = { status: "loading" };
  } else if (memberships.isError) {
    value = {
      status: "error",
      message:
        memberships.error instanceof Error
          ? memberships.error.message
          : "Your businesses could not be loaded.",
      reload: () => void memberships.refetch(),
    };
  } else if (!active) {
    value = memberships.isFetching ? { status: "loading" } : { status: "empty" };
  } else {
    value = {
      status: "ready",
      memberships: list,
      active,
      select: (businessId) => {
        if (!list.some((item) => item.businessId === businessId)) return;
        setOverrideId(businessId);
        writeActiveBusinessId(businessId);
      },
    };
  }

  return <ActiveBusinessContext.Provider value={value}>{children}</ActiveBusinessContext.Provider>;
}

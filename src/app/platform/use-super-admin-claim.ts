import { useEffect, useState } from "react";
import type { ClaimState } from "@/lib/platform/access";
import { getFirebase } from "@/lib/firebase/client";

export function useSuperAdminClaim(uid: string | null): ClaimState {
  const [claim, setClaim] = useState<ClaimState>(uid ? "loading" : "no");

  useEffect(() => {
    if (!uid) {
      setClaim("no");
      return;
    }
    setClaim("loading");
    let cancelled = false;
    const current = getFirebase().auth.currentUser;
    if (!current || current.uid !== uid) {
      setClaim("no");
      return;
    }
    void current
      .getIdTokenResult()
      .then((result) => {
        if (!cancelled) setClaim(result.claims.superAdmin === true ? "yes" : "no");
      })
      .catch(() => {
        if (!cancelled) setClaim("no");
      });
    return () => {
      cancelled = true;
    };
  }, [uid]);

  return uid ? claim : "no";
}

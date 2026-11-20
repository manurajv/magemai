import { useCallback, useEffect, useState } from "react";
import type { User } from "firebase/auth";
import type { ClaimState } from "@/lib/platform/access";
import { getFirebase } from "@/lib/firebase/client";

/**
 * A session that started before the operator granted `superAdmin` keeps the
 * old ID token until something forces a refresh. Read the cached token first.
 * When the claim is missing, refresh once. `forceRefresh` skips the cache for
 * an explicit check. The registry document, not this claim, authorizes data.
 */
export async function readSuperAdminClaim(user: User, forceRefresh = false): Promise<boolean> {
  if (!forceRefresh) {
    const cached = await user.getIdTokenResult();
    if (cached.claims.superAdmin === true) return true;
  }
  const fresh = await user.getIdTokenResult(true);
  return fresh.claims.superAdmin === true;
}

export function useSuperAdminClaim(uid: string | null): {
  claim: ClaimState;
  recheck: () => void;
} {
  const [claim, setClaim] = useState<ClaimState>(uid ? "loading" : "no");
  const [attempt, setAttempt] = useState(0);
  const recheck = useCallback(() => {
    setAttempt((value) => value + 1);
  }, []);

  useEffect(() => {
    if (!uid) {
      setClaim("no");
      return;
    }
    const current = getFirebase().auth.currentUser;
    if (!current || current.uid !== uid) {
      setClaim("no");
      return;
    }
    setClaim("loading");
    let cancelled = false;
    void readSuperAdminClaim(current, attempt > 0)
      .then((allowed) => {
        if (!cancelled) setClaim(allowed ? "yes" : "no");
      })
      .catch(() => {
        if (!cancelled) setClaim("no");
      });
    return () => {
      cancelled = true;
    };
  }, [uid, attempt]);

  return { claim: uid ? claim : "no", recheck };
}

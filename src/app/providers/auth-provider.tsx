import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  getRedirectResult,
  onAuthStateChanged,
  onIdTokenChanged,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import { AuthContext, type AuthContextValue, type AuthUser } from "@/app/providers/auth-context";
import { bootstrapAuthUser, clearActiveBusinessHint } from "@/lib/auth/session";
import { mapAuthError } from "@/lib/auth/errors";
import { getFirebase } from "@/lib/firebase/client";

function toAuthUser(user: User | null): AuthUser | null {
  if (!user) return null;
  return {
    uid: user.uid,
    email: user.email,
    emailVerified: user.emailVerified,
    displayName: user.displayName,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthContextValue["status"]>("loading");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [redirectError, setRedirectError] = useState<string | null>(null);
  const bootstrapped = useRef(new Set<string>());
  const redirectStarted = useRef(false);

  const applyUser = useCallback((next: User | null) => {
    setUser(toAuthUser(next));
    setStatus("ready");
    if (!next || bootstrapped.current.has(next.uid)) return;
    bootstrapped.current.add(next.uid);
    void bootstrapAuthUser(next).catch((error: unknown) => {
      bootstrapped.current.delete(next.uid);
      console.error(error);
    });
  }, []);

  useEffect(() => {
    const { auth } = getFirebase();
    if (!redirectStarted.current) {
      redirectStarted.current = true;
      void getRedirectResult(auth).catch((error: unknown) => {
        setRedirectError(mapAuthError(error));
      });
    }
    const stopUser = onAuthStateChanged(auth, applyUser);
    const stopToken = onIdTokenChanged(auth, applyUser);
    return () => {
      stopUser();
      stopToken();
    };
  }, [applyUser]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      redirectError,
      clearRedirectError: () => setRedirectError(null),
      signOut: async () => {
        clearActiveBusinessHint();
        bootstrapped.current.clear();
        await firebaseSignOut(getFirebase().auth);
      },
      reloadUser: async () => {
        const current = getFirebase().auth.currentUser;
        if (!current) return false;
        await current.reload();
        await current.getIdToken(true);
        bootstrapped.current.delete(current.uid);
        await bootstrapAuthUser(current);
        bootstrapped.current.add(current.uid);
        applyUser(current);
        return current.emailVerified;
      },
    }),
    [applyUser, redirectError, status, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

import { useMemo, type ReactNode } from "react";
import { AuthContext, type AuthContextValue } from "@/app/providers/auth-context";

/**
 * Stub until step 5. It does not subscribe to Auth and it does not render a session.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const value = useMemo<AuthContextValue>(() => ({ status: "ready", user: null }), []);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

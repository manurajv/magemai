import { createContext, useContext } from "react";

export type AuthUser = {
  uid: string;
  email: string | null;
  emailVerified: boolean;
  displayName: string | null;
};

export type AuthContextValue = {
  status: "loading" | "ready";
  user: AuthUser | null;
  redirectError: string | null;
  clearRedirectError: () => void;
  signOut: () => Promise<void>;
  reloadUser: () => Promise<boolean>;
};

const empty = {
  status: "ready",
  user: null,
  redirectError: null,
  clearRedirectError: () => undefined,
  signOut: async () => undefined,
  reloadUser: async () => false,
} satisfies AuthContextValue;

export const AuthContext = createContext<AuthContextValue>(empty);

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}

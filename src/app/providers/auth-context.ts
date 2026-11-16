import { createContext, useContext } from "react";

export type AuthContextValue = {
  status: "ready";
  user: null;
};

export const AuthContext = createContext<AuthContextValue>({ status: "ready", user: null });

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}

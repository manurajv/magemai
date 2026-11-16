import { createContext, useContext } from "react";
import type { FirebaseMode } from "@/lib/firebase/env";

export type FirebaseUiState =
  | {
      status: "ready";
      mode: FirebaseMode;
      projectId: string;
      emulatorHost: string | null;
    }
  | { status: "error"; message: string };

export const FirebaseContext = createContext<FirebaseUiState | null>(null);

export function useFirebase(): Extract<FirebaseUiState, { status: "ready" }> {
  const value = useContext(FirebaseContext);
  if (!value || value.status !== "ready") {
    throw new Error("useFirebase must be used inside FirebaseProvider.");
  }
  return value;
}

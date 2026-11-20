import { useState, type ReactNode } from "react";
import { FirebaseContext, type FirebaseUiState } from "@/app/providers/firebase-context";
import { ErrorState } from "@/components/shared/error-state";
import { getFirebase } from "@/lib/firebase/client";

export function FirebaseProvider({ children }: { children: ReactNode }) {
  const [state] = useState<FirebaseUiState>(() => {
    try {
      const services = getFirebase();
      return {
        status: "ready",
        mode: services.mode,
        projectId: services.projectId,
        emulatorHost: services.emulatorHost,
      };
    } catch (error) {
      return {
        status: "error",
        message: error instanceof Error ? error.message : "Firebase failed to start.",
      };
    }
  });

  if (state.status === "error") {
    return (
      <div className="mx-auto flex min-h-dvh max-w-lg items-center px-4 py-16">
        <ErrorState
          title="Firebase is unavailable"
          message={state.message}
          onRetry={() => window.location.reload()}
        />
      </div>
    );
  }

  return <FirebaseContext.Provider value={state}>{children}</FirebaseContext.Provider>;
}

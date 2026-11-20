import type { ReactNode } from "react";
import { ActiveBusinessProvider } from "@/app/providers/active-business-provider";
import { AuthProvider } from "@/app/providers/auth-provider";
import { FirebaseProvider } from "@/app/providers/firebase-provider";
import { QueryProvider } from "@/app/providers/query-provider";
import { Toaster } from "@/components/ui/toast";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <FirebaseProvider>
        <AuthProvider>
          <ActiveBusinessProvider>
            {children}
            <Toaster />
          </ActiveBusinessProvider>
        </AuthProvider>
      </FirebaseProvider>
    </QueryProvider>
  );
}

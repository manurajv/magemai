import { useState } from "react";
import { GoogleAuthProvider, signInWithEmailAndPassword, signInWithRedirect } from "firebase/auth";
import type { LoginInput } from "@shared/validation/auth";
import { LoginForm } from "@/app/auth/login-form";
import { useAuth } from "@/app/providers/auth-context";
import { PageHeader } from "@/components/shared/page-header";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { mapAuthError } from "@/lib/auth/errors";
import { getFirebase } from "@/lib/firebase/client";

function googleAuthEnabled(): boolean {
  return import.meta.env.VITE_GOOGLE_AUTH_ENABLED === "true";
}

export function LoginPage() {
  useDocumentTitle("Sign in");
  const auth = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const visibleError = error ?? auth.redirectError;

  async function onSubmit(input: LoginInput) {
    setSubmitting(true);
    setError(null);
    auth.clearRedirectError();
    try {
      await signInWithEmailAndPassword(getFirebase().auth, input.email, input.password);
    } catch (caught) {
      setError(mapAuthError(caught));
    } finally {
      setSubmitting(false);
    }
  }

  async function onGoogle() {
    setSubmitting(true);
    setError(null);
    auth.clearRedirectError();
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      await signInWithRedirect(getFirebase().auth, provider);
    } catch (caught) {
      setError(mapAuthError(caught));
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Sign in"
        description="Use your email and password, or Google when it is enabled."
      />
      <LoginForm
        onSubmit={onSubmit}
        onGoogle={onGoogle}
        showGoogle={googleAuthEnabled()}
        submitting={submitting}
        error={visibleError}
      />
    </div>
  );
}

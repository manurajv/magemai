import { useEffect, useState } from "react";
import { sendEmailVerification } from "firebase/auth";
import { useNavigate } from "react-router";
import { useAuth } from "@/app/providers/auth-context";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { mapAuthError } from "@/lib/auth/errors";
import { emailVerificationSettings } from "@/lib/auth/email-link";
import { getFirebase } from "@/lib/firebase/client";

export function VerifyEmailPage() {
  useDocumentTitle("Verify email");
  const auth = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState<"resend" | "refresh" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (auth.user?.emailVerified) navigate("/admin", { replace: true });
  }, [auth.user, navigate]);

  async function resend() {
    const current = getFirebase().auth.currentUser;
    if (!current) return;
    setBusy("resend");
    setError(null);
    setMessage(null);
    try {
      const verified = await auth.reloadUser();
      if (verified) {
        navigate("/admin", { replace: true });
        return;
      }
      await sendEmailVerification(current, emailVerificationSettings(window.location.origin));
      setMessage("A new verification message is on its way.");
    } catch (caught) {
      setError(mapAuthError(caught));
    } finally {
      setBusy(null);
    }
  }

  async function refresh() {
    setBusy("refresh");
    setError(null);
    setMessage(null);
    try {
      const verified = await auth.reloadUser();
      if (verified) {
        navigate("/admin", { replace: true });
        return;
      }
      setMessage("This address is not verified yet.");
    } catch (caught) {
      setError(mapAuthError(caught));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Verify your email"
        description="You can stay signed in. Onboarding and the dashboard stay closed until this address is verified."
      />
      <p className="text-sm text-foreground">
        Waiting for a message to <span className="font-medium">{auth.user?.email}</span>.
      </p>
      {message ? (
        <p role="status" className="text-sm text-muted-foreground">
          {message}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <Button type="button" onClick={() => void resend()} disabled={busy !== null}>
        {busy === "resend" ? "Sending…" : "Resend email"}
      </Button>
      <Button
        type="button"
        variant="outline"
        onClick={() => void refresh()}
        disabled={busy !== null}
      >
        {busy === "refresh" ? "Checking…" : "I've verified"}
      </Button>
      <Button
        type="button"
        variant="ghost"
        onClick={() => void auth.signOut()}
        disabled={busy !== null}
      >
        Sign out
      </Button>
    </div>
  );
}

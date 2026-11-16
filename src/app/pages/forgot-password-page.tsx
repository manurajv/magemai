import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { sendPasswordResetEmail } from "firebase/auth";
import { useForm } from "react-hook-form";
import { Link } from "react-router";
import { forgotPasswordSchema, type ForgotPasswordInput } from "@shared/validation/auth";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { firebaseErrorCode, mapAuthError } from "@/lib/auth/errors";
import { getFirebase } from "@/lib/firebase/client";

const RESET_NOTICE = "If an account exists for that email, a reset message is on its way.";

export function ForgotPasswordPage() {
  useDocumentTitle("Reset password");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const form = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Reset password"
        description="We will send a link if this email belongs to an account. The reply does not say whether the email is registered."
      />
      <form
        className="flex flex-col gap-4"
        noValidate
        onSubmit={form.handleSubmit(async (input) => {
          setSubmitting(true);
          setError(null);
          setNotice(null);
          try {
            await sendPasswordResetEmail(getFirebase().auth, input.email, {
              url: `${window.location.origin}/auth/action`,
              handleCodeInApp: false,
            });
            setNotice(RESET_NOTICE);
          } catch (caught) {
            const code = firebaseErrorCode(caught);
            if (code === "auth/user-not-found" || code === "auth/invalid-credential") {
              setNotice(RESET_NOTICE);
            } else {
              setError(mapAuthError(caught));
            }
          } finally {
            setSubmitting(false);
          }
        })}
      >
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          error={form.formState.errors.email?.message}
          {...form.register("email")}
        />
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        {notice ? (
          <p role="status" className="text-sm text-muted-foreground">
            {notice}
          </p>
        ) : null}
        <Button type="submit" disabled={submitting}>
          {submitting ? "Sending…" : "Send reset link"}
        </Button>
      </form>
      <p className="text-sm text-muted-foreground">
        <Link to="/login" className="text-primary underline-offset-4 hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}

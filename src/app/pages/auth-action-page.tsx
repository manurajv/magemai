import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { applyActionCode, confirmPasswordReset } from "firebase/auth";
import { useForm } from "react-hook-form";
import { Link, useSearchParams } from "react-router";
import { resetPasswordSchema, type ResetPasswordInput } from "@shared/validation/auth";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { mapAuthError } from "@/lib/auth/errors";
import { getFirebase } from "@/lib/firebase/client";

export function AuthActionPage() {
  useDocumentTitle("Account link");
  const [params] = useSearchParams();
  const mode = params.get("mode");
  const code = params.get("oobCode");
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const form = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "" },
  });

  if (!code) {
    return (
      <PageHeader
        title="This link is incomplete"
        description="Request a new email from the sign-in page."
      />
    );
  }

  if (mode === "verifyEmail") {
    return (
      <div className="flex flex-col gap-4">
        <PageHeader
          title="Confirm your email"
          description="This marks the address as verified in the emulator or the live project."
        />
        {done ? <p role="status">{done}</p> : null}
        {error ? <p role="alert">{error}</p> : null}
        <Button
          type="button"
          disabled={submitting || done !== null}
          onClick={() => {
            setSubmitting(true);
            setError(null);
            void applyActionCode(getFirebase().auth, code)
              .then(() => setDone("Email verified. Return to the app and choose I've verified."))
              .catch((caught: unknown) => setError(mapAuthError(caught)))
              .finally(() => setSubmitting(false));
          }}
        >
          {submitting ? "Confirming…" : "Confirm email"}
        </Button>
        <Link
          to="/verify-email"
          className="text-sm text-primary underline-offset-4 hover:underline"
        >
          Back to verification
        </Link>
      </div>
    );
  }

  if (mode === "resetPassword") {
    return (
      <div className="flex flex-col gap-4">
        <PageHeader
          title="Choose a new password"
          description="Use at least 8 characters. This replaces the previous password."
        />
        <form
          className="flex flex-col gap-4"
          noValidate
          onSubmit={form.handleSubmit(async (input) => {
            setSubmitting(true);
            setError(null);
            try {
              await confirmPasswordReset(getFirebase().auth, code, input.password);
              setDone("Password updated. Sign in with the new password.");
            } catch (caught) {
              setError(mapAuthError(caught));
            } finally {
              setSubmitting(false);
            }
          })}
        >
          <Input
            label="New password"
            type="password"
            autoComplete="new-password"
            error={form.formState.errors.password?.message}
            {...form.register("password")}
          />
          {error ? <p role="alert">{error}</p> : null}
          {done ? <p role="status">{done}</p> : null}
          <Button type="submit" disabled={submitting || done !== null}>
            {submitting ? "Saving…" : "Save password"}
          </Button>
        </form>
        <Link to="/login" className="text-sm text-primary underline-offset-4 hover:underline">
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <PageHeader
      title="This link is not recognised"
      description="Request a new email from the sign-in page."
    />
  );
}

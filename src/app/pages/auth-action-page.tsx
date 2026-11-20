import { useEffect, useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { applyActionCode, confirmPasswordReset } from "firebase/auth";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useSearchParams } from "react-router";
import { resetPasswordSchema, type ResetPasswordInput } from "@shared/validation/auth";
import { useAuth } from "@/app/providers/auth-context";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { mapAuthError } from "@/lib/auth/errors";
import {
  EMAIL_VERIFIED_MESSAGE,
  finishEmailVerification,
  type VerificationOutcome,
} from "@/lib/auth/email-link";
import { getFirebase } from "@/lib/firebase/client";

const verificationAttempts = new Map<string, Promise<VerificationOutcome>>();

export function AuthActionPage() {
  useDocumentTitle("Account link");
  const [params] = useSearchParams();
  const mode = params.get("mode");
  const code = params.get("oobCode");
  const flow = params.get("flow");
  const navigate = useNavigate();
  const auth = useAuth();
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const form = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "" },
  });
  const verifying = mode === "verifyEmail" || flow === "verifyEmail";
  const reloadUser = useRef(auth.reloadUser);
  reloadUser.current = auth.reloadUser;

  useEffect(() => {
    if (!verifying) return;
    let cancelled = false;
    setSubmitting(true);
    setError(null);
    const key = `${mode ?? ""}:${code ?? ""}:${flow ?? ""}`;
    const attempt =
      verificationAttempts.get(key) ??
      finishEmailVerification({
        mode,
        code,
        flow,
        applyCode: (oobCode) => applyActionCode(getFirebase().auth, oobCode),
        currentUser: () => getFirebase().auth.currentUser,
      });
    verificationAttempts.set(key, attempt);
    void attempt
      .then(async (outcome) => {
        if (cancelled) return;
        if (outcome === "still-unverified") {
          setError("This address is not verified yet.");
          return;
        }
        if (outcome === "app") await reloadUser.current();
        if (cancelled) return;
        setDone(EMAIL_VERIFIED_MESSAGE);
        window.setTimeout(() => {
          if (!cancelled) navigate(outcome === "app" ? "/admin" : "/login", { replace: true });
        }, 400);
      })
      .catch((caught: unknown) => {
        if (!cancelled) setError(mapAuthError(caught));
      })
      .finally(() => {
        if (!cancelled) setSubmitting(false);
      });
    return () => {
      cancelled = true;
    };
  }, [code, flow, mode, navigate, verifying]);

  if (verifying) {
    return (
      <div className="flex flex-col gap-4">
        <PageHeader title="Confirm your email" description="This marks the address as verified." />
        {submitting ? <p role="status">Confirming your email…</p> : null}
        {done ? <p role="status">{done}</p> : null}
        {error ? <p role="alert">{error}</p> : null}
        <Link to="/login" className="text-sm text-primary underline-offset-4 hover:underline">
          Sign in
        </Link>
      </div>
    );
  }

  if (!code) {
    return (
      <PageHeader
        title="This link is incomplete"
        description="Request a new email from the sign-in page."
      />
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

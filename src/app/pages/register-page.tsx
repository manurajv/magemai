import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  updateProfile,
} from "firebase/auth";
import { useForm } from "react-hook-form";
import { Link } from "react-router";
import { registerSchema, type RegisterInput } from "@shared/validation/auth";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { mapAuthError } from "@/lib/auth/errors";
import { emailVerificationSettings } from "@/lib/auth/email-link";
import { bootstrapAuthUser } from "@/lib/auth/session";
import { getFirebase } from "@/lib/firebase/client";

export function RegisterPage() {
  useDocumentTitle("Create account");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { displayName: "", email: "", password: "" },
  });

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Create account"
        description="This creates your personal account. It does not create a business."
      />
      <form
        className="flex flex-col gap-4"
        noValidate
        onSubmit={form.handleSubmit(async (input) => {
          setSubmitting(true);
          setError(null);
          try {
            const credential = await createUserWithEmailAndPassword(
              getFirebase().auth,
              input.email,
              input.password,
            );
            await updateProfile(credential.user, { displayName: input.displayName });
            await sendEmailVerification(
              credential.user,
              emailVerificationSettings(window.location.origin),
            );
            await bootstrapAuthUser(credential.user).catch((caught: unknown) => {
              console.error(caught);
            });
          } catch (caught) {
            setError(mapAuthError(caught));
          } finally {
            setSubmitting(false);
          }
        })}
      >
        <Input
          label="Your name"
          autoComplete="name"
          error={form.formState.errors.displayName?.message}
          {...form.register("displayName")}
        />
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          error={form.formState.errors.email?.message}
          {...form.register("email")}
        />
        <Input
          label="Password"
          type="password"
          autoComplete="new-password"
          hint="At least 8 characters."
          error={form.formState.errors.password?.message}
          {...form.register("password")}
        />
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <Button type="submit" disabled={submitting}>
          {submitting ? "Creating account…" : "Create account"}
        </Button>
      </form>
      <p className="text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link to="/login" className="text-primary underline-offset-4 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}

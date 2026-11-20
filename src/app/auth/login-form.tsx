import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Link } from "react-router";
import { loginSchema, type LoginInput } from "@shared/validation/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type LoginFormProps = {
  onSubmit: (input: LoginInput) => Promise<void>;
  onGoogle?: () => Promise<void>;
  showGoogle: boolean;
  submitting: boolean;
  error: string | null;
};

export function LoginForm({ onSubmit, onGoogle, showGoogle, submitting, error }: LoginFormProps) {
  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  return (
    <form
      className="flex flex-col gap-4"
      noValidate
      onSubmit={form.handleSubmit(async (input) => {
        await onSubmit(input);
      })}
    >
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
        autoComplete="current-password"
        error={form.formState.errors.password?.message}
        {...form.register("password")}
      />
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <Button type="submit" disabled={submitting}>
        {submitting ? "Signing in…" : "Sign in"}
      </Button>
      {showGoogle && onGoogle ? (
        <Button
          type="button"
          variant="outline"
          disabled={submitting}
          onClick={() => void onGoogle()}
        >
          Continue with Google
        </Button>
      ) : null}
      <p className="text-sm text-muted-foreground">
        <Link to="/forgot-password" className="text-primary underline-offset-4 hover:underline">
          Forgot your password?
        </Link>
      </p>
      <p className="text-sm text-muted-foreground">
        New to Magemai?{" "}
        <Link to="/register" className="text-primary underline-offset-4 hover:underline">
          Create an account
        </Link>
      </p>
    </form>
  );
}

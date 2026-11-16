import { Button } from "@/components/ui/button";

type ErrorStateProps = {
  title: string;
  message: string;
  onRetry?: () => void;
};

export function ErrorState({ title, message, onRetry }: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="flex flex-col items-start gap-3 rounded-lg border border-destructive/30 bg-card px-6 py-8"
    >
      <h2 className="text-lg font-semibold tracking-tight text-destructive">{title}</h2>
      <p className="max-w-prose text-sm text-muted-foreground">{message}</p>
      {onRetry ? (
        <Button type="button" variant="outline" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </div>
  );
}

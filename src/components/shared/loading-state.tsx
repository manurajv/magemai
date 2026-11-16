import { cn } from "@/lib/utilities/cn";

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "size-4 animate-spin rounded-full border-2 border-primary border-t-transparent",
        className,
      )}
      aria-hidden
    />
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-muted", className)} />;
}

export function LoadingState({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 text-sm text-muted-foreground">
      <Spinner />
      <span role="status">{label}</span>
    </div>
  );
}

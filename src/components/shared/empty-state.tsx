import type { ReactNode } from "react";

type EmptyStateProps = {
  title: string;
  description: string;
  action?: ReactNode;
};

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-lg border border-dashed border-border bg-card px-6 py-8">
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      <p className="max-w-prose text-sm text-muted-foreground">{description}</p>
      {action}
    </div>
  );
}

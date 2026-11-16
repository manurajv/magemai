export function NotImplementedNotice({ what }: { what: string }) {
  return (
    <p className="rounded-md border border-border bg-muted px-4 py-3 text-sm text-muted-foreground">
      {what} is not yet implemented.
    </p>
  );
}

import { useQuery } from "@tanstack/react-query";
import { ErrorState } from "@/components/shared/error-state";
import { LoadingState } from "@/components/shared/loading-state";
import { PageHeader } from "@/components/shared/page-header";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { countCollection, mapPlatformError } from "@/lib/platform/admin";

function CountCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3">
      <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</dt>
      <dd className="mt-1 text-2xl font-semibold">{value}</dd>
    </div>
  );
}

export function SuperAdminPage() {
  useDocumentTitle("Platform");
  const users = useQuery({
    queryKey: ["platform-count", "users"],
    queryFn: () => countCollection("users"),
  });
  const businesses = useQuery({
    queryKey: ["platform-count", "businesses"],
    queryFn: () => countCollection("businesses"),
  });

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <PageHeader
        title="Platform"
        description="Counts of accounts and businesses. Lists and status changes are in the sections beside this page."
      />
      {users.isPending || businesses.isPending ? <LoadingState label="Counting records" /> : null}
      {users.isError || businesses.isError ? (
        <ErrorState
          title="Counts unavailable"
          message={mapPlatformError(users.error ?? businesses.error)}
          onRetry={() => {
            void users.refetch();
            void businesses.refetch();
          }}
        />
      ) : null}
      {users.isSuccess && businesses.isSuccess ? (
        <dl className="grid gap-4 sm:grid-cols-2">
          <CountCard label="Users" value={users.data} />
          <CountCard label="Businesses" value={businesses.data} />
        </dl>
      ) : null}
    </div>
  );
}

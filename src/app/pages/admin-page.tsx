import { useActiveBusiness } from "@/app/providers/active-business-context";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { roleLabel } from "@shared/permissions";

export function AdminPage() {
  useDocumentTitle("Dashboard");
  const workspace = useActiveBusiness();
  if (workspace.status !== "ready") return null;
  const { active } = workspace;

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <PageHeader
        title="Dashboard"
        description="The business you are working in. Counts and activity arrive in later phases."
      />
      <dl className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-border bg-card px-4 py-3">
          <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Business
          </dt>
          <dd className="mt-1 text-base font-medium" data-testid="active-business-name">
            {active.name}
          </dd>
        </div>
        <div className="rounded-lg border border-border bg-card px-4 py-3">
          <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Your role
          </dt>
          <dd className="mt-1 text-base font-medium">{roleLabel(active.role)}</dd>
        </div>
        <div className="rounded-lg border border-border bg-card px-4 py-3">
          <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Status
          </dt>
          <dd className="mt-1 text-base font-medium capitalize">{active.businessStatus}</dd>
        </div>
        <div className="rounded-lg border border-border bg-card px-4 py-3">
          <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Verification
          </dt>
          <dd className="mt-1 text-base font-medium capitalize">{active.verificationStatus}</dd>
        </div>
      </dl>
      <EmptyState
        title="No activity yet"
        description="Bookings, finances, and collaboration arrive in later phases. This screen does not invent counts."
      />
    </div>
  );
}

import { useState } from "react";
import { PageControls } from "@/app/platform/page-controls";
import { useCursorPage } from "@/app/platform/use-cursor-page";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { LoadingState } from "@/components/shared/loading-state";
import { PageHeader } from "@/components/shared/page-header";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { loadPlatformAudit, mapPlatformError } from "@/lib/platform/admin";
import { formatUtc } from "@/lib/platform/format";

const selectClass = "h-11 rounded-md border border-input bg-card px-3 text-sm text-foreground";

export function SuperAdminAuditPage() {
  useDocumentTitle("Audit logs");
  const [scope, setScope] = useState<"all" | "platform" | "business">("all");
  const [businessId, setBusinessId] = useState("");
  const [applied, setApplied] = useState({ scope, businessId: "" });
  const list = useCursorPage(["platform-audit", applied.scope, applied.businessId], (cursor) =>
    loadPlatformAudit({ cursor, scope: applied.scope, businessId: applied.businessId }),
  );
  const { query } = list;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Audit logs"
        description="Newest first. Times are UTC. Filter by scope, and optionally by a business id."
      />
      <form
        className="flex flex-col gap-4 md:flex-row md:items-end"
        onSubmit={(event) => {
          event.preventDefault();
          setApplied({ scope, businessId: businessId.trim() });
        }}
      >
        <label className="flex flex-col gap-2 text-sm font-medium">
          Scope
          <select
            className={selectClass}
            value={scope}
            onChange={(event) => setScope(event.target.value as typeof scope)}
          >
            <option value="all">All</option>
            <option value="platform">Platform</option>
            <option value="business">Business</option>
          </select>
        </label>
        <Input
          label="Business id"
          value={businessId}
          onChange={(event) => setBusinessId(event.target.value)}
          placeholder="Optional"
        />
        <button
          type="submit"
          className="h-11 rounded-md border border-border bg-card px-4 text-sm font-medium"
        >
          Apply filter
        </button>
      </form>
      {query.isPending ? <LoadingState label="Loading audit logs" /> : null}
      {query.isError ? (
        <ErrorState
          title="Audit logs unavailable"
          message={mapPlatformError(query.error)}
          onRetry={() => void query.refetch()}
        />
      ) : null}
      {query.isSuccess && query.data.rows.length === 0 ? (
        <EmptyState title="No audit logs" description="Nothing matches this filter." />
      ) : null}
      {query.isSuccess && query.data.rows.length > 0 ? (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Scope</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Summary</TableHead>
                <TableHead>Business</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.data.rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{formatUtc(row.createdAtMs)}</TableCell>
                  <TableCell className="capitalize">{row.scope}</TableCell>
                  <TableCell>{row.action}</TableCell>
                  <TableCell>{row.summary}</TableCell>
                  <TableCell>{row.businessId || "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <PageControls
            page={list.page}
            hasMore={query.data.hasMore}
            onPrevious={list.previous}
            onNext={list.next}
          />
        </>
      ) : null}
    </div>
  );
}

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { BusinessLifecycle, VerificationStatus } from "@shared/validation/platform";
import { PageControls } from "@/app/platform/page-controls";
import { useCursorPage } from "@/app/platform/use-cursor-page";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { LoadingState } from "@/components/shared/loading-state";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useDocumentTitle } from "@/hooks/use-document-title";
import {
  loadPlatformBusinesses,
  mapPlatformError,
  saveBusinessStatus,
  saveBusinessVerification,
  type BusinessChangeResult,
  type PlatformBusinessRow,
} from "@/lib/platform/admin";
import { formatUtc } from "@/lib/platform/format";

const selectClass =
  "h-9 rounded-md border border-input bg-card px-2 text-sm text-foreground disabled:opacity-50";

const verificationOptions: VerificationStatus[] = ["unverified", "pending", "verified", "rejected"];

type Pending =
  | { kind: "status"; row: PlatformBusinessRow; status: BusinessLifecycle }
  | { kind: "verification"; row: PlatformBusinessRow; verificationStatus: VerificationStatus };

export function SuperAdminBusinessesPage({ unverifiedOnly = false }: { unverifiedOnly?: boolean }) {
  useDocumentTitle(unverifiedOnly ? "Verifications" : "Businesses");
  const list = useCursorPage(["platform-businesses", unverifiedOnly], (cursor) =>
    loadPlatformBusinesses(cursor, unverifiedOnly),
  );
  const client = useQueryClient();
  const [drafts, setDrafts] = useState<Record<string, VerificationStatus>>({});
  const [pending, setPending] = useState<Pending | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: async (action: Pending): Promise<BusinessChangeResult> => {
      if (action.kind === "status") return saveBusinessStatus(action.row.id, action.status);
      return saveBusinessVerification(action.row.id, action.verificationStatus);
    },
    onSuccess: async (result) => {
      setPending(null);
      setNotice(
        result.changed && result.summary
          ? `${result.summary} Audit ${result.auditId ?? ""}.`
          : "No change was saved.",
      );
      await client.invalidateQueries({ queryKey: ["platform-businesses"] });
      await client.invalidateQueries({ queryKey: ["platform-count"] });
      await client.invalidateQueries({ queryKey: ["platform-audit"] });
    },
  });
  const { query } = list;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={unverifiedOnly ? "Verifications" : "Businesses"}
        description={
          unverifiedOnly
            ? "Businesses that are not verified. Status and verification changes are confirmed, then audited."
            : "Every business, with status and verification. Changes are confirmed, then audited."
        }
      />
      {notice ? (
        <p role="status" className="text-sm text-foreground">
          {notice}
        </p>
      ) : null}
      {mutation.isError ? (
        <ErrorState title="Change failed" message={mapPlatformError(mutation.error)} />
      ) : null}
      {pending ? (
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-card px-4 py-4">
          <h2 className="text-base font-semibold">
            {pending.kind === "status"
              ? `${pending.status === "suspended" ? "Suspend" : "Reactivate"} ${pending.row.name}?`
              : `Set ${pending.row.name} verification to ${pending.verificationStatus}?`}
          </h2>
          <div className="flex gap-3">
            <Button
              type="button"
              variant={
                pending.kind === "status" && pending.status === "suspended"
                  ? "destructive"
                  : "primary"
              }
              disabled={mutation.isPending}
              onClick={() => mutation.mutate(pending)}
            >
              {mutation.isPending ? "Saving…" : "Confirm"}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={mutation.isPending}
              onClick={() => setPending(null)}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : null}
      {query.isPending ? <LoadingState label="Loading businesses" /> : null}
      {query.isError ? (
        <ErrorState
          title="Businesses unavailable"
          message={mapPlatformError(query.error)}
          onRetry={() => void query.refetch()}
        />
      ) : null}
      {query.isSuccess && query.data.rows.length === 0 ? (
        <EmptyState
          title={unverifiedOnly ? "No businesses waiting" : "No businesses"}
          description={
            unverifiedOnly
              ? "Every business is verified, or none have been created."
              : "No businesses have been created yet."
          }
        />
      ) : null}
      {query.isSuccess && query.data.rows.length > 0 ? (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Verification</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.data.rows.map((row) => {
                const draft = drafts[row.id] ?? row.verificationStatus;
                const nextStatus: BusinessLifecycle =
                  row.status === "active" ? "suspended" : "active";
                return (
                  <TableRow key={row.id}>
                    <TableCell>{row.name}</TableCell>
                    <TableCell>{row.slug}</TableCell>
                    <TableCell>{row.ownerLabel}</TableCell>
                    <TableCell className="capitalize">{row.status}</TableCell>
                    <TableCell className="capitalize">{row.verificationStatus}</TableCell>
                    <TableCell>{formatUtc(row.createdAtMs)}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant={nextStatus === "suspended" ? "destructive" : "primary"}
                          onClick={() => setPending({ kind: "status", row, status: nextStatus })}
                        >
                          {nextStatus === "suspended" ? "Suspend" : "Reactivate"}
                        </Button>
                        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                          Verification
                          <select
                            className={selectClass}
                            aria-label={`Verification for ${row.name}`}
                            value={draft}
                            onChange={(event) =>
                              setDrafts((current) => ({
                                ...current,
                                [row.id]: event.target.value as VerificationStatus,
                              }))
                            }
                          >
                            {verificationOptions.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        </label>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={draft === row.verificationStatus}
                          onClick={() =>
                            setPending({ kind: "verification", row, verificationStatus: draft })
                          }
                        >
                          Update verification
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
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

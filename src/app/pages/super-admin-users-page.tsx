import { ErrorState } from "@/components/shared/error-state";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadingState } from "@/components/shared/loading-state";
import { PageHeader } from "@/components/shared/page-header";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { PageControls } from "@/app/platform/page-controls";
import { useCursorPage } from "@/app/platform/use-cursor-page";
import { loadPlatformUsers, mapPlatformError } from "@/lib/platform/admin";
import { formatUtc } from "@/lib/platform/format";

export function SuperAdminUsersPage() {
  useDocumentTitle("Users");
  const list = useCursorPage(["platform-users"], loadPlatformUsers);
  const { query } = list;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Users" description="Accounts on the platform. This list is read-only." />
      {query.isPending ? <LoadingState label="Loading users" /> : null}
      {query.isError ? (
        <ErrorState
          title="Users unavailable"
          message={mapPlatformError(query.error)}
          onRetry={() => void query.refetch()}
        />
      ) : null}
      {query.isSuccess && query.data.rows.length === 0 ? (
        <EmptyState title="No users" description="No accounts have been created yet." />
      ) : null}
      {query.isSuccess && query.data.rows.length > 0 ? (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Email verified</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.data.rows.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.displayName}</TableCell>
                  <TableCell className="capitalize">{user.status}</TableCell>
                  <TableCell>{user.emailVerified ? "Yes" : "No"}</TableCell>
                  <TableCell>{formatUtc(user.createdAtMs)}</TableCell>
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

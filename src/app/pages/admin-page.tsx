import { EmptyState } from "@/components/shared/empty-state";
import { NotImplementedNotice } from "@/components/shared/not-implemented";
import { PageHeader } from "@/components/shared/page-header";
import { useDocumentTitle } from "@/hooks/use-document-title";

export function AdminPage() {
  useDocumentTitle("Dashboard");
  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <PageHeader
        title="Dashboard"
        description="Layout preview. No business is loaded and no counts are shown."
      />
      <NotImplementedNotice what="The dashboard" />
      <EmptyState
        title="No activity yet"
        description="Bookings, finances, and other activity arrive in later phases. Nothing on this screen is sample business data."
      />
    </div>
  );
}

import { EmptyState } from "@/components/shared/empty-state";
import { NotImplementedNotice } from "@/components/shared/not-implemented";
import { PageHeader } from "@/components/shared/page-header";
import { useDocumentTitle } from "@/hooks/use-document-title";

export function SuperAdminPage() {
  useDocumentTitle("Super admin");
  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <PageHeader
        title="Super admin"
        description="Layout preview. Platform lists and actions are not available yet."
      />
      <NotImplementedNotice what="Super admin" />
      <EmptyState
        title="No platform records"
        description="User, business, and audit lists are later steps. This screen does not invent counts."
      />
    </div>
  );
}

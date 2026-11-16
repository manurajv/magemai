import { NotImplementedNotice } from "@/components/shared/not-implemented";
import { PageHeader } from "@/components/shared/page-header";
import { useDocumentTitle } from "@/hooks/use-document-title";

export function RegisterPage() {
  useDocumentTitle("Create account");
  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Create account"
        description="Registration does not create an account yet."
      />
      <NotImplementedNotice what="Registration" />
    </div>
  );
}

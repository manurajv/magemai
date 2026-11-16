import { NotImplementedNotice } from "@/components/shared/not-implemented";
import { PageHeader } from "@/components/shared/page-header";
import { useDocumentTitle } from "@/hooks/use-document-title";

export function LoginPage() {
  useDocumentTitle("Sign in");
  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Sign in"
        description="Email, password, and Google sign-in are not available yet."
      />
      <NotImplementedNotice what="Sign-in" />
    </div>
  );
}

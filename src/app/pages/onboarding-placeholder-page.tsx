import { NotImplementedNotice } from "@/components/shared/not-implemented";
import { PageHeader } from "@/components/shared/page-header";
import { useDocumentTitle } from "@/hooks/use-document-title";

export function OnboardingPlaceholderPage() {
  useDocumentTitle("Create a business");
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8">
      <PageHeader
        title="Create a business"
        description="Your email is verified. The onboarding wizard is not part of this step."
      />
      <NotImplementedNotice what="Onboarding" />
    </div>
  );
}

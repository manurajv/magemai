import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate } from "react-router";
import type { BusinessInput } from "@shared/validation/business";
import { useAuth } from "@/app/providers/auth-context";
import { OnboardingWizard } from "@/app/pages/onboarding-wizard";
import { ErrorState } from "@/components/shared/error-state";
import { LoadingState } from "@/components/shared/loading-state";
import { Button } from "@/components/ui/button";
import { DropdownMenu } from "@/components/ui/dropdown-menu";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { firebaseErrorCode } from "@/lib/auth/errors";
import {
  checkSlugAvailability,
  createBusiness,
  mapBusinessError,
  readPlatformSettings,
  rememberActiveBusiness,
  saveBusinessImage,
  saveOwnerDisplayName,
} from "@/lib/business/onboarding";

function missingDisplayName(name: string | null): boolean {
  const trimmed = name?.trim() ?? "";
  return trimmed.length === 0 || trimmed === "Member";
}

export function OnboardingPage() {
  useDocumentTitle("Create a business");
  const auth = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [createdId, setCreatedId] = useState<string | null>(null);
  const settings = useQuery({
    queryKey: ["platform-settings", "global"],
    queryFn: readPlatformSettings,
  });

  async function onCreate(
    input: BusinessInput,
    images: { logo: File | null; cover: File | null },
  ): Promise<void> {
    try {
      const businessId = createdId ?? (await createBusiness(input));
      setCreatedId(businessId);
      if (images.logo) await saveBusinessImage(businessId, "logo", images.logo);
      if (images.cover) await saveBusinessImage(businessId, "cover", images.cover);
      rememberActiveBusiness(businessId);
      if (auth.user) {
        await queryClient.invalidateQueries({ queryKey: ["memberships", auth.user.uid] });
      }
      await navigate("/admin");
    } catch (error) {
      if (firebaseErrorCode(error)) {
        throw new Error(mapBusinessError(error), { cause: error });
      }
      if (error instanceof Error) throw error;
      throw new Error("The business could not be created. Try again.", { cause: error });
    }
  }

  if (settings.isPending) return <LoadingState label="Loading business setup" />;
  if (settings.isError) {
    return (
      <ErrorState
        title="Business setup is unavailable"
        message={settings.error instanceof Error ? settings.error.message : "Try again."}
        onRetry={() => void settings.refetch()}
      />
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8">
      <div className="flex justify-end">
        <DropdownMenu
          label="Account"
          trigger={
            <Button type="button" variant="outline" size="sm">
              Account
            </Button>
          }
          items={[
            { label: "Profile", onSelect: () => void navigate("/profile") },
            { label: "Sign out", onSelect: () => void auth.signOut() },
          ]}
        />
      </div>
      <OnboardingWizard
        settings={settings.data}
        needsDisplayName={missingDisplayName(auth.user?.displayName ?? null)}
        onCheckSlug={checkSlugAvailability}
        onSaveDisplayName={saveOwnerDisplayName}
        onCreate={onCreate}
      />
    </div>
  );
}

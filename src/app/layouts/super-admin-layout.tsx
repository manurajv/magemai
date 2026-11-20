import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { superAdminNavigation } from "@/app/navigation/items";
import { AppShell } from "@/app/layouts/app-shell";
import { useSuperAdminClaim } from "@/app/platform/use-super-admin-claim";
import { useAuth } from "@/app/providers/auth-context";
import { ErrorState } from "@/components/shared/error-state";
import { LoadingState } from "@/components/shared/loading-state";
import { PageHeader } from "@/components/shared/page-header";
import { platformAccessDecision, type RegistryState } from "@/lib/platform/access";
import { readOwnPlatformAdmin } from "@/lib/platform/admin";

function Denied({ title, description }: { title: string; description: string }) {
  return (
    <div
      className="mx-auto flex min-h-dvh max-w-lg items-center px-4"
      data-testid="platform-denied"
    >
      <div className="flex flex-col gap-3">
        <PageHeader title={title} description={description} />
        <p role="alert">403</p>
      </div>
    </div>
  );
}

function Gate({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const uid = auth.user?.uid ?? null;
  const claim = useSuperAdminClaim(uid);
  const registry = useQuery({
    queryKey: ["platform-admin", uid],
    enabled: claim === "yes" && uid !== null,
    queryFn: () => readOwnPlatformAdmin(uid ?? ""),
  });
  const registryState: RegistryState = !registry.isFetched
    ? "loading"
    : registry.isError
      ? "error"
      : registry.data === "active"
        ? "active"
        : "inactive";
  const access = platformAccessDecision(claim, claim === "yes" ? registryState : "loading");

  if (access === "loading") {
    return (
      <div className="grid min-h-dvh place-items-center px-4">
        <LoadingState label="Checking platform access" />
      </div>
    );
  }
  if (access === "error") {
    return (
      <div className="mx-auto flex min-h-dvh max-w-lg items-center px-4">
        <ErrorState
          title="Platform access unavailable"
          message="The platform registry could not be read."
          onRetry={() => void registry.refetch()}
        />
      </div>
    );
  }
  if (access === "denied-claim") {
    return (
      <Denied
        title="Platform access denied"
        description="You do not have platform access. The business dashboard is a separate area."
      />
    );
  }
  if (access === "denied-registry") {
    return (
      <AppShell items={superAdminNavigation} heading="Platform">
        <div data-testid="platform-denied">
          <PageHeader
            title="Platform access denied"
            description="This platform access is no longer active. A previous sign-in token does not restore it."
          />
          <p role="alert">403</p>
        </div>
      </AppShell>
    );
  }
  return children;
}

export function SuperAdminLayout() {
  return (
    <Gate>
      <AppShell items={superAdminNavigation} heading="Platform" />
    </Gate>
  );
}

import { Navigate, Outlet } from "react-router";
import { visibleBusinessNavigation } from "@/app/navigation/items";
import { AppShell } from "@/app/layouts/app-shell";
import { useActiveBusiness } from "@/app/providers/active-business-context";
import { ErrorState } from "@/components/shared/error-state";
import { LoadingState } from "@/components/shared/loading-state";

export function DashboardLayout() {
  const workspace = useActiveBusiness();
  if (workspace.status === "loading") {
    return (
      <div className="grid min-h-dvh place-items-center px-4">
        <LoadingState label="Loading your businesses" />
      </div>
    );
  }
  if (workspace.status === "error") {
    return (
      <div className="mx-auto flex min-h-dvh max-w-lg items-center px-4">
        <ErrorState
          title="Businesses unavailable"
          message={workspace.message}
          onRetry={workspace.reload}
        />
      </div>
    );
  }
  if (workspace.status === "empty") {
    return <Navigate to="/business/register" replace />;
  }

  return (
    <AppShell
      items={visibleBusinessNavigation(workspace.active.role)}
      heading={workspace.active.name}
    >
      <div className="flex flex-col gap-6">
        {workspace.active.businessStatus === "suspended" ? (
          <p
            role="status"
            className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm"
          >
            This business is suspended. You can still view it. Editing is turned off.
          </p>
        ) : null}
        <Outlet />
      </div>
    </AppShell>
  );
}

import { useEffect } from "react";
import { useRouteError } from "react-router";
import { ErrorState } from "@/components/shared/error-state";

export function RouteErrorBoundary() {
  const error = useRouteError();

  useEffect(() => {
    console.error(error);
  }, [error]);

  const message = error instanceof Error ? error.message : "The page could not be loaded.";

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg items-center px-4 py-16">
      <ErrorState
        title="Something went wrong"
        message={message}
        onRetry={() => window.location.reload()}
      />
    </div>
  );
}

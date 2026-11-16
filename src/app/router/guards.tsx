import { Navigate, Outlet, useLocation } from "react-router";
import { useAuth } from "@/app/providers/auth-context";
import { LoadingState } from "@/components/shared/loading-state";

function SessionGate() {
  const auth = useAuth();
  if (auth.status === "loading") {
    return (
      <div className="grid min-h-dvh place-items-center px-4">
        <LoadingState label="Checking your session" />
      </div>
    );
  }
  return null;
}

export function RequireAuth() {
  const auth = useAuth();
  const location = useLocation();
  const waiting = SessionGate();
  if (waiting) return waiting;
  if (!auth.user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <Outlet />;
}

export function RequireVerified() {
  const auth = useAuth();
  const waiting = SessionGate();
  if (waiting) return waiting;
  if (!auth.user) return <Navigate to="/login" replace />;
  if (!auth.user.emailVerified) return <Navigate to="/verify-email" replace />;
  return <Outlet />;
}

export function RedirectSignedIn() {
  const auth = useAuth();
  const waiting = SessionGate();
  if (waiting) return waiting;
  if (auth.user && !auth.user.emailVerified) return <Navigate to="/verify-email" replace />;
  if (auth.user?.emailVerified) return <Navigate to="/admin" replace />;
  return <Outlet />;
}

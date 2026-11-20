import { createBrowserRouter, type RouteObject } from "react-router";
import { AuthLayout } from "@/app/layouts/auth-layout";
import { DashboardLayout } from "@/app/layouts/dashboard-layout";
import { PublicLayout } from "@/app/layouts/public-layout";
import { SuperAdminLayout } from "@/app/layouts/super-admin-layout";
import { AdminPage } from "@/app/pages/admin-page";
import { AuthActionPage } from "@/app/pages/auth-action-page";
import { ForgotPasswordPage } from "@/app/pages/forgot-password-page";
import { HomePage } from "@/app/pages/home-page";
import { LoginPage } from "@/app/pages/login-page";
import { NotFoundPage } from "@/app/pages/not-found-page";
import { OnboardingPage } from "@/app/pages/onboarding-page";
import { ProfilePage } from "@/app/pages/profile-page";
import { RegisterPage } from "@/app/pages/register-page";
import { SuperAdminPage } from "@/app/pages/super-admin-page";
import { VerifyEmailPage } from "@/app/pages/verify-email-page";
import { LoadingState } from "@/components/shared/loading-state";
import { RouteErrorBoundary } from "@/components/shared/route-error-boundary";
import { RedirectSignedIn, RequireAuth, RequireVerified } from "@/app/router/guards";

const designSystemRoute: RouteObject[] = import.meta.env.DEV
  ? [
      {
        path: "/design-system",
        hydrateFallbackElement: (
          <div className="px-4 py-10">
            <LoadingState label="Loading design system" />
          </div>
        ),
        lazy: async () => {
          const module = await import("@/app/pages/design-system-page");
          return { Component: module.DesignSystemPage };
        },
      },
    ]
  : [];

export const router = createBrowserRouter([
  {
    errorElement: <RouteErrorBoundary />,
    children: [
      {
        element: <PublicLayout />,
        children: [
          { path: "/", element: <HomePage /> },
          { path: "*", element: <NotFoundPage /> },
        ],
      },
      {
        element: <AuthLayout />,
        children: [
          {
            element: <RedirectSignedIn />,
            children: [
              { path: "/login", element: <LoginPage /> },
              { path: "/register", element: <RegisterPage /> },
              { path: "/forgot-password", element: <ForgotPasswordPage /> },
            ],
          },
          { path: "/auth/action", element: <AuthActionPage /> },
          {
            element: <RequireAuth />,
            children: [{ path: "/verify-email", element: <VerifyEmailPage /> }],
          },
        ],
      },
      {
        element: <RequireAuth />,
        children: [{ path: "/profile", element: <ProfilePage /> }],
      },
      {
        element: <RequireVerified />,
        children: [
          {
            element: <DashboardLayout />,
            children: [{ path: "/admin", element: <AdminPage /> }],
          },
          {
            element: <SuperAdminLayout />,
            children: [{ path: "/super-admin", element: <SuperAdminPage /> }],
          },
          { path: "/business/register", element: <OnboardingPage /> },
        ],
      },
      ...designSystemRoute,
    ],
  },
]);

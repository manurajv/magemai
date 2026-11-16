import { createBrowserRouter, type RouteObject } from "react-router";
import { AuthLayout } from "@/app/layouts/auth-layout";
import { DashboardLayout } from "@/app/layouts/dashboard-layout";
import { PublicLayout } from "@/app/layouts/public-layout";
import { SuperAdminLayout } from "@/app/layouts/super-admin-layout";
import { AdminPage } from "@/app/pages/admin-page";
import { HomePage } from "@/app/pages/home-page";
import { LoginPage } from "@/app/pages/login-page";
import { NotFoundPage } from "@/app/pages/not-found-page";
import { RegisterPage } from "@/app/pages/register-page";
import { SuperAdminPage } from "@/app/pages/super-admin-page";
import { LoadingState } from "@/components/shared/loading-state";
import { RouteErrorBoundary } from "@/components/shared/route-error-boundary";

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
          { path: "/login", element: <LoginPage /> },
          { path: "/register", element: <RegisterPage /> },
        ],
      },
      {
        element: <DashboardLayout />,
        children: [{ path: "/admin", element: <AdminPage /> }],
      },
      {
        element: <SuperAdminLayout />,
        children: [{ path: "/super-admin", element: <SuperAdminPage /> }],
      },
      ...designSystemRoute,
    ],
  },
]);

import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { describe, expect, it } from "vitest";
import { AuthContext, type AuthContextValue } from "@/app/providers/auth-context";
import { RequireVerified } from "@/app/router/guards";
import { VerifyEmailPage } from "@/app/pages/verify-email-page";

const idle = {
  redirectError: null,
  clearRedirectError: () => undefined,
  signOut: async () => undefined,
  reloadUser: async () => false,
};

function renderAt(value: AuthContextValue, path = "/admin") {
  render(
    <AuthContext.Provider value={value}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route element={<RequireVerified />}>
            <Route path="/admin" element={<h1>Dashboard</h1>} />
          </Route>
          <Route path="/login" element={<h1>Sign in</h1>} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}

describe("verified route guard", () => {
  it("sends an anonymous visitor to sign in and does not render the dashboard", () => {
    renderAt({ ...idle, status: "ready", user: null });
    expect(screen.getByRole("heading", { name: "Sign in" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Dashboard" })).not.toBeInTheDocument();
  });

  it("shows the loading state and does not render the dashboard while auth is resolving", () => {
    renderAt({ ...idle, status: "loading", user: null });
    expect(screen.getByText("Checking your session")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Dashboard" })).not.toBeInTheDocument();
  });

  it("keeps an unverified password user on the verify-email screen", () => {
    renderAt({
      ...idle,
      status: "ready",
      user: {
        uid: "u1",
        email: "person@example.test",
        emailVerified: false,
        displayName: "Person",
      },
    });
    expect(screen.getByRole("heading", { name: "Verify your email" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Resend email" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Dashboard" })).not.toBeInTheDocument();
  });
});

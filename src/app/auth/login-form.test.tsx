import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { LoginForm } from "@/app/auth/login-form";

function renderForm(onSubmit = vi.fn()) {
  render(
    <MemoryRouter>
      <LoginForm onSubmit={onSubmit} showGoogle={false} submitting={false} error={null} />
    </MemoryRouter>,
  );
  return onSubmit;
}

describe("login form", () => {
  it("shows validation for a bad email and a short password and does not submit", async () => {
    const user = userEvent.setup();
    const onSubmit = renderForm();
    await user.type(screen.getByLabelText("Email"), "not-an-email");
    await user.type(screen.getByLabelText("Password"), "short");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByText("Enter a valid email address.")).toBeInTheDocument();
    expect(screen.getByText("Use at least 8 characters.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Continue with Google" })).not.toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("shows the auth error and a submitting label", () => {
    render(
      <MemoryRouter>
        <LoginForm
          onSubmit={vi.fn()}
          showGoogle
          onGoogle={vi.fn()}
          submitting
          error="Email or password is incorrect."
        />
      </MemoryRouter>,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Email or password is incorrect.");
    expect(screen.getByRole("button", { name: "Signing in…" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Continue with Google" })).toBeDisabled();
  });
});

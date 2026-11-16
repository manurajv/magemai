import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ComingSoon } from "@/components/shared/coming-soon";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { LiveFirebaseBanner } from "@/components/shared/live-firebase-banner";
import { LoadingState } from "@/components/shared/loading-state";
import { Logo } from "@/components/shared/logo";
import { brand, formatDocumentTitle } from "@/config/brand";
import { LIVE_FIREBASE_BANNER } from "@/lib/firebase/env";

describe("brand", () => {
  it("exposes the product name, endorsement, and tagline", () => {
    expect(brand.name).toBe("Magemai");
    expect(brand.endorsement).toBe("A Mavixas product");
    expect(brand.tagline).toBe("Your business. Your own space.");
    expect(formatDocumentTitle("Sign in")).toBe("Sign in · Magemai");
  });
});

describe("design system states", () => {
  it("renders the logo from the brand module", () => {
    render(<Logo />);
    expect(screen.getByText(brand.name)).toBeInTheDocument();
    expect(screen.getByText(brand.endorsement)).toBeInTheDocument();
  });

  it("renders a loading state", () => {
    render(<LoadingState label="Loading workspace" />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading workspace");
  });

  it("renders an empty state", () => {
    render(<EmptyState title="Nothing here" description="No records yet." />);
    expect(screen.getByRole("heading", { name: "Nothing here" })).toBeInTheDocument();
    expect(screen.getByText("No records yet.")).toBeInTheDocument();
  });

  it("renders an error state with a retry action", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(<ErrorState title="Failed" message="The request did not finish." onRetry={onRetry} />);
    expect(screen.getByRole("alert")).toHaveTextContent("The request did not finish.");
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("shows a non-dismissible live Firebase banner", () => {
    const { rerender } = render(<LiveFirebaseBanner mode="emulator" />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    rerender(<LiveFirebaseBanner mode="live" />);
    const banner = screen.getByRole("status");
    expect(banner).toHaveTextContent(LIVE_FIREBASE_BANNER);
    expect(screen.queryByRole("button", { name: /dismiss|close/i })).not.toBeInTheDocument();
  });

  it("labels coming soon content", () => {
    render(<ComingSoon />);
    expect(screen.getByText("Coming soon")).toBeInTheDocument();
  });
});

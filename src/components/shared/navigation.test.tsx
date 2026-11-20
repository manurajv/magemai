import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import { businessNavigation, superAdminNavigation } from "@/app/navigation/items";
import { Navigation } from "@/components/shared/navigation";

const comingSoonLabels = [
  "Services",
  "Packages",
  "Bookings",
  "Calendar",
  "Customers",
  "Team",
  "Finances",
  "Invoices",
  "Collaboration",
  "Projects",
  "Reports",
];

describe("business navigation", () => {
  it("renders future sections as disabled controls with no link", () => {
    render(
      <MemoryRouter>
        <Navigation items={businessNavigation} />
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: "Overview" })).toHaveAttribute("href", "/admin");
    expect(screen.getByRole("link", { name: "Business profile" })).toHaveAttribute(
      "href",
      "/admin/profile",
    );
    expect(screen.getByRole("link", { name: "Settings" })).toHaveAttribute(
      "href",
      "/admin/settings",
    );
    for (const label of comingSoonLabels) {
      const control = screen.getByRole("button", { name: new RegExp(label) });
      expect(control).toBeDisabled();
      expect(control).toHaveTextContent("Coming soon");
      expect(screen.queryByRole("link", { name: label })).not.toBeInTheDocument();
    }
  });

  it("does not give coming soon items a path", () => {
    for (const item of businessNavigation) {
      if ("comingSoon" in item) expect("to" in item).toBe(false);
    }
  });
});

describe("platform navigation", () => {
  it("links the phase 1 sections and keeps later modules disabled", () => {
    render(
      <MemoryRouter>
        <Navigation items={superAdminNavigation} />
      </MemoryRouter>,
    );
    expect(screen.getByRole("link", { name: "Users" })).toHaveAttribute(
      "href",
      "/super-admin/users",
    );
    expect(screen.getByRole("link", { name: "Businesses" })).toHaveAttribute(
      "href",
      "/super-admin/businesses",
    );
    expect(screen.getByRole("link", { name: "Platform settings" })).toHaveAttribute(
      "href",
      "/super-admin/settings",
    );
    for (const label of ["Categories", "Subscriptions", "Reports"]) {
      const control = screen.getByRole("button", { name: new RegExp(label) });
      expect(control).toBeDisabled();
      expect(control).toHaveTextContent("Coming soon");
    }
  });
});

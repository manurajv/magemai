import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ActiveBusinessContext } from "@/app/providers/active-business-context";
import { BusinessSwitcher } from "@/components/business/business-switcher";
import type { ActiveMembership } from "@/lib/business/dashboard";

const alpha: ActiveMembership = {
  businessId: "alpha",
  role: "owner",
  name: "Alpha Studio",
  createdAtMs: 1,
  businessStatus: "active",
  verificationStatus: "unverified",
};

const beta: ActiveMembership = {
  businessId: "beta",
  role: "staff",
  name: "Beta Studio",
  createdAtMs: 2,
  businessStatus: "active",
  verificationStatus: "verified",
};

describe("BusinessSwitcher", () => {
  it("lists both memberships and selects the other business", async () => {
    const select = vi.fn();
    const user = userEvent.setup();
    render(
      <ActiveBusinessContext.Provider
        value={{ status: "ready", memberships: [alpha, beta], active: alpha, select }}
      >
        <BusinessSwitcher />
      </ActiveBusinessContext.Provider>,
    );

    expect(screen.getByTestId("business-switcher")).toHaveTextContent("Alpha Studio");
    expect(screen.getByTestId("business-switcher")).toHaveTextContent("Owner");
    await user.click(screen.getByTestId("business-switcher"));
    expect(screen.getByRole("menuitem", { name: "Alpha Studio, Owner" })).toBeInTheDocument();
    await user.click(screen.getByRole("menuitem", { name: "Beta Studio, Staff" }));
    expect(select).toHaveBeenCalledWith("beta");
  });
});

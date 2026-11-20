import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { BusinessInput } from "@shared/validation/business";
import { OnboardingWizard } from "@/app/pages/onboarding-wizard";
import type { OnboardingSettings } from "@/lib/business/onboarding";

const settings: OnboardingSettings = {
  supportedCurrencies: ["LKR", "USD"],
  supportedLanguages: ["en"],
  businessCategories: [{ id: "photography", label: "Photography" }],
  reservedSlugs: [],
  defaultCountry: "LK",
  defaultCurrency: "LKR",
  defaultLanguage: "en",
  defaultTimezone: "Asia/Colombo",
  supportedCountries: ["LK"],
};

function renderWizard(needsDisplayName = false) {
  const onCheckSlug = vi.fn(async (slug: string) => slug !== "admin");
  const onSaveDisplayName = vi.fn(async () => undefined);
  const onCreate =
    vi.fn<
      (input: BusinessInput, images: { logo: File | null; cover: File | null }) => Promise<void>
    >();
  render(
    <OnboardingWizard
      settings={settings}
      needsDisplayName={needsDisplayName}
      onCheckSlug={onCheckSlug}
      onSaveDisplayName={onSaveDisplayName}
      onCreate={onCreate}
    />,
  );
  return { onCheckSlug, onSaveDisplayName, onCreate };
}

async function fillIdentity(user: ReturnType<typeof userEvent.setup>, name: string, slug: string) {
  await user.type(screen.getByLabelText("Business name"), name);
  const address = screen.getByLabelText("Web address");
  await user.clear(address);
  await user.type(address, slug);
}

describe("onboarding wizard", () => {
  it("blocks an empty business name", async () => {
    const user = userEvent.setup();
    renderWizard();
    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("Enter a business name.")).toBeInTheDocument();
    expect(screen.getByText(/Step 1 of 7/)).toBeInTheDocument();
  });

  it("suggests a web address and reviews the business before creating it", async () => {
    const user = userEvent.setup();
    const { onCheckSlug, onCreate } = renderWizard();
    await user.type(screen.getByLabelText("Business name"), "Test Studio");
    await user.tab();
    expect(screen.getByLabelText("Web address")).toHaveValue("test-studio");
    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(onCheckSlug).toHaveBeenCalledWith("test-studio");
    await user.click(screen.getByRole("button", { name: "Next" }));
    await user.type(screen.getByLabelText("Contact email"), "studio@example.test");
    await user.click(screen.getByRole("button", { name: "Next" }));
    await user.type(screen.getByLabelText("Address line 1"), "1 Galle Road");
    await user.type(screen.getByLabelText("City"), "Colombo");
    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByLabelText("Currency")).toHaveValue("LKR");
    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("No logo selected.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("test-studio")).toBeInTheDocument();
    expect(screen.getByText("Photography")).toBeInTheDocument();
    expect(screen.getByText("studio@example.test")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Create business" }));
    expect(onCreate).toHaveBeenCalledOnce();
    expect(onCreate.mock.calls[0]?.[0]).toMatchObject({
      name: "Test Studio",
      slug: "test-studio",
      currency: "LKR",
      address: { country: "LK", city: "Colombo" },
    });
    expect(onCreate.mock.calls[0]?.[1]).toEqual({ logo: null, cover: null });
  });

  it("asks for a profile name when the signed-in name is missing", async () => {
    const user = userEvent.setup();
    const { onSaveDisplayName, onCreate } = renderWizard(true);
    await fillIdentity(user, "Test Studio", "test-studio");
    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("Enter your name.")).toBeInTheDocument();
    await user.type(screen.getByLabelText("Your name"), "Owner A");
    await user.click(screen.getByRole("button", { name: "Next" }));
    await user.click(screen.getByRole("button", { name: "Next" }));
    await user.type(screen.getByLabelText("Contact email"), "studio@example.test");
    await user.click(screen.getByRole("button", { name: "Next" }));
    await user.type(screen.getByLabelText("Address line 1"), "1 Galle Road");
    await user.type(screen.getByLabelText("City"), "Colombo");
    await user.click(screen.getByRole("button", { name: "Next" }));
    await user.click(screen.getByRole("button", { name: "Next" }));
    await user.click(screen.getByRole("button", { name: "Next" }));
    await user.click(screen.getByRole("button", { name: "Create business" }));
    expect(onSaveDisplayName).toHaveBeenCalledWith("Owner A");
    expect(onCreate).toHaveBeenCalledOnce();
  });
});

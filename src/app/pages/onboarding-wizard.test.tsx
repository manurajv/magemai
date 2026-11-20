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
  const address = screen.getByLabelText("Magemai booking link");
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

  it("does not show a booking-link error before the field is used", () => {
    renderWizard();
    expect(screen.queryByText("Use at least 3 characters.")).not.toBeInTheDocument();
    expect(screen.getByText("https://magemai.web.app/business/your-link")).toBeInTheDocument();
  });

  it("suggests a booking link while the name is typed and keeps a manual edit", async () => {
    const user = userEvent.setup();
    renderWizard();
    await user.type(screen.getByLabelText("Business name"), "Te");
    expect(screen.queryByText("Use at least 3 characters.")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Magemai booking link")).toHaveValue("");
    await user.type(screen.getByLabelText("Business name"), "st Studio");
    const link = screen.getByLabelText("Magemai booking link");
    expect(link).toHaveValue("test-studio");
    expect(screen.getByText("https://magemai.web.app/business/test-studio")).toBeInTheDocument();
    expect(screen.getByText(/This is not your own website/)).toBeInTheDocument();
    await user.clear(link);
    await user.type(link, "custom-studio");
    await user.type(screen.getByLabelText("Business name"), " Extra");
    expect(link).toHaveValue("custom-studio");
  });

  it("suggests a booking link and reviews the business before creating it", async () => {
    const user = userEvent.setup();
    const { onCheckSlug, onCreate } = renderWizard();
    await user.type(screen.getByLabelText("Business name"), "Test Studio");
    expect(screen.getByLabelText("Magemai booking link")).toHaveValue("test-studio");
    expect(screen.queryByText("Use at least 3 characters.")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(onCheckSlug).toHaveBeenCalledWith("test-studio");
    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByLabelText("Your own website")).toBeInTheDocument();
    expect(
      screen.getByText(/Leave this blank if the business does not have its own website/),
    ).toBeInTheDocument();
    await user.type(screen.getByLabelText("Contact email"), "studio@example.test");
    await user.click(screen.getByRole("button", { name: "Next" }));
    await user.type(screen.getByLabelText("Address line 1"), "1 Galle Road");
    await user.type(screen.getByLabelText("City"), "Colombo");
    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByLabelText("Currency")).toHaveValue("LKR");
    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("No logo selected.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("https://magemai.web.app/business/test-studio")).toBeInTheDocument();
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

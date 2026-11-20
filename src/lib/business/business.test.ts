import { describe, expect, it } from "vitest";
import { bookingPageUrl } from "@shared/business/booking-url";
import { suggestSlug } from "@shared/business/slug";
import { businessInputSchema, businessSettingsError } from "@shared/validation/business";
import { platformDefaults } from "@shared/platform/defaults";

const settings = {
  supportedCurrencies: platformDefaults.supportedCurrencies,
  supportedLanguages: platformDefaults.supportedLanguages,
  businessCategories: platformDefaults.businessCategories,
  reservedSlugs: platformDefaults.reservedSlugs,
};

function validInput() {
  return {
    name: "Test Studio",
    slug: "test-studio",
    categoryId: "photography",
    description: "Portraits",
    contact: { email: "studio@example.test", phone: "", website: "" },
    address: {
      line1: "1 Galle Road",
      line2: "",
      city: "Colombo",
      region: "",
      postalCode: "",
      country: "LK",
    },
    timezone: "Asia/Colombo",
    currency: "LKR",
    language: "en",
  };
}

describe("business slug suggestion", () => {
  it("suggests a hyphenated address from ASCII letters", () => {
    expect(suggestSlug("Test Studio 42")).toBe("test-studio-42");
    expect(suggestSlug("Café North")).toBe("cafe-north");
  });

  it("returns an empty suggestion when the name has no ASCII letters", () => {
    expect(suggestSlug("ස්ටුඩියෝ")).toBe("");
    expect(suggestSlug("123")).toBe("");
  });

  it("builds the public booking page from the blueprint path", () => {
    expect(bookingPageUrl("Test-Studio")).toBe("https://magemai.web.app/business/test-studio");
  });
});

describe("business input schema", () => {
  it("accepts a complete wizard payload and ignores privileged fields", () => {
    const parsed = businessInputSchema.parse({
      ...validInput(),
      role: "staff",
      status: "suspended",
      ownerId: "someone-else",
      verificationStatus: "verified",
    });
    expect(parsed.slug).toBe("test-studio");
    expect(parsed).not.toHaveProperty("role");
    expect(parsed).not.toHaveProperty("status");
    expect(parsed).not.toHaveProperty("ownerId");
    expect(businessSettingsError(parsed, settings)).toBeNull();
  });

  it("accepts a blank website and an https website", () => {
    expect(businessInputSchema.safeParse(validInput()).success).toBe(true);
    expect(
      businessInputSchema.safeParse({
        ...validInput(),
        contact: { ...validInput().contact, website: "https://studio.example" },
      }).success,
    ).toBe(true);
  });

  it("rejects a bad website, an unknown country, and an unknown time zone", () => {
    expect(
      businessInputSchema.safeParse({
        ...validInput(),
        contact: { ...validInput().contact, website: "http://example.test" },
      }).success,
    ).toBe(false);
    expect(
      businessInputSchema.safeParse({
        ...validInput(),
        address: { ...validInput().address, country: "ZZ" },
      }).success,
    ).toBe(false);
    expect(businessInputSchema.safeParse({ ...validInput(), timezone: "Not/AZone" }).success).toBe(
      false,
    );
  });

  it("rejects a currency that platform settings do not list", () => {
    const parsed = businessInputSchema.parse({ ...validInput(), currency: "JPY" });
    expect(businessSettingsError(parsed, settings)).toMatch(/currency/i);
  });
});

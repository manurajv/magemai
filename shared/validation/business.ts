import { z } from "zod";
import {
  ADDRESS_LINE_MAX,
  BUSINESS_NAME_MAX,
  BUSINESS_NAME_MIN,
  CITY_MAX,
  DESCRIPTION_MAX,
  POSTAL_CODE_MAX,
  REGION_MAX,
  SLUG_MAX,
  SLUG_MIN,
  WEBSITE_MAX,
} from "../business/limits.js";
import { SLUG_PATTERN } from "../business/slug.js";
import { isCountryCode } from "../data/countries.js";
import { PHONE_PATTERN } from "../profile/limits.js";

function hasControlCharacter(value: string): boolean {
  for (const character of value) {
    const code = character.codePointAt(0) ?? 0;
    if (code <= 0x1f || code === 0x7f) return true;
  }
  return false;
}

const optionalText = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, `${label} must be ${max} characters or fewer.`)
    .refine((value) => !hasControlCharacter(value), `${label} cannot include control characters.`);

export const businessInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(BUSINESS_NAME_MIN, "Enter a business name.")
    .max(BUSINESS_NAME_MAX, "Use 80 characters or fewer.")
    .refine((value) => !hasControlCharacter(value), "Name cannot include control characters."),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(SLUG_MIN, "Use at least 3 characters.")
    .max(SLUG_MAX, "Use 48 characters or fewer.")
    .regex(SLUG_PATTERN, "Use lowercase letters, numbers, and single hyphens."),
  categoryId: z.string().trim().min(1, "Choose a category."),
  description: optionalText(DESCRIPTION_MAX, "Description"),
  contact: z.object({
    email: z.email("Enter a valid email address."),
    phone: z
      .string()
      .trim()
      .refine(
        (value) => value === "" || PHONE_PATTERN.test(value),
        "Use international format, such as +94771234567.",
      ),
    website: optionalText(WEBSITE_MAX, "Website").refine(
      (value) => value === "" || /^https:\/\/\S+$/i.test(value),
      "Website must start with https://",
    ),
  }),
  address: z.object({
    line1: optionalText(ADDRESS_LINE_MAX, "Address").refine(
      (value) => value.length > 0,
      "Enter an address.",
    ),
    line2: optionalText(ADDRESS_LINE_MAX, "Address line 2"),
    city: optionalText(CITY_MAX, "City").refine((value) => value.length > 0, "Enter a city."),
    region: optionalText(REGION_MAX, "Region"),
    postalCode: optionalText(POSTAL_CODE_MAX, "Postal code"),
    country: z
      .string()
      .trim()
      .toUpperCase()
      .refine((value) => isCountryCode(value), "Choose a country."),
  }),
  timezone: z
    .string()
    .trim()
    .min(1, "Choose a time zone.")
    .refine(
      (value) => Intl.supportedValuesOf("timeZone").includes(value),
      "Choose a known time zone.",
    ),
  currency: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/, "Choose a currency."),
  language: z.string().trim().min(2, "Choose a language."),
});

export type BusinessInput = z.infer<typeof businessInputSchema>;

export type PlatformSettingsSnapshot = {
  supportedCurrencies: readonly string[];
  supportedLanguages: readonly string[];
  businessCategories: readonly { id: string; label: string }[];
  reservedSlugs: readonly string[];
};

export function businessSettingsError(
  input: BusinessInput,
  settings: PlatformSettingsSnapshot,
): string | null {
  if (!settings.businessCategories.some((category) => category.id === input.categoryId)) {
    return "Choose a category from the list.";
  }
  if (!settings.supportedCurrencies.includes(input.currency)) {
    return "Choose a supported currency.";
  }
  if (!settings.supportedLanguages.includes(input.language)) {
    return "Choose a supported language.";
  }
  return null;
}

export function emptyToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

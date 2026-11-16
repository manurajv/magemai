export type BusinessCategory = {
  id: string;
  label: string;
};

export const businessCategories: readonly BusinessCategory[] = [
  { id: "photography", label: "Photography" },
  { id: "videography", label: "Videography" },
  { id: "drone", label: "Drone" },
  { id: "events", label: "Events" },
  { id: "beauty", label: "Beauty" },
  { id: "music", label: "Music" },
  { id: "venues", label: "Venues" },
  { id: "consulting", label: "Consulting" },
  { id: "education", label: "Education" },
  { id: "fitness", label: "Fitness" },
  { id: "wellness", label: "Wellness" },
  { id: "home-services", label: "Home services" },
  { id: "other", label: "Other" },
];

/**
 * Seed values for `platformSettings/global`.
 * `updatedAt` is written by the seed or operator script, not stored here.
 */
export const platformDefaults = {
  id: "global",
  supportedCountries: ["LK"],
  supportedCurrencies: ["LKR", "USD", "EUR", "GBP", "INR", "AUD", "CAD", "SGD"],
  supportedLanguages: ["en"],
  defaultCountry: "LK",
  defaultCurrency: "LKR",
  defaultLanguage: "en",
  defaultTimezone: "Asia/Colombo",
  businessCategories,
  reservedSlugs: [] as string[],
  maintenanceMode: false,
  updatedBy: "system",
} as const;

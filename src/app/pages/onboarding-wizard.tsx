import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo, useState } from "react";
import { useForm, type FieldPath } from "react-hook-form";
import { countries } from "@shared/data/countries";
import { bookingPageUrl, BOOKING_PAGE_ORIGIN } from "@shared/business/booking-url";
import { suggestSlug } from "@shared/business/slug";
import { businessInputSchema, type BusinessInput } from "@shared/validation/business";
import { DISPLAY_NAME_MAX, DISPLAY_NAME_MIN } from "@shared/profile/limits";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { imageRejection, type OnboardingSettings } from "@/lib/business/onboarding";

const STEPS = [
  { title: "Business", fields: ["name", "slug", "categoryId"] },
  { title: "Description", fields: ["description"] },
  { title: "Contact", fields: ["contact.email", "contact.phone", "contact.website"] },
  {
    title: "Location",
    fields: [
      "address.line1",
      "address.line2",
      "address.city",
      "address.region",
      "address.postalCode",
      "address.country",
      "timezone",
    ],
  },
  { title: "Locale", fields: ["currency", "language"] },
  { title: "Images", fields: [] },
  { title: "Review", fields: [] },
] as const satisfies readonly { title: string; fields: readonly FieldPath<BusinessInput>[] }[];

const selectClass = "h-11 rounded-md border border-input bg-card px-3 text-sm text-foreground";

function emptyBusiness(settings: OnboardingSettings): BusinessInput {
  return {
    name: "",
    slug: "",
    categoryId: settings.businessCategories[0]?.id ?? "",
    description: "",
    contact: { email: "", phone: "", website: "" },
    address: {
      line1: "",
      line2: "",
      city: "",
      region: "",
      postalCode: "",
      country: settings.defaultCountry,
    },
    timezone: settings.defaultTimezone,
    currency: settings.defaultCurrency,
    language: settings.defaultLanguage,
  };
}

function hasControlCharacter(value: string): boolean {
  for (const character of value) {
    const code = character.codePointAt(0) ?? 0;
    if (code <= 0x1f || code === 0x7f) return true;
  }
  return false;
}

export function OnboardingWizard({
  settings,
  needsDisplayName,
  onCheckSlug,
  onSaveDisplayName,
  onCreate,
}: {
  settings: OnboardingSettings;
  needsDisplayName: boolean;
  onCheckSlug: (slug: string) => Promise<boolean>;
  onSaveDisplayName: (displayName: string) => Promise<void>;
  onCreate: (
    input: BusinessInput,
    images: { logo: File | null; cover: File | null },
  ) => Promise<void>;
}) {
  const [step, setStep] = useState(0);
  const [slugEdited, setSlugEdited] = useState(false);
  const [showSlugError, setShowSlugError] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [displayNameError, setDisplayNameError] = useState("");
  const [logo, setLogo] = useState<File | null>(null);
  const [cover, setCover] = useState<File | null>(null);
  const [imageError, setImageError] = useState("");
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const form = useForm<BusinessInput>({
    resolver: zodResolver(businessInputSchema),
    defaultValues: emptyBusiness(settings),
  });
  const timeZones = useMemo(() => Intl.supportedValuesOf("timeZone"), []);
  const orderedCountries = useMemo(() => {
    const pinned = new Set(settings.supportedCountries);
    const first = countries.filter(([code]) => pinned.has(code));
    const rest = countries.filter(([code]) => !pinned.has(code));
    return [...first, ...rest];
  }, [settings.supportedCountries]);
  const values = form.watch();
  const categoryLabel =
    settings.businessCategories.find((category) => category.id === values.categoryId)?.label ??
    values.categoryId;

  function displayNameProblem(): string {
    const name = displayName.trim();
    if (!needsDisplayName) return "";
    if (name.length < DISPLAY_NAME_MIN) return "Enter your name.";
    if (name.length > DISPLAY_NAME_MAX) return "Use 80 characters or fewer.";
    if (hasControlCharacter(name)) return "Name cannot include control characters.";
    return "";
  }

  async function goNext() {
    setFormError("");
    const current = STEPS[step];
    if (!current) return;
    if (step === 0) {
      setShowSlugError(true);
      const nameProblem = displayNameProblem();
      setDisplayNameError(nameProblem);
      if (nameProblem) return;
    }
    if (current.fields.length > 0) {
      const valid = await form.trigger([...current.fields]);
      if (!valid) return;
    }
    if (step === 0) {
      try {
        const available = await onCheckSlug(form.getValues("slug"));
        if (!available) {
          form.setError("slug", { message: "That address is not available." });
          return;
        }
      } catch (error) {
        setFormError(error instanceof Error ? error.message : "The address could not be checked.");
        return;
      }
    }
    // Let the Next click finish before the button becomes the submit control.
    await Promise.resolve();
    setStep((value) => Math.min(value + 1, STEPS.length - 1));
  }

  async function onSubmit(input: BusinessInput) {
    setSaving(true);
    setFormError("");
    try {
      if (needsDisplayName) await onSaveDisplayName(displayName.trim());
      await onCreate(input, { logo, cover });
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "The business could not be created.");
    } finally {
      setSaving(false);
    }
  }

  const current = STEPS[step];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create a business</CardTitle>
        <CardDescription>
          Step {step + 1} of {STEPS.length}: {current?.title}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="flex flex-col gap-4" onSubmit={form.handleSubmit(onSubmit)} noValidate>
          {step === 0 ? (
            <>
              {needsDisplayName ? (
                <Input
                  label="Your name"
                  hint="This is saved on your profile before the business is created."
                  value={displayName}
                  error={displayNameError}
                  onChange={(event) => setDisplayName(event.target.value)}
                />
              ) : null}
              <Input
                label="Business name"
                error={form.formState.errors.name?.message}
                {...form.register("name", {
                  onChange: (event) => {
                    if (slugEdited) return;
                    const suggestion = suggestSlug(String(event.target.value));
                    form.setValue("slug", suggestion, {
                      shouldValidate: false,
                      shouldDirty: false,
                      shouldTouch: false,
                    });
                    form.clearErrors("slug");
                  },
                })}
              />
              <Input
                label="Magemai booking link"
                hint="Lowercase letters, numbers, and hyphens."
                error={showSlugError ? form.formState.errors.slug?.message : undefined}
                {...form.register("slug", {
                  onChange: () => {
                    setSlugEdited(true);
                    form.clearErrors("slug");
                  },
                  onBlur: async () => {
                    setShowSlugError(true);
                    const valid = await form.trigger("slug");
                    if (!valid) return;
                    const available = await onCheckSlug(form.getValues("slug"));
                    if (!available) {
                      form.setError("slug", { message: "That address is not available." });
                    }
                  },
                })}
              />
              <p className="text-sm text-muted-foreground">
                Every business gets one Magemai booking page. This is not your own website.
              </p>
              <p className="text-sm text-foreground">
                {values.slug
                  ? bookingPageUrl(values.slug)
                  : `${BOOKING_PAGE_ORIGIN}/business/your-link`}
              </p>
              <label className="flex flex-col gap-2 text-sm font-medium">
                Category
                <select className={selectClass} {...form.register("categoryId")}>
                  {settings.businessCategories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </label>
            </>
          ) : null}
          {step === 1 ? (
            <label className="flex flex-col gap-2 text-sm font-medium">
              Description
              <textarea
                className="min-h-32 rounded-md border border-input bg-card px-3 py-2 text-sm"
                {...form.register("description")}
              />
              {form.formState.errors.description ? (
                <span className="text-sm text-destructive">
                  {form.formState.errors.description.message}
                </span>
              ) : (
                <span className="text-sm text-muted-foreground">
                  Optional. Up to 2000 characters.
                </span>
              )}
            </label>
          ) : null}
          {step === 2 ? (
            <>
              <Input
                label="Contact email"
                type="email"
                error={form.formState.errors.contact?.email?.message}
                {...form.register("contact.email")}
              />
              <Input
                label="Phone"
                hint="Optional. Use international format, such as +94771234567."
                error={form.formState.errors.contact?.phone?.message}
                {...form.register("contact.phone")}
              />
              <Input
                label="Your own website"
                hint="Optional. Leave this blank if the business does not have its own website. This is not the Magemai booking link. A link must start with https://."
                error={form.formState.errors.contact?.website?.message}
                {...form.register("contact.website")}
              />
            </>
          ) : null}
          {step === 3 ? (
            <>
              <Input
                label="Address line 1"
                error={form.formState.errors.address?.line1?.message}
                {...form.register("address.line1")}
              />
              <Input
                label="Address line 2"
                hint="Optional."
                error={form.formState.errors.address?.line2?.message}
                {...form.register("address.line2")}
              />
              <Input
                label="City"
                error={form.formState.errors.address?.city?.message}
                {...form.register("address.city")}
              />
              <Input
                label="Region"
                hint="Optional."
                error={form.formState.errors.address?.region?.message}
                {...form.register("address.region")}
              />
              <Input
                label="Postal code"
                hint="Optional."
                error={form.formState.errors.address?.postalCode?.message}
                {...form.register("address.postalCode")}
              />
              <label className="flex flex-col gap-2 text-sm font-medium">
                Country
                <select className={selectClass} {...form.register("address.country")}>
                  {orderedCountries.map(([code, name]) => (
                    <option key={code} value={code}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium">
                Time zone
                <select className={selectClass} {...form.register("timezone")}>
                  {timeZones.map((zone) => (
                    <option key={zone} value={zone}>
                      {zone}
                    </option>
                  ))}
                </select>
              </label>
            </>
          ) : null}
          {step === 4 ? (
            <>
              <label className="flex flex-col gap-2 text-sm font-medium">
                Currency
                <select className={selectClass} {...form.register("currency")}>
                  {settings.supportedCurrencies.map((currency) => (
                    <option key={currency} value={currency}>
                      {currency}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium">
                Language
                <select className={selectClass} {...form.register("language")}>
                  {settings.supportedLanguages.map((language) => (
                    <option key={language} value={language}>
                      {language}
                    </option>
                  ))}
                </select>
              </label>
            </>
          ) : null}
          {step === 5 ? (
            <>
              <p className="text-sm text-muted-foreground">
                Logo and cover are optional. JPEG, PNG, or WebP. Logo up to 2 MB, cover up to 5 MB.
              </p>
              <label className="flex flex-col gap-2 text-sm font-medium">
                Logo
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(event) => {
                    const file = event.target.files?.[0] ?? null;
                    if (!file) {
                      setLogo(null);
                      return;
                    }
                    const problem = imageRejection(file, "logo");
                    setImageError(problem ?? "");
                    setLogo(problem ? null : file);
                  }}
                />
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium">
                Cover
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(event) => {
                    const file = event.target.files?.[0] ?? null;
                    if (!file) {
                      setCover(null);
                      return;
                    }
                    const problem = imageRejection(file, "cover");
                    setImageError(problem ?? "");
                    setCover(problem ? null : file);
                  }}
                />
              </label>
              {imageError ? <p role="alert">{imageError}</p> : null}
              {logo ? <p>Logo selected: {logo.name}</p> : <p>No logo selected.</p>}
              {cover ? <p>Cover selected: {cover.name}</p> : <p>No cover selected.</p>}
            </>
          ) : null}
          {step === 6 ? (
            <dl className="grid gap-2 text-sm">
              <div>
                <dt className="text-muted-foreground">Business</dt>
                <dd>{values.name}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Magemai booking link</dt>
                <dd>{values.slug ? bookingPageUrl(values.slug) : ""}</dd>
              </div>
              {values.contact.website ? (
                <div>
                  <dt className="text-muted-foreground">Your own website</dt>
                  <dd>{values.contact.website}</dd>
                </div>
              ) : null}
              <div>
                <dt className="text-muted-foreground">Category</dt>
                <dd>{categoryLabel}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Contact email</dt>
                <dd>{values.contact.email}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">City</dt>
                <dd>
                  {values.address.city}, {values.address.country}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Currency</dt>
                <dd>
                  {values.currency} · {values.language} · {values.timezone}
                </dd>
              </div>
            </dl>
          ) : null}
          {formError ? <p role="alert">{formError}</p> : null}
          <div className="flex gap-3">
            {step > 0 ? (
              <Button type="button" variant="outline" onClick={() => setStep((value) => value - 1)}>
                Back
              </Button>
            ) : null}
            <Button
              type="button"
              disabled={saving}
              onClick={() => {
                if (step < STEPS.length - 1) {
                  void goNext();
                  return;
                }
                void form.handleSubmit(onSubmit)();
              }}
            >
              {step < STEPS.length - 1 ? "Next" : saving ? "Creating business…" : "Create business"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

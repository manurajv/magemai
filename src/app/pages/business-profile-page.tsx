import { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { countries } from "@shared/data/countries";
import { roleHas } from "@shared/permissions";
import { businessProfileSchema, type BusinessProfileInput } from "@shared/validation/business";
import { useActiveBusiness } from "@/app/providers/active-business-context";
import { useAuth } from "@/app/providers/auth-context";
import { ErrorState } from "@/components/shared/error-state";
import { LoadingState } from "@/components/shared/loading-state";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDocumentTitle } from "@/hooks/use-document-title";
import {
  canEdit,
  mapDashboardError,
  readBusiness,
  saveBusinessProfile,
  type BusinessRecord,
} from "@/lib/business/dashboard";
import { readPlatformSettings, type OnboardingSettings } from "@/lib/business/onboarding";

const selectClass =
  "h-11 rounded-md border border-input bg-card px-3 text-sm text-foreground disabled:cursor-not-allowed disabled:opacity-50";

function profileValues(business: BusinessRecord): BusinessProfileInput {
  return {
    name: business.name,
    categoryId: business.categoryId,
    description: business.description,
    contact: business.contact,
    address: business.address,
  };
}

export function BusinessProfilePage() {
  useDocumentTitle("Business profile");
  const auth = useAuth();
  const workspace = useActiveBusiness();
  const businessId = workspace.status === "ready" ? workspace.active.businessId : "";
  const business = useQuery({
    queryKey: ["business", businessId],
    enabled: businessId.length > 0,
    queryFn: () => readBusiness(businessId),
  });
  const settings = useQuery({
    queryKey: ["platform-settings", "global"],
    queryFn: readPlatformSettings,
  });

  if (workspace.status !== "ready") return null;
  if (!roleHas(workspace.active.role, "business.profile.read")) {
    return (
      <ErrorState title="Profile unavailable" message="You cannot read this business profile." />
    );
  }
  if (business.isPending || settings.isPending)
    return <LoadingState label="Loading business profile" />;
  if (business.isError || settings.isError || !business.data) {
    return (
      <ErrorState
        title="Profile unavailable"
        message="The business profile could not be loaded."
        onRetry={() => {
          void business.refetch();
          void settings.refetch();
        }}
      />
    );
  }

  const editable = canEdit(
    workspace.active.role,
    "business.profile.update",
    business.data.status === "suspended",
  );

  return (
    <BusinessProfileForm
      key={business.data.id}
      business={business.data}
      settings={settings.data}
      editable={editable}
      uid={auth.user?.uid ?? ""}
    />
  );
}

function BusinessProfileForm({
  business,
  settings,
  editable,
  uid,
}: {
  business: BusinessRecord;
  settings: OnboardingSettings;
  editable: boolean;
  uid: string;
}) {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const form = useForm<BusinessProfileInput>({
    resolver: zodResolver(businessProfileSchema),
    defaultValues: profileValues(business),
  });
  const orderedCountries = useMemo(() => {
    const pinned = new Set(settings.supportedCountries);
    return [
      ...countries.filter(([code]) => pinned.has(code)),
      ...countries.filter(([code]) => !pinned.has(code)),
    ];
  }, [settings.supportedCountries]);

  useEffect(() => {
    form.reset(profileValues(business));
  }, [business, form]);

  return (
    <form
      className="mx-auto flex w-full max-w-2xl flex-col gap-4"
      noValidate
      onSubmit={form.handleSubmit(async (input) => {
        setSaving(true);
        setError(null);
        setMessage(null);
        try {
          await saveBusinessProfile(business.id, input);
          await queryClient.invalidateQueries({ queryKey: ["business", business.id] });
          await queryClient.invalidateQueries({ queryKey: ["memberships", uid] });
          setMessage("Business profile saved.");
        } catch (caught) {
          setError(mapDashboardError(caught));
        } finally {
          setSaving(false);
        }
      })}
    >
      <PageHeader
        title="Business profile"
        description={
          editable
            ? "These details describe the business. The web address cannot be changed here."
            : "You can read this profile. Your role cannot change it."
        }
      />
      <p className="text-sm text-muted-foreground">Web address: {business.slug}</p>
      <Input
        label="Business name"
        disabled={!editable}
        error={form.formState.errors.name?.message}
        {...form.register("name")}
      />
      <label className="flex flex-col gap-2 text-sm font-medium">
        Category
        <select className={selectClass} disabled={!editable} {...form.register("categoryId")}>
          {settings.businessCategories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.label}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-2 text-sm font-medium">
        Description
        <textarea
          className="min-h-28 rounded-md border border-input bg-card px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!editable}
          {...form.register("description")}
        />
      </label>
      <Input
        label="Contact email"
        type="email"
        disabled={!editable}
        error={form.formState.errors.contact?.email?.message}
        {...form.register("contact.email")}
      />
      <Input
        label="Phone"
        disabled={!editable}
        error={form.formState.errors.contact?.phone?.message}
        {...form.register("contact.phone")}
      />
      <Input
        label="Website"
        disabled={!editable}
        error={form.formState.errors.contact?.website?.message}
        {...form.register("contact.website")}
      />
      <Input
        label="Address line 1"
        disabled={!editable}
        error={form.formState.errors.address?.line1?.message}
        {...form.register("address.line1")}
      />
      <Input label="Address line 2" disabled={!editable} {...form.register("address.line2")} />
      <Input
        label="City"
        disabled={!editable}
        error={form.formState.errors.address?.city?.message}
        {...form.register("address.city")}
      />
      <Input label="Region" disabled={!editable} {...form.register("address.region")} />
      <Input label="Postal code" disabled={!editable} {...form.register("address.postalCode")} />
      <label className="flex flex-col gap-2 text-sm font-medium">
        Country
        <select className={selectClass} disabled={!editable} {...form.register("address.country")}>
          {orderedCountries.map(([code, name]) => (
            <option key={code} value={code}>
              {name}
            </option>
          ))}
        </select>
      </label>
      {error ? <p role="alert">{error}</p> : null}
      {message ? <p role="status">{message}</p> : null}
      {editable ? (
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save profile"}
        </Button>
      ) : null}
    </form>
  );
}

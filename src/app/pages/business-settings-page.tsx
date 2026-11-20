import { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { roleHas } from "@shared/permissions";
import { businessSettingsSchema, type BusinessSettingsInput } from "@shared/validation/business";
import { useActiveBusiness } from "@/app/providers/active-business-context";
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
  saveBusinessSettings,
  type BusinessRecord,
} from "@/lib/business/dashboard";
import { readPlatformSettings, type OnboardingSettings } from "@/lib/business/onboarding";

const selectClass =
  "h-11 rounded-md border border-input bg-card px-3 text-sm text-foreground disabled:cursor-not-allowed disabled:opacity-50";

function settingsValues(business: BusinessRecord): BusinessSettingsInput {
  return {
    timezone: business.timezone,
    currency: business.currency,
    language: business.language,
    notificationEmail: business.notificationEmail,
  };
}

export function BusinessSettingsPage() {
  useDocumentTitle("Business settings");
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
  if (!roleHas(workspace.active.role, "business.settings.read")) {
    return <ErrorState title="Settings unavailable" message="You cannot open business settings." />;
  }
  if (business.isPending || settings.isPending) {
    return <LoadingState label="Loading business settings" />;
  }
  if (business.isError || settings.isError || !business.data) {
    return (
      <ErrorState
        title="Settings unavailable"
        message="Business settings could not be loaded."
        onRetry={() => {
          void business.refetch();
          void settings.refetch();
        }}
      />
    );
  }

  const editable = canEdit(
    workspace.active.role,
    "business.settings.update",
    business.data.status === "suspended",
  );

  return (
    <BusinessSettingsForm
      key={business.data.id}
      business={business.data}
      settings={settings.data}
      editable={editable}
    />
  );
}

function BusinessSettingsForm({
  business,
  settings,
  editable,
}: {
  business: BusinessRecord;
  settings: OnboardingSettings;
  editable: boolean;
}) {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const timeZones = useMemo(() => Intl.supportedValuesOf("timeZone"), []);
  const form = useForm<BusinessSettingsInput>({
    resolver: zodResolver(businessSettingsSchema),
    defaultValues: settingsValues(business),
  });

  useEffect(() => {
    form.reset(settingsValues(business));
  }, [business, form]);

  return (
    <form
      className="mx-auto flex w-full max-w-xl flex-col gap-4"
      noValidate
      onSubmit={form.handleSubmit(async (input) => {
        setSaving(true);
        setError(null);
        setMessage(null);
        try {
          await saveBusinessSettings(business.id, input);
          await queryClient.invalidateQueries({ queryKey: ["business", business.id] });
          setMessage("Business settings saved.");
        } catch (caught) {
          setError(mapDashboardError(caught));
        } finally {
          setSaving(false);
        }
      })}
    >
      <PageHeader
        title="Settings"
        description={
          editable
            ? "Time zone, currency, and language apply to this business."
            : "You can read these settings. Your role cannot change them."
        }
      />
      <label className="flex flex-col gap-2 text-sm font-medium">
        Time zone
        <select className={selectClass} disabled={!editable} {...form.register("timezone")}>
          {timeZones.map((zone) => (
            <option key={zone} value={zone}>
              {zone}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-2 text-sm font-medium">
        Currency
        <select className={selectClass} disabled={!editable} {...form.register("currency")}>
          {settings.supportedCurrencies.map((code) => (
            <option key={code} value={code}>
              {code}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-2 text-sm font-medium">
        Language
        <select className={selectClass} disabled={!editable} {...form.register("language")}>
          {settings.supportedLanguages.map((code) => (
            <option key={code} value={code}>
              {code}
            </option>
          ))}
        </select>
      </label>
      <Input
        label="Notification email"
        type="email"
        hint="Optional. Leave blank to keep notifications off."
        disabled={!editable}
        error={form.formState.errors.notificationEmail?.message}
        {...form.register("notificationEmail")}
      />
      {error ? <p role="alert">{error}</p> : null}
      {message ? <p role="status">{message}</p> : null}
      {editable ? (
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save settings"}
        </Button>
      ) : null}
    </form>
  );
}

import { useQuery } from "@tanstack/react-query";
import { ErrorState } from "@/components/shared/error-state";
import { LoadingState } from "@/components/shared/loading-state";
import { PageHeader } from "@/components/shared/page-header";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { loadPlatformSettingsView, mapPlatformError } from "@/lib/platform/admin";

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3">
      <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</dt>
      <dd className="mt-1 text-sm">{value}</dd>
    </div>
  );
}

export function SuperAdminSettingsPage() {
  useDocumentTitle("Platform settings");
  const settings = useQuery({
    queryKey: ["platform-settings-view"],
    queryFn: loadPlatformSettingsView,
  });

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <PageHeader
        title="Platform settings"
        description="The seeded platformSettings/global document. This screen does not edit it. Categories, subscriptions, and reports are not available yet."
      />
      {settings.isPending ? <LoadingState label="Loading platform settings" /> : null}
      {settings.isError ? (
        <ErrorState
          title="Settings unavailable"
          message={mapPlatformError(settings.error)}
          onRetry={() => void settings.refetch()}
        />
      ) : null}
      {settings.isSuccess ? (
        <>
          <dl className="grid gap-4 sm:grid-cols-2">
            <Fact label="Default country" value={settings.data.defaultCountry} />
            <Fact label="Default currency" value={settings.data.defaultCurrency} />
            <Fact label="Default language" value={settings.data.defaultLanguage} />
            <Fact label="Default timezone" value={settings.data.defaultTimezone} />
            <Fact label="Maintenance" value={settings.data.maintenanceMode ? "On" : "Off"} />
            <Fact label="Currencies" value={settings.data.supportedCurrencies.join(", ")} />
            <Fact label="Languages" value={settings.data.supportedLanguages.join(", ")} />
          </dl>
          <section className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold">Categories</h2>
            <ul className="flex flex-wrap gap-2">
              {settings.data.categories.map((label) => (
                <li key={label} className="rounded-full bg-muted px-3 py-1 text-sm">
                  {label}
                </li>
              ))}
            </ul>
          </section>
        </>
      ) : null}
    </div>
  );
}

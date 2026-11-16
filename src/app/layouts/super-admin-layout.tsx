import { superAdminNavigation } from "@/app/navigation/items";
import { AppShell } from "@/app/layouts/app-shell";

export function SuperAdminLayout() {
  return <AppShell items={superAdminNavigation} heading="Platform" />;
}

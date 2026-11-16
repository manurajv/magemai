import { businessNavigation } from "@/app/navigation/items";
import { AppShell } from "@/app/layouts/app-shell";

export function DashboardLayout() {
  return <AppShell items={businessNavigation} heading="Workspace" />;
}

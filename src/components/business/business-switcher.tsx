import { useActiveBusiness } from "@/app/providers/active-business-context";
import { Button } from "@/components/ui/button";
import { DropdownMenu } from "@/components/ui/dropdown-menu";
import { roleLabel } from "@shared/permissions";

export function BusinessSwitcher() {
  const workspace = useActiveBusiness();
  if (workspace.status === "loading") {
    return <p className="text-sm text-muted-foreground">Loading businesses</p>;
  }
  if (workspace.status !== "ready") return null;

  return (
    <DropdownMenu
      label="Switch business"
      trigger={
        <Button
          type="button"
          variant="outline"
          size="sm"
          data-testid="business-switcher"
          className="max-w-64"
        >
          <span className="truncate">{workspace.active.name}</span>
          <span className="text-xs font-normal text-muted-foreground">
            {roleLabel(workspace.active.role)}
          </span>
        </Button>
      }
      items={workspace.memberships.map((membership) => ({
        label: `${membership.name}, ${roleLabel(membership.role)}`,
        onSelect: () => workspace.select(membership.businessId),
      }))}
    />
  );
}

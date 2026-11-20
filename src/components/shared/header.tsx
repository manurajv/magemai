import { Menu } from "lucide-react";
import { Link, useNavigate } from "react-router";
import { useSuperAdminClaim } from "@/app/platform/use-super-admin-claim";
import { useAuth } from "@/app/providers/auth-context";
import { BusinessSwitcher } from "@/components/business/business-switcher";
import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";
import { DropdownMenu } from "@/components/ui/dropdown-menu";

type HeaderProps = {
  onOpenSidebar: () => void;
};

export function Header({ onOpenSidebar }: HeaderProps) {
  const auth = useAuth();
  const navigate = useNavigate();
  const platformClaim = useSuperAdminClaim(auth.user?.uid ?? null);
  const items = auth.user
    ? [
        { label: "Profile", onSelect: () => navigate("/profile") },
        { label: "Sign out", onSelect: () => void auth.signOut() },
      ]
    : [{ label: "Sign in", onSelect: () => navigate("/login") }];

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-card px-4 md:px-6">
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="lg:hidden"
        data-testid="open-sidebar"
        aria-label="Open navigation"
        onClick={onOpenSidebar}
      >
        <Menu className="size-4" aria-hidden />
      </Button>
      <div className="lg:hidden">
        <Logo compact />
      </div>
      <BusinessSwitcher />
      {platformClaim === "yes" ? (
        <Link to="/super-admin" className="text-sm font-medium text-foreground">
          Platform
        </Link>
      ) : null}
      <div className="ml-auto">
        <DropdownMenu
          label="Account"
          trigger={
            <Button type="button" variant="outline" size="sm">
              Account
            </Button>
          }
          items={items}
        />
      </div>
    </header>
  );
}

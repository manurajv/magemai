import { Menu } from "lucide-react";
import { useNavigate } from "react-router";
import { useAuth } from "@/app/providers/auth-context";
import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";
import { DropdownMenu } from "@/components/ui/dropdown-menu";

type HeaderProps = {
  onOpenSidebar: () => void;
};

export function Header({ onOpenSidebar }: HeaderProps) {
  const auth = useAuth();
  const navigate = useNavigate();
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
      <button
        type="button"
        disabled
        className="flex min-w-0 flex-1 flex-col items-start rounded-md border border-border bg-background px-3 py-1.5 text-left sm:flex-none"
      >
        <span className="max-w-full truncate text-sm font-medium">No business selected</span>
        <span className="max-w-full truncate text-xs text-muted-foreground">
          Switcher not yet implemented
        </span>
      </button>
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

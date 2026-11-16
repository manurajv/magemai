import { useEffect } from "react";
import { Link } from "react-router";
import type { NavItem } from "@/app/navigation/items";
import { Logo } from "@/components/shared/logo";
import { Navigation } from "@/components/shared/navigation";
import { brand } from "@/config/brand";
import { cn } from "@/lib/utilities/cn";

type SidebarProps = {
  open: boolean;
  onClose: () => void;
  items: readonly NavItem[];
  heading: string;
};

export function Sidebar({ open, onClose, items, heading }: SidebarProps) {
  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <>
      {open ? (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-foreground/40 lg:hidden"
          aria-label="Close navigation"
          onClick={onClose}
        />
      ) : null}
      <aside
        data-testid="app-sidebar"
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-72 flex-col bg-primary text-primary-foreground shadow-lg transition-transform lg:static lg:translate-x-0 lg:shadow-none",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between gap-3 px-4 py-5">
          <Link
            to="/"
            className="rounded-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <Logo tone="inverse" />
          </Link>
          <button
            type="button"
            className="rounded-md px-2 py-1 text-sm text-primary-foreground/80 lg:hidden"
            onClick={onClose}
          >
            Close
          </button>
        </div>
        <p className="px-4 pb-2 text-xs font-medium tracking-wide text-primary-foreground/60 uppercase">
          {heading}
        </p>
        <div className="flex-1 overflow-y-auto px-3 pb-4">
          <Navigation items={items} />
        </div>
        <p className="px-4 py-4 text-xs text-primary-foreground/70">{brand.tagline}</p>
      </aside>
    </>
  );
}

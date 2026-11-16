import { NavLink } from "react-router";
import { ComingSoon } from "@/components/shared/coming-soon";
import type { NavItem } from "@/app/navigation/items";
import { cn } from "@/lib/utilities/cn";

export function Navigation({ items }: { items: readonly NavItem[] }) {
  return (
    <nav aria-label="Primary" className="flex flex-col gap-1">
      {items.map((item) => {
        const Icon = item.icon;
        if ("comingSoon" in item) {
          return (
            <button
              key={item.label}
              type="button"
              disabled
              className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm text-primary-foreground/70"
            >
              <Icon className="size-4 shrink-0" aria-hidden />
              <span className="flex-1">{item.label}</span>
              <ComingSoon tone="inverse" />
            </button>
          );
        }
        return (
          <NavLink
            key={item.label}
            to={item.to}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm",
                isActive
                  ? "bg-primary-foreground/10 font-medium text-primary-foreground shadow-[inset_3px_0_0_0_var(--accent)]"
                  : "text-primary-foreground/80 hover:bg-primary-foreground/10",
              )
            }
          >
            <Icon className="size-4 shrink-0" aria-hidden />
            <span>{item.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}

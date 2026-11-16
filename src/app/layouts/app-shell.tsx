import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Outlet, useLocation } from "react-router";
import type { NavItem } from "@/app/navigation/items";
import { Header } from "@/components/shared/header";
import { Sidebar } from "@/components/shared/sidebar";

type AppShellProps = {
  items: readonly NavItem[];
  heading: string;
  children?: ReactNode;
};

export function AppShell({ items, heading, children }: AppShellProps) {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    close();
  }, [location.pathname, close]);

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <div className="lg:grid lg:grid-cols-[18rem_minmax(0,1fr)]">
        <Sidebar open={open} onClose={close} items={items} heading={heading} />
        <div className="flex min-h-dvh min-w-0 flex-col">
          <Header onOpenSidebar={() => setOpen(true)} />
          <main id="main" className="flex-1 px-4 py-6 md:px-8 md:py-8">
            {children ?? <Outlet />}
          </main>
        </div>
      </div>
    </div>
  );
}

import { Link, Outlet } from "react-router";
import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";

export function PublicLayout() {
  return (
    <div className="min-h-dvh bg-background">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-card focus:px-3 focus:py-2"
      >
        Skip to content
      </a>
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
          <Link
            to="/"
            className="rounded-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <Logo />
          </Link>
          <nav className="flex items-center gap-2" aria-label="Account">
            <Button asChild variant="ghost" size="sm">
              <Link to="/login">Sign in</Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/register">Create account</Link>
            </Button>
          </nav>
        </div>
      </header>
      <main id="main" className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10">
        <Outlet />
      </main>
    </div>
  );
}

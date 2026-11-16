import { Link, Outlet } from "react-router";
import { Logo } from "@/components/shared/logo";
import { Card, CardContent } from "@/components/ui/card";
import { brand } from "@/config/brand";

export function AuthLayout() {
  return (
    <div className="grid min-h-dvh place-items-center bg-background px-4 py-10">
      <div className="w-full max-w-md">
        <Link
          to="/"
          className="mb-6 flex justify-center rounded-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <Logo />
        </Link>
        <Card>
          <CardContent className="flex flex-col gap-4 py-6">
            <p className="text-center text-sm text-muted-foreground">{brand.tagline}</p>
            <Outlet />
          </CardContent>
        </Card>
        <p className="mt-4 text-center text-xs text-muted-foreground">{brand.endorsement}</p>
      </div>
    </div>
  );
}

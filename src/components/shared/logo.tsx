import { brand } from "@/config/brand";
import { cn } from "@/lib/utilities/cn";

type LogoProps = {
  tone?: "default" | "inverse";
  compact?: boolean;
};

export function Logo({ tone = "default", compact = false }: LogoProps) {
  const initial = brand.name.slice(0, 1);
  const inverse = tone === "inverse";

  return (
    <span className="inline-flex items-center gap-3">
      <span
        className={cn(
          "grid size-9 shrink-0 place-items-center rounded-md text-sm font-semibold",
          inverse ? "bg-accent text-accent-foreground" : "bg-primary text-primary-foreground",
        )}
        aria-hidden
      >
        {initial}
      </span>
      <span className="flex min-w-0 flex-col text-left">
        <span
          className={cn(
            "font-semibold leading-tight",
            inverse ? "text-primary-foreground" : "text-foreground",
          )}
        >
          {brand.name}
        </span>
        {compact ? null : (
          <span
            className={cn(
              "text-xs",
              inverse ? "text-primary-foreground/75" : "text-muted-foreground",
            )}
          >
            {brand.endorsement}
          </span>
        )}
      </span>
    </span>
  );
}

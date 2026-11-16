import { cn } from "@/lib/utilities/cn";

export function ComingSoon({ tone = "default" }: { tone?: "default" | "inverse" }) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[0.65rem] font-semibold tracking-wide uppercase",
        tone === "inverse"
          ? "bg-primary-foreground/15 text-primary-foreground"
          : "bg-muted text-muted-foreground",
      )}
    >
      Coming soon
    </span>
  );
}

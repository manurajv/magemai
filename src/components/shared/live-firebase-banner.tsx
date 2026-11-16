import { LIVE_FIREBASE_BANNER } from "@/lib/firebase/env";

export function LiveFirebaseBanner({ mode }: { mode: "emulator" | "live" }) {
  if (mode !== "live") return null;
  return (
    <div
      role="status"
      className="bg-destructive px-4 py-2 text-center text-sm font-medium text-destructive-foreground"
    >
      {LIVE_FIREBASE_BANNER}
    </div>
  );
}

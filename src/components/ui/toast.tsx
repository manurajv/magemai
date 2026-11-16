import { Toaster as Sonner } from "sonner";

export function Toaster() {
  return (
    <Sonner
      theme="light"
      position="top-right"
      toastOptions={{
        classNames: {
          toast: "border border-border bg-popover text-popover-foreground shadow-md",
          title: "text-foreground",
          description: "text-muted-foreground",
        },
      }}
    />
  );
}

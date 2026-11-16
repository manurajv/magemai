import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";

type DialogProps = {
  trigger: ReactNode;
  title: string;
  description?: string;
  children?: ReactNode;
};

export function Dialog({ trigger, title, description, children }: DialogProps) {
  return (
    <DialogPrimitive.Root>
      <DialogPrimitive.Trigger asChild>{trigger}</DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-foreground/40" />
        <DialogPrimitive.Content className="fixed top-1/2 left-1/2 z-50 w-[min(100%-2rem,32rem)] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-card p-6 text-card-foreground shadow-lg">
          <div className="flex items-start justify-between gap-4">
            <DialogPrimitive.Title className="text-lg font-semibold tracking-tight">
              {title}
            </DialogPrimitive.Title>
            <DialogPrimitive.Close
              className="rounded-md p-1 text-muted-foreground hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              aria-label="Close"
            >
              <X className="size-4" aria-hidden />
            </DialogPrimitive.Close>
          </div>
          {description ? (
            <DialogPrimitive.Description className="mt-2 text-sm text-muted-foreground">
              {description}
            </DialogPrimitive.Description>
          ) : null}
          {children ? <div className="mt-4">{children}</div> : null}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

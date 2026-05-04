"use client";

import { Toaster as SonnerToaster } from "sonner";

/**
 * App-wide toast container. Mounted once in the root layout. The
 * notification bell emits toasts on realtime INSERT events (when the
 * popover is closed) so users get a live banner for important things
 * — DM arrived, session went live, etc. — without having to monitor
 * the bell badge.
 *
 * Theming: matches the app's dark-mode palette via the same
 * `oklch(0.17 0 0)` card surface elsewhere. Position bottom-right
 * so it doesn't compete with the topbar.
 */
export function AppToaster() {
  return (
    <SonnerToaster
      position="bottom-right"
      richColors={false}
      closeButton
      duration={6000}
      toastOptions={{
        classNames: {
          toast:
            "group rounded-xl border border-border/60 bg-popover text-popover-foreground shadow-xl shadow-black/30",
          title: "text-sm font-medium tracking-tight",
          description: "text-xs text-muted-foreground mt-0.5",
          actionButton:
            "rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90",
          cancelButton:
            "rounded-md bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-muted/80",
          closeButton:
            "rounded-md bg-muted text-muted-foreground hover:text-foreground",
        },
      }}
    />
  );
}

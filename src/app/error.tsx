"use client";

import { useEffect } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Illustration } from "@/components/shared/illustration";

/**
 * Root error boundary — shown when a route throws an unhandled error.
 *
 * Hero illustration replaces the previous AlertTriangle-in-a-circle.
 * The illustration carries the "something's wrong" mood without the
 * intensity of a saturated red icon, which read as more alarming than
 * the situation usually warrants (most errors are transient).
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <Illustration name="error" alt="" size="md" priority />
      <h2 className="text-xl font-medium tracking-tight text-foreground">
        Something went wrong
      </h2>
      <p className="max-w-md text-sm text-muted-foreground">
        An unexpected error occurred. Try refreshing the page or come back later.
      </p>
      <Button onClick={reset} className="mt-2 gap-2">
        <RefreshCw className="h-4 w-4" />
        Try again
      </Button>
    </div>
  );
}

"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

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
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50 dark:bg-red-500/10">
        <AlertTriangle className="h-7 w-7 text-red-500" />
      </div>
      <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">
        Something went wrong
      </h2>
      <p className="max-w-md text-sm text-neutral-500 dark:text-neutral-400">
        An unexpected error occurred. Try refreshing the page or come back later.
      </p>
      <Button onClick={reset} className="mt-2 gap-2">
        <RefreshCw className="h-4 w-4" />
        Try again
      </Button>
    </div>
  );
}

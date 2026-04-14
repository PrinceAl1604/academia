"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { XCircle, ArrowLeft, RefreshCw, HelpCircle } from "lucide-react";

export default function PaymentFailedPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-md text-center space-y-6">
        {/* Error Icon */}
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-100 dark:bg-red-500/10 ring-1 ring-red-200/60 dark:ring-red-700/40">
          <XCircle className="h-10 w-10 text-red-500" />
        </div>

        {/* Title */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">
            Payment Failed
          </h1>
          <p className="text-lg text-muted-foreground">
            Your payment could not be processed. No charge has been made.
          </p>
        </div>

        {/* Possible reasons */}
        <div className="rounded-xl border border-border bg-card p-6 text-left space-y-3">
          <p className="text-sm font-semibold text-foreground">
            This might have happened because:
          </p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-muted-foreground/50 shrink-0" />
              Insufficient balance on your mobile money account
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-muted-foreground/50 shrink-0" />
              The transaction was cancelled
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-muted-foreground/50 shrink-0" />
              A temporary network issue occurred
            </li>
          </ul>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col gap-3">
          <Button
            className="h-12 w-full gap-2 text-base"
            render={<Link href="/dashboard/subscription" />}
          >
            <RefreshCw className="h-5 w-5" />
            Try Again
          </Button>
          <Button
            variant="outline"
            className="h-10 w-full gap-2"
            render={<Link href="/" />}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Courses
          </Button>
        </div>

        {/* Help */}
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground/70">
          <HelpCircle className="h-4 w-4" />
          <span>
            Need help?{" "}
            <Link
              href="/dashboard/help"
              className="text-foreground underline underline-offset-2"
            >
              Contact support
            </Link>
          </span>
        </div>
      </div>
    </div>
  );
}

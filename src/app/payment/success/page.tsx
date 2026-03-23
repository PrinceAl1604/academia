"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CheckCircle, BookOpen, Key } from "lucide-react";

export default function PaymentSuccessPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#faf9f7] px-4">
      <div className="w-full max-w-md text-center space-y-6">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
          <CheckCircle className="h-10 w-10 text-green-600" />
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-neutral-900">
            Purchase Successful!
          </h1>
          <p className="text-lg text-neutral-500">
            Your licence key has been sent to your email.
          </p>
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-6 text-left space-y-3">
          <p className="text-sm font-semibold text-neutral-900">
            Next step:
          </p>
          <div className="flex items-start gap-3">
            <Key className="h-5 w-5 text-neutral-400 mt-0.5 shrink-0" />
            <p className="text-sm text-neutral-600">
              Check your email for the licence key, then go to
              <strong> Subscription </strong> in the app and enter it to activate Pro.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <Button
            className="h-12 w-full gap-2 text-base"
            render={<Link href="/dashboard/subscription" />}
          >
            <Key className="h-5 w-5" />
            Activate My Key
          </Button>
          <Button
            variant="outline"
            className="h-10 w-full gap-2"
            render={<Link href="/" />}
          >
            <BookOpen className="h-4 w-4" />
            Browse Courses
          </Button>
        </div>
      </div>
    </div>
  );
}

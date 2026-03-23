"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CheckCircle, ArrowRight, BookOpen, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function SuccessContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const [verified, setVerified] = useState(false);
  const [verifying, setVerifying] = useState(true);

  useEffect(() => {
    const paymentRef = searchParams.get("ref") || localStorage.getItem("pending_payment_ref");

    if (paymentRef && user) {
      fetch("/api/payment/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payment_ref: paymentRef, user_id: user.id }),
      })
        .then((res) => res.json())
        .then((data) => {
          localStorage.removeItem("pending_payment_ref");
          setVerified(data.success);
          setVerifying(false);
        })
        .catch(() => {
          setVerifying(false);
        });
    } else {
      // No ref — assume webhook already handled it
      setVerified(true);
      setVerifying(false);
    }
  }, [searchParams, user]);

  if (verifying) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#faf9f7]">
        <div className="text-center space-y-4">
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-neutral-400" />
          <p className="text-neutral-500">Verifying your payment...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#faf9f7] px-4">
      <div className="w-full max-w-md text-center space-y-6">
        {/* Success Icon */}
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
          <CheckCircle className="h-10 w-10 text-green-600" />
        </div>

        {/* Title */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-neutral-900">
            Payment Successful!
          </h1>
          <p className="text-lg text-neutral-500">
            Welcome to Pro! You now have unlimited access to all courses.
          </p>
        </div>

        {/* What's included */}
        <div className="rounded-xl border border-neutral-200 bg-white p-6 text-left space-y-3">
          <p className="text-sm font-semibold text-neutral-900">
            Your Pro membership includes:
          </p>
          <ul className="space-y-2 text-sm text-neutral-600">
            {[
              "Access to all premium courses",
              "Certificate of completion",
              "Downloadable resources",
              "Priority support",
              "New courses as they launch",
            ].map((item) => (
              <li key={item} className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col gap-3">
          <Button
            className="h-12 w-full gap-2 text-base"
            render={<Link href="/" />}
          >
            <BookOpen className="h-5 w-5" />
            Start Learning
          </Button>
          <Button
            variant="outline"
            className="h-10 w-full gap-2"
            render={<Link href="/dashboard/subscription" />}
          >
            View Subscription
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Footer */}
        <p className="text-xs text-neutral-400">
          A confirmation email has been sent to your inbox.
        </p>
      </div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#faf9f7]">
          <Loader2 className="h-10 w-10 animate-spin text-neutral-400" />
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}

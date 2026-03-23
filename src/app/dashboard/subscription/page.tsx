"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Check, Crown, Loader2, Shield } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { SUBSCRIPTION_PRICE } from "@/lib/payment";

const FEATURES = [
  "Access to all courses",
  "Certificate of completion",
  "Downloadable resources",
  "Community access",
  "Priority support",
  "New courses as they launch",
];

export default function SubscriptionPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-neutral-400" /></div>}>
      <SubscriptionContent />
    </Suspense>
  );
}

function SubscriptionContent() {
  const { user, isPro } = useAuth();
  const searchParams = useSearchParams();
  const [paying, setPaying] = useState(false);
  const [verifying, setVerifying] = useState(false);

  // Handle payment callback from Monetbil
  useEffect(() => {
    const isCallback = searchParams.get("payment") === "callback";
    const paymentRef = searchParams.get("ref") || localStorage.getItem("pending_payment_ref");

    if (isCallback && paymentRef && user && !isPro) {
      setVerifying(true);
      fetch("/api/payment/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payment_ref: paymentRef, user_id: user.id }),
      })
        .then((res) => res.json())
        .then((data) => {
          localStorage.removeItem("pending_payment_ref");
          if (data.success) {
            window.location.href = "/dashboard/subscription";
          }
          setVerifying(false);
        })
        .catch(() => setVerifying(false));
    }
  }, [searchParams, user, isPro]);

  const handleSubscribe = async (provider: "monetbil" | "magma") => {
    if (!user) return;
    setPaying(true);

    const endpoint = provider === "magma" ? "/api/payment/magma" : "/api/payment/initialize";

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: user.id,
          email: user.email,
          name: user.user_metadata?.full_name || "",
        }),
      });

      const data = await res.json();

      if (data.checkout_url) {
        if (data.payment_ref) {
          localStorage.setItem("pending_payment_ref", data.payment_ref);
        }
        window.location.href = data.checkout_url;
      } else {
        alert(data.error || "Failed to start payment. Please try again.");
        setPaying(false);
      }
    } catch {
      alert("Something went wrong. Please try again.");
      setPaying(false);
    }
  };

  if (verifying) {
    return (
      <div className="mx-auto max-w-2xl py-20 text-center">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-neutral-400" />
        <p className="mt-4 text-neutral-500">Verifying your payment...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Subscription</h1>
        <p className="mt-1 text-neutral-500">
          Manage your membership plan
        </p>
      </div>

      {isPro ? (
        /* ─── Active Pro Plan ─────────────────────────────────────── */
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
                <Crown className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold text-neutral-900">
                    Pro Plan
                  </h3>
                  <Badge className="bg-green-100 text-green-700">Active</Badge>
                </div>
                <p className="text-sm text-neutral-500">
                  Full access to all courses and content
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-neutral-900">
                {SUBSCRIPTION_PRICE.toLocaleString()}
              </p>
              <p className="text-xs text-neutral-500">FCFA / month</p>
            </div>
          </div>
        </Card>
      ) : (
        /* ─── Free Plan → Upgrade ────────────────────────────────── */
        <Card className="overflow-hidden">
          <div className="border-b bg-neutral-50 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-neutral-900">
                  Free Plan
                </h3>
                <p className="text-sm text-neutral-500">
                  Access to free courses only
                </p>
              </div>
              <Badge variant="secondary">Current Plan</Badge>
            </div>
          </div>

          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
                <Crown className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-neutral-900">
                  Upgrade to Pro
                </h3>
                <p className="text-sm text-neutral-500">
                  Unlock all courses and premium content
                </p>
              </div>
            </div>

            <div className="mb-6 flex items-baseline gap-1">
              <span className="text-4xl font-bold text-neutral-900">
                {SUBSCRIPTION_PRICE.toLocaleString()}
              </span>
              <span className="text-lg text-neutral-500">FCFA</span>
              <span className="text-sm text-neutral-400">/ month</span>
            </div>

            <div className="space-y-3">
              <Button
                className="h-12 w-full gap-2 text-base"
                onClick={() => handleSubscribe("monetbil")}
                disabled={paying}
              >
                {paying ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Crown className="h-5 w-5" />
                )}
                {paying ? "Redirecting..." : "Pay with Monetbil"}
              </Button>

              <Button
                variant="outline"
                className="h-12 w-full gap-2 text-base"
                onClick={() => handleSubscribe("magma")}
                disabled={paying}
              >
                {paying ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Crown className="h-5 w-5" />
                )}
                {paying ? "Redirecting..." : "Pay with Magma OnePay"}
              </Button>
            </div>

            <div className="mt-3 flex items-center justify-center gap-2 text-xs text-neutral-400">
              <Shield className="h-3.5 w-3.5" />
              Secure payment · Mobile Money & Cards accepted
            </div>
          </div>
        </Card>
      )}

      {/* Features */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-neutral-900">
          {isPro ? "What's included" : "What you'll get with Pro"}
        </h3>
        <Separator className="my-4" />
        <ul className="space-y-3">
          {FEATURES.map((feature) => (
            <li key={feature} className="flex items-center gap-2 text-sm text-neutral-700">
              <Check className="h-4 w-4 text-green-600" />
              {feature}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

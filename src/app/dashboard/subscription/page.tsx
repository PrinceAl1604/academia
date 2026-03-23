"use client";

import { useState, Suspense } from "react";
import Script from "next/script";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Check,
  Crown,
  Loader2,
  Shield,
  Key,
  ArrowRight,
  CheckCircle,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/i18n/language-context";
import { SUBSCRIPTION_PRICE, SUBSCRIPTION_CURRENCY } from "@/lib/licence";

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
    <Suspense
      fallback={
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
        </div>
      }
    >
      <SubscriptionContent />
    </Suspense>
  );
}

function SubscriptionContent() {
  const { user, isPro } = useAuth();
  const { t } = useLanguage();
  const [licenceKey, setLicenceKey] = useState("");
  const [activating, setActivating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleActivate = async () => {
    if (!licenceKey.trim() || !user) return;
    setActivating(true);
    setError(null);

    try {
      const res = await fetch("/api/licence/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: licenceKey.trim(),
          user_id: user.id,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setSuccess(true);
        // Reload after a moment to reflect Pro status
        setTimeout(() => window.location.reload(), 2000);
      } else {
        setError(data.error || "Invalid licence key. Please try again.");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    }
    setActivating(false);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">{t.subscription.title}</h1>
        <p className="mt-1 text-neutral-500">{t.subscription.subtitle}</p>
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
                    {t.subscription.proPlan}
                  </h3>
                  <Badge className="bg-green-100 text-green-700">{t.subscription.active}</Badge>
                </div>
                <p className="text-sm text-neutral-500">
                  {t.subscription.fullAccess}
                </p>
              </div>
            </div>
          </div>
        </Card>
      ) : (
        /* ─── Free Plan → Upgrade ────────────────────────────────── */
        <>
          {/* Current plan */}
          <Card className="border-b bg-neutral-50 p-6">
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
          </Card>

          {/* Step 1: Buy via Chariow Snap */}
          <Card className="p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-900 text-sm font-bold text-white shrink-0">
                1
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-neutral-900">
                  Get your licence key
                </h3>
                <p className="mt-1 text-sm text-neutral-500">
                  Purchase a Pro subscription. You'll receive a
                  licence key instantly via email.
                </p>

                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-neutral-900">
                    {SUBSCRIPTION_PRICE.toLocaleString()}
                  </span>
                  <span className="text-lg text-neutral-500">
                    {SUBSCRIPTION_CURRENCY}
                  </span>
                  <span className="text-sm text-neutral-400">/ month</span>
                </div>

                {/* Chariow Widget */}
                <div className="mt-4">
                  <div
                    id="chariow-widget"
                    data-product-id="prd_o6clpf"
                    data-store-domain="jwxfcqrf.mychariow.shop"
                    data-style="tap"
                    data-border-style="rounded"
                    data-cta-width="xs"
                    data-background-color="#FFFFFF"
                    data-cta-animation="shine"
                    data-locale="en"
                    data-primary-color="#7DFF95"
                  />
                  <Script
                    src="https://js.chariow.com/v1/widget.min.js"
                    strategy="afterInteractive"
                  />
                  <link
                    rel="stylesheet"
                    href="https://js.chariow.com/v1/widget.min.css"
                  />
                </div>

                <p className="mt-3 text-xs text-neutral-400">
                  Mobile Money · Wave · Orange Money · Visa/Mastercard
                </p>
              </div>
            </div>
          </Card>

          {/* Step 2: Enter licence key */}
          <Card className="p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-900 text-sm font-bold text-white shrink-0">
                2
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-neutral-900">
                  Activate your licence key
                </h3>
                <p className="mt-1 text-sm text-neutral-500">
                  Enter the key you received after purchase to unlock all
                  courses.
                </p>

                {success ? (
                  <div className="mt-4 flex items-center gap-3 rounded-lg bg-green-50 p-4">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="font-medium text-green-900">
                        Pro activated!
                      </p>
                      <p className="text-sm text-green-700">
                        Refreshing your account...
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="licence-key">Licence Key</Label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Key className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                          <Input
                            id="licence-key"
                            placeholder="EDU-PRO-XXXX-XXXX-XXXX"
                            className="h-11 pl-10 font-mono text-sm tracking-wider uppercase"
                            value={licenceKey}
                            onChange={(e) => {
                              setLicenceKey(e.target.value);
                              setError(null);
                            }}
                            onKeyDown={(e) =>
                              e.key === "Enter" && handleActivate()
                            }
                            disabled={activating}
                          />
                        </div>
                        <Button
                          className="h-11 gap-2"
                          onClick={handleActivate}
                          disabled={
                            activating || !licenceKey.trim()
                          }
                        >
                          {activating ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <ArrowRight className="h-4 w-4" />
                          )}
                          Activate
                        </Button>
                      </div>
                      {error && (
                        <p className="text-sm text-red-500">{error}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-neutral-400">
                      <Shield className="h-3.5 w-3.5" />
                      Your key is single-use and tied to your account
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </>
      )}

      {/* Features */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-neutral-900">
          {t.subscription.whatsIncluded}
        </h3>
        <Separator className="my-4" />
        <ul className="space-y-3">
          {FEATURES.map((feature) => (
            <li
              key={feature}
              className="flex items-center gap-2 text-sm text-neutral-700"
            >
              <Check className="h-4 w-4 text-green-600" />
              {feature}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

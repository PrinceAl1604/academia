"use client";

import { useState, Suspense } from "react";
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

const CURRENCIES = [
  // International
  { code: "USD", symbol: "$", amount: 27, label: "🇺🇸 US Dollar" },
  { code: "EUR", symbol: "€", amount: 24, label: "🇪🇺 Euro" },
  { code: "GBP", symbol: "£", amount: 21, label: "🇬🇧 British Pound" },
  { code: "CAD", symbol: "CA$", amount: 37, label: "🇨🇦 Canadian Dollar" },
  // West Africa - FCFA Zone
  { code: "XOF", symbol: "", amount: 15000, label: "🇨🇮 FCFA (XOF) — Côte d'Ivoire, Sénégal, Mali, Burkina..." },
  { code: "XAF", symbol: "", amount: 15000, label: "🇨🇲 FCFA (XAF) — Cameroun, Gabon, Congo, Tchad..." },
  // West Africa
  { code: "NGN", symbol: "₦", amount: 42000, label: "🇳🇬 Nigerian Naira" },
  { code: "GHS", symbol: "GH₵", amount: 320, label: "🇬🇭 Ghanaian Cedi" },
  { code: "SLL", symbol: "Le", amount: 600000, label: "🇸🇱 Sierra Leonean Leone" },
  { code: "GMD", symbol: "D", amount: 1900, label: "🇬🇲 Gambian Dalasi" },
  { code: "GNF", symbol: "FG", amount: 230000, label: "🇬🇳 Guinean Franc" },
  { code: "LRD", symbol: "L$", amount: 5400, label: "🇱🇷 Liberian Dollar" },
  { code: "CVE", symbol: "", amount: 2700, label: "🇨🇻 Cape Verdean Escudo" },
  // East Africa
  { code: "KES", symbol: "KSh", amount: 3500, label: "🇰🇪 Kenyan Shilling" },
  { code: "TZS", symbol: "TSh", amount: 70000, label: "🇹🇿 Tanzanian Shilling" },
  { code: "UGX", symbol: "USh", amount: 100000, label: "🇺🇬 Ugandan Shilling" },
  { code: "RWF", symbol: "FRw", amount: 37000, label: "🇷🇼 Rwandan Franc" },
  { code: "BIF", symbol: "FBu", amount: 78000, label: "🇧🇮 Burundian Franc" },
  { code: "ETB", symbol: "Br", amount: 3200, label: "🇪🇹 Ethiopian Birr" },
  { code: "SOS", symbol: "Sh", amount: 15400, label: "🇸🇴 Somali Shilling" },
  { code: "DJF", symbol: "Fdj", amount: 4800, label: "🇩🇯 Djiboutian Franc" },
  { code: "ERN", symbol: "Nfk", amount: 405, label: "🇪🇷 Eritrean Nakfa" },
  // Southern Africa
  { code: "ZAR", symbol: "R", amount: 490, label: "🇿🇦 South African Rand" },
  { code: "BWP", symbol: "P", amount: 360, label: "🇧🇼 Botswana Pula" },
  { code: "MZN", symbol: "MT", amount: 1700, label: "🇲🇿 Mozambican Metical" },
  { code: "ZMW", symbol: "ZK", amount: 740, label: "🇿🇲 Zambian Kwacha" },
  { code: "MWK", symbol: "MK", amount: 47000, label: "🇲🇼 Malawian Kwacha" },
  { code: "AOA", symbol: "Kz", amount: 24600, label: "🇦🇴 Angolan Kwanza" },
  { code: "NAD", symbol: "N$", amount: 490, label: "🇳🇦 Namibian Dollar" },
  { code: "SZL", symbol: "E", amount: 490, label: "🇸🇿 Eswatini Lilangeni" },
  { code: "LSL", symbol: "L", amount: 490, label: "🇱🇸 Lesotho Loti" },
  { code: "MGA", symbol: "Ar", amount: 123000, label: "🇲🇬 Malagasy Ariary" },
  { code: "MUR", symbol: "₨", amount: 1230, label: "🇲🇺 Mauritian Rupee" },
  { code: "SCR", symbol: "₨", amount: 370, label: "🇸🇨 Seychellois Rupee" },
  // North Africa
  { code: "MAD", symbol: "", amount: 260, label: "🇲🇦 Moroccan Dirham" },
  { code: "TND", symbol: "", amount: 84, label: "🇹🇳 Tunisian Dinar" },
  { code: "DZD", symbol: "", amount: 3600, label: "🇩🇿 Algerian Dinar" },
  { code: "EGP", symbol: "E£", amount: 1350, label: "🇪🇬 Egyptian Pound" },
  { code: "LYD", symbol: "", amount: 130, label: "🇱🇾 Libyan Dinar" },
  { code: "SDG", symbol: "", amount: 16200, label: "🇸🇩 Sudanese Pound" },
  // Central Africa
  { code: "CDF", symbol: "FC", amount: 76000, label: "🇨🇩 Congolese Franc" },
  { code: "STN", symbol: "Db", amount: 600, label: "🇸🇹 São Tomé Dobra" },
];

function SubscriptionContent() {
  const { user, isPro } = useAuth();
  const { t } = useLanguage();
  const [licenceKey, setLicenceKey] = useState("");
  const [activating, setActivating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [currencySearch, setCurrencySearch] = useState("");
  const [selectedCurrency, setSelectedCurrency] = useState(() => {
    // Auto-detect currency from browser locale
    try {
      const locale = navigator.language || "en-US";
      const regionMap: Record<string, string> = {
        "fr-CI": "XOF", "fr-SN": "XOF", "fr-ML": "XOF", "fr-BF": "XOF", "fr-BJ": "XOF", "fr-TG": "XOF", "fr-NE": "XOF",
        "fr-CM": "XAF", "fr-GA": "XAF", "fr-CG": "XAF", "fr-TD": "XAF", "fr-CF": "XAF",
        "en-NG": "NGN", "en-GH": "GHS", "en-KE": "KES", "en-TZ": "TZS", "en-UG": "UGX",
        "en-ZA": "ZAR", "en-GB": "GBP", "en-CA": "CAD",
        "fr-FR": "EUR", "fr-MA": "MAD", "fr-TN": "TND", "fr-DZ": "DZD",
        "fr-CD": "CDF", "fr-RW": "RWF", "fr-BI": "BIF",
        "ar-EG": "EGP", "ar-MA": "MAD", "ar-TN": "TND", "ar-DZ": "DZD",
        "pt-MZ": "MZN", "pt-AO": "AOA",
        "sw-KE": "KES", "sw-TZ": "TZS",
      };
      const detected = regionMap[locale];
      if (detected) {
        const found = CURRENCIES.find((c) => c.code === detected);
        if (found) return found;
      }
    } catch {}
    return CURRENCIES[0]; // Default USD
  });

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

                {/* Price display */}
                <div className="mt-4">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-neutral-900">
                      {selectedCurrency.symbol}{selectedCurrency.amount.toLocaleString()}
                    </span>
                    <span className="text-lg text-neutral-500">{selectedCurrency.code}</span>
                    <span className="text-sm text-neutral-400">/ month</span>
                  </div>

                  {/* Show USD equivalent if not USD */}
                  {selectedCurrency.code !== "USD" && (
                    <p className="mt-1 text-sm text-neutral-400">
                      ≈ $27 USD
                    </p>
                  )}

                  {/* Toggle currency picker */}
                  <button
                    onClick={() => setShowCurrencyPicker(!showCurrencyPicker)}
                    className="mt-2 text-xs text-neutral-500 underline underline-offset-2 hover:text-neutral-700 transition-colors"
                  >
                    {showCurrencyPicker
                      ? (t.nav.signIn === "Sign In" ? "Hide currencies" : "Masquer")
                      : (t.nav.signIn === "Sign In" ? "See in other currency ▾" : "Voir dans une autre devise ▾")}
                  </button>

                  {/* Expandable currency picker */}
                  {showCurrencyPicker && (
                    <div className="mt-3 rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                      {/* Search */}
                      <input
                        type="text"
                        placeholder={t.nav.signIn === "Sign In" ? "Search country or currency..." : "Rechercher un pays ou une devise..."}
                        value={currencySearch}
                        onChange={(e) => setCurrencySearch(e.target.value)}
                        className="mb-2 h-8 w-full rounded-md border border-neutral-200 bg-white px-3 text-xs placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-300"
                      />
                      <div className="max-h-40 overflow-y-auto space-y-0.5">
                        {CURRENCIES.filter((c) =>
                          c.label.toLowerCase().includes(currencySearch.toLowerCase()) ||
                          c.code.toLowerCase().includes(currencySearch.toLowerCase())
                        ).map((c) => (
                          <button
                            key={c.code}
                            onClick={() => {
                              setSelectedCurrency(c);
                              setShowCurrencyPicker(false);
                              setCurrencySearch("");
                            }}
                            className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-xs transition-colors ${
                              selectedCurrency.code === c.code
                                ? "bg-neutral-900 text-white"
                                : "hover:bg-neutral-200 text-neutral-700"
                            }`}
                          >
                            <span className="truncate">{c.label}</span>
                            <span className="font-mono shrink-0 ml-2">
                              {c.symbol}{c.amount.toLocaleString()}
                            </span>
                          </button>
                        ))}
                      </div>
                      <p className="mt-2 text-[10px] text-neutral-400">
                        {t.nav.signIn === "Sign In" ? "Approximate conversion · Final amount at checkout" : "Conversion approximative · Montant final au paiement"}
                      </p>
                    </div>
                  )}
                </div>

                <Button
                  className="mt-4 h-12 w-full gap-2 text-base"
                  onClick={() => window.location.href = "https://jwxfcqrf.mychariow.shop/prd_o6clpf/checkout?success_url=" + encodeURIComponent(window.location.origin + "/payment/success")}
                >
                  <Crown className="h-5 w-5" />
                  {t.nav.signIn === "Sign In" ? "Pay Now" : "Payer maintenant"}
                </Button>

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

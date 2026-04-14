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


export default function SubscriptionPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
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
  const { user, isPro, proExpiresAt, daysUntilExpiry, isExpiringSoon, isExpired } = useAuth();
  const { t } = useLanguage();
  const [licenceKey, setLicenceKey] = useState("");
  const [activating, setActivating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [currencySearch, setCurrencySearch] = useState("");
  const [paymentPending, setPaymentPending] = useState(false);

  // Open Chariow checkout in a popup window and poll for it to close
  const openCheckoutPopup = () => {
    const checkoutUrl = "https://jwxfcqrf.mychariow.shop/prd_o6clpf/checkout";
    const width = 500;
    const height = 700;
    const left = (window.screen.width - width) / 2;
    const top = (window.screen.height - height) / 2;

    const popup = window.open(
      checkoutUrl,
      "brightroots-checkout",
      `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,resizable=yes`
    );

    if (popup) {
      setPaymentPending(true);
      // Poll every 1s to check if popup is closed
      const pollTimer = setInterval(() => {
        if (popup.closed) {
          clearInterval(pollTimer);
          setPaymentPending(false);
          // Popup closed — user may have completed payment
          // Show a message to enter their licence key
        }
      }, 1000);
    } else {
      // Popup blocked — fallback to new tab
      window.open(checkoutUrl, "_blank");
    }
  };
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
    <div className="mx-auto max-w-2xl space-y-6 px-4 sm:px-0">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t.subscription.title}</h1>
        <p className="mt-1 text-muted-foreground">{t.subscription.subtitle}</p>
      </div>

      {isPro ? (
        /* ─── Active Pro Plan ─────────────────────────────────────── */
        <Card className="relative overflow-hidden p-6 space-y-4">
          {/* Subtle brand glow */}
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/10 blur-3xl" aria-hidden />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/40 ring-1 ring-amber-200/60 dark:ring-amber-700/40">
                <Crown className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold text-foreground">
                    {t.subscription.proPlan}
                  </h3>
                  <Badge className={isExpiringSoon ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" : "bg-primary/15 text-primary"}>
                    {isExpiringSoon
                      ? `${daysUntilExpiry}${t.settings.daysLeft}`
                      : t.subscription.active}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {t.subscription.fullAccess}
                </p>
              </div>
            </div>
          </div>

          {/* Expiry info */}
          {proExpiresAt && (
            <div className="relative flex flex-col gap-3 rounded-xl bg-muted px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs text-muted-foreground">
                  {t.subscription.expires}
                </p>
                <p className="text-sm font-medium text-foreground">
                  {new Date(proExpiresAt).toLocaleDateString(t.nav.signIn === "Sign In" ? "en-US" : "fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                </p>
              </div>
              {isExpiringSoon && (
                <Button
                  size="sm"
                  className="gap-1.5"
                  onClick={openCheckoutPopup}
                >
                  <Crown className="h-3.5 w-3.5" />
                  {t.subscription.renew}
                </Button>
              )}
            </div>
          )}
        </Card>
      ) : (
        /* ─── Free Plan → Upgrade ────────────────────────────────── */
        <>
          {/* Current plan */}
          <Card className="bg-muted/60 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  {t.subscription.freePlan}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t.subscription.freeDesc}
                </p>
              </div>
              <Badge variant="secondary">{t.subscription.currentPlan}</Badge>
            </div>
          </Card>

          {/* Step 1: Buy via Chariow Snap */}
          <Card className="p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground shrink-0">
                1
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-foreground">
                  {t.subscription.getKey}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t.subscription.purchaseDesc}
                </p>

                {/* Price display */}
                <div className="mt-4">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-foreground">
                      {selectedCurrency.symbol}{selectedCurrency.amount.toLocaleString()}
                    </span>
                    <span className="text-lg text-muted-foreground">{selectedCurrency.code}</span>
                    <span className="text-sm text-muted-foreground/70">{t.subscription.perMonth}</span>
                  </div>

                  {/* Show USD equivalent if not USD */}
                  {selectedCurrency.code !== "USD" && (
                    <p className="mt-1 text-sm text-muted-foreground/80">
                      {t.subscription.approxUSD}
                    </p>
                  )}

                  {/* Toggle currency picker */}
                  <button
                    onClick={() => setShowCurrencyPicker(!showCurrencyPicker)}
                    className="mt-2 text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors"
                  >
                    {showCurrencyPicker
                      ? t.subscription.hideCurrencies
                      : t.subscription.seeCurrency}
                  </button>

                  {/* Expandable currency picker */}
                  {showCurrencyPicker && (
                    <div className="mt-3 rounded-xl border border-border bg-muted/60 p-3">
                      {/* Search */}
                      <input
                        type="text"
                        placeholder={t.subscription.searchCurrency}
                        value={currencySearch}
                        onChange={(e) => setCurrencySearch(e.target.value)}
                        className="mb-2 h-8 w-full rounded-md border border-border bg-card px-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
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
                            className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-xs transition-colors ${
                              selectedCurrency.code === c.code
                                ? "bg-primary text-primary-foreground"
                                : "hover:bg-accent text-foreground"
                            }`}
                          >
                            <span className="truncate">{c.label}</span>
                            <span className="font-mono shrink-0 ml-2 tabular-nums">
                              {c.symbol}{c.amount.toLocaleString()}
                            </span>
                          </button>
                        ))}
                      </div>
                      <p className="mt-2 text-[10px] text-muted-foreground/80">
                        {t.subscription.approxConversion}
                      </p>
                    </div>
                  )}
                </div>

                <Button
                  className="mt-4 h-12 w-full gap-2 text-base"
                  onClick={openCheckoutPopup}
                  disabled={paymentPending}
                >
                  {paymentPending ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      {t.subscription.waitingPayment}
                    </>
                  ) : (
                    <>
                      <Crown className="h-5 w-5" />
                      {t.subscription.payNow}
                    </>
                  )}
                </Button>

                <p className="mt-3 text-xs text-muted-foreground/80">
                  {t.subscription.paymentMethods}
                </p>
              </div>
            </div>
          </Card>

          {/* Step 2: Enter licence key */}
          <Card className="p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground shrink-0">
                2
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-foreground">
                  {t.subscription.activateTitle}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t.subscription.activateDesc}
                </p>

                {success ? (
                  <div className="mt-4 flex items-center gap-3 rounded-xl bg-primary/10 ring-1 ring-primary/20 p-4">
                    <CheckCircle className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium text-foreground">
                        {t.subscription.proActivated}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {t.subscription.refreshing}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="licence-key">{t.subscription.licenceKeyLabel}</Label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Key className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
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
                          {t.subscription.activate}
                        </Button>
                      </div>
                      {error && (
                        <p className="text-sm text-destructive">{error}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Shield className="h-3.5 w-3.5" />
                      {t.subscription.keySingleUse}
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
        <h3 className="text-lg font-semibold text-foreground">
          {t.subscription.whatsIncluded}
        </h3>
        <Separator className="my-4" />
        <ul className="space-y-3">
          {[
            t.subscription.accessAllCourses,
            t.subscription.exclusiveMaterials,
            t.subscription.downloadableResources,
            t.subscription.communityAccess,
            t.subscription.prioritySupport,
            t.subscription.newCoursesLaunch,
          ].map((feature) => (
            <li
              key={feature}
              className="flex items-center gap-2 text-sm text-foreground/80"
            >
              <Check className="h-4 w-4 text-primary" />
              {feature}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

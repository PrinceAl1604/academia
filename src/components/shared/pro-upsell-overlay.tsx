"use client";

import { useState, useEffect } from "react";
import { Crown, Lock, ArrowRight, X } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/i18n/language-context";
import {
  SUBSCRIPTION_PRICE,
  SUBSCRIPTION_CURRENCY_DISPLAY,
  CHARIOW_PRODUCT_URL,
} from "@/lib/licence";

export function ProUpsellOverlay() {
  const [visible, setVisible] = useState(false);
  const { isPro, isAuthenticated } = useAuth();
  const { t } = useLanguage();
  const isEn = t.nav.signIn === "Sign In";

  useEffect(() => {
    // Show once after onboarding, only for free users
    if (!isAuthenticated || isPro) return;
    const dismissed = localStorage.getItem("pro_upsell_dismissed");
    const justOnboarded = localStorage.getItem("just_onboarded");
    if (justOnboarded && !dismissed) {
      // Small delay so the homepage loads first
      const timer = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, isPro]);

  const dismiss = () => {
    setVisible(false);
    localStorage.setItem("pro_upsell_dismissed", "true");
    localStorage.removeItem("just_onboarded");
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={dismiss} />

      {/* Card */}
      <div className="relative w-full max-w-md rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-6 shadow-2xl space-y-6 animate-in fade-in zoom-in-95 duration-300">
        {/* Close */}
        <button
          onClick={dismiss}
          className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 dark:bg-amber-900/30">
            <Crown className="h-6 w-6 text-amber-500" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-neutral-900 dark:text-white">
              Pro membership
            </h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              {isEn ? "Unlock all courses & content" : "Debloquez tous les cours et contenus"}
            </p>
          </div>
        </div>

        {/* Price */}
        <div>
          <span className="text-3xl font-bold text-neutral-900 dark:text-white">
            {SUBSCRIPTION_PRICE.toLocaleString("fr-FR")}
          </span>
          <span className="ml-2 text-sm text-neutral-500 dark:text-neutral-400">
            {SUBSCRIPTION_CURRENCY_DISPLAY} / {isEn ? "month" : "mois"}
          </span>
        </div>

        {/* Features */}
        <div className="space-y-3">
          <div className="flex items-center gap-3 text-sm text-neutral-700 dark:text-neutral-300">
            <Lock className="h-4 w-4 text-neutral-400 shrink-0" />
            {isEn ? "Access all premium courses" : "Acces a tous les cours premium"}
          </div>
          <div className="flex items-center gap-3 text-sm text-neutral-700 dark:text-neutral-300">
            <Lock className="h-4 w-4 text-neutral-400 shrink-0" />
            {isEn ? "Download resources & certificates" : "Telechargez ressources et certificats"}
          </div>
        </div>

        {/* CTA */}
        <a
          href={CHARIOW_PRODUCT_URL}
          target="_blank"
          rel="noopener noreferrer"
          onClick={dismiss}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-neutral-900 dark:bg-white py-3 text-sm font-medium text-white dark:text-neutral-900 transition-opacity hover:opacity-90"
        >
          <Crown className="h-4 w-4" />
          {isEn ? "Get a Licence Key" : "Obtenir une cle de licence"}
          <ArrowRight className="h-4 w-4" />
        </a>

        {/* Skip text */}
        <button
          onClick={dismiss}
          className="w-full text-center text-sm text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
        >
          {isEn ? "Maybe later" : "Plus tard"}
        </button>
      </div>
    </div>
  );
}

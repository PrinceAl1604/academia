"use client";

import { useState, useCallback } from "react";
import { Gift, Zap, Crown, UserPlus, X, Copy, Check, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/i18n/language-context";

interface ReferralModalProps {
  open: boolean;
  onClose: () => void;
}

export function ReferralModal({ open, onClose }: ReferralModalProps) {
  const { referralCode } = useAuth();
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const referralLink =
    typeof window !== "undefined"
      ? `${window.location.origin}/sign-up?ref=${referralCode}`
      : "";

  const copyCode = useCallback(async () => {
    if (!referralCode) return;
    try {
      await navigator.clipboard.writeText(referralCode);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = referralCode;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  }, [referralCode]);

  const copyLink = useCallback(async () => {
    if (!referralLink) return;
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = referralLink;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [referralLink]);

  const handleShare = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: t.referral.title,
          text: t.referral.subtitle,
          url: referralLink,
        });
      } catch {
        // User cancelled or share failed, fall back to copy
        copyLink();
      }
    } else {
      copyLink();
    }
  }, [referralLink, t.referral.title, t.referral.subtitle, copyLink]);

  if (!open) return null;

  const steps = [
    { icon: Zap, color: "bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400", text: t.referral.step1 },
    { icon: Crown, color: "bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400", text: t.referral.step2 },
    { icon: UserPlus, color: "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400", text: t.referral.step3 },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Card */}
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-card border border-border shadow-2xl animate-in fade-in zoom-in-95 duration-300">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Top gradient section */}
        <div className="relative bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/30 px-6 pt-5 pb-6">
          {/* Badge */}
          <span className="inline-flex items-center rounded-full bg-white/80 dark:bg-white/10 px-3 py-1 text-xs font-semibold text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-700/40 backdrop-blur-sm">
            {t.referral.earnBadge}
          </span>

          <div className="mt-3 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-foreground">
                {t.referral.title}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {t.referral.subtitle}
              </p>
            </div>

            {/* Decorative gift icon */}
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-amber-500 shadow-lg shadow-orange-200/50 dark:shadow-orange-900/30">
              <Gift className="h-7 w-7 text-white" />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-5 space-y-5">
          {/* How it works */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 mb-3">
              {t.referral.howItWorks}
            </h3>
            <div className="space-y-3">
              {steps.map((step, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${step.color}`}>
                    <step.icon className="h-4 w-4" />
                  </div>
                  <p className="text-sm text-foreground/80">
                    {step.text}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Your referral code */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 mb-2 block">
              {t.referral.referralCode}
            </label>
            <div className="flex items-center gap-2">
              <div className="flex-1 rounded-lg border border-border bg-muted px-4 py-3 text-center">
                <p className="font-mono text-lg font-bold tracking-[0.25em] text-foreground">
                  {referralCode}
                </p>
              </div>
              <Button
                onClick={copyCode}
                className="shrink-0 gap-1.5"
                size="lg"
              >
                {copiedCode ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                {copiedCode ? t.referral.copied : t.referral.copy}
              </Button>
            </div>
          </div>

          {/* Your invite link */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 mb-2 block">
              {t.referral.yourLink}
            </label>
            <div className="flex items-center gap-2">
              <div className="flex-1 min-w-0 rounded-lg border border-border bg-muted/50 px-3 py-2">
                <p className="truncate font-mono text-xs text-muted-foreground">
                  {referralLink}
                </p>
              </div>
              <Button
                onClick={copyLink}
                variant="outline"
                className="shrink-0 gap-1.5"
                size="lg"
              >
                {copied ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                {copied ? t.referral.copied : t.referral.copyLink}
              </Button>
            </div>
          </div>

          {/* Share button */}
          <Button
            onClick={handleShare}
            variant="outline"
            className="w-full gap-2"
            size="lg"
          >
            <Share2 className="h-4 w-4" />
            {t.referral.share}
          </Button>
        </div>
      </div>
    </div>
  );
}

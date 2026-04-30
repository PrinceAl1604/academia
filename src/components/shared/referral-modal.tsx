"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import { Zap, Crown, UserPlus, X, Copy, Check, Share2 } from "lucide-react";
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
          className="absolute top-4 right-4 z-10 text-muted-foreground/70 hover:text-muted-foreground dark:hover:text-muted-foreground/70 transition-colors"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Cover section — referral illustration takes the hero role.
            Sized to 120px (custom — between the Illustration scale's
            xs/sm steps; using inline Image with object-contain rather
            than introducing a one-off scale value).
            Backdrop fade tinted in pink-500 to color-match the
            illustration's accent — same intensity as the previous
            amber wash (10% → 5% → transparent) so the warmth of the
            cover matches the warmth of the illustration. */}
        <div className="relative bg-gradient-to-b from-pink-500/10 via-pink-500/5 to-transparent px-6 pt-6 pb-2">
          <div className="flex justify-center">
            <div className="relative h-[120px] w-[120px]">
              <Image
                src="/illustrations/referral.svg"
                alt=""
                fill
                className="object-contain opacity-90"
                priority
                sizes="120px"
              />
            </div>
          </div>
        </div>

        {/* Title block — centered for hero treatment, sits beneath the
            cover illustration. Earn-Pro pill recolored to match the
            pink cover. */}
        <div className="px-6 pb-6 text-center space-y-3">
          <span className="inline-flex items-center rounded-full bg-pink-500/15 px-3 py-1 text-xs font-semibold text-pink-500">
            {t.referral.earnBadge}
          </span>
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">
              {t.referral.title}
            </h2>
            <p className="mt-1.5 text-sm text-muted-foreground max-w-sm mx-auto">
              {t.referral.subtitle}
            </p>
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
                  <p className="text-sm text-foreground/90">
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
              <div className="flex-1 rounded-lg border border-input bg-muted px-4 py-3 text-center">
                <p className="font-mono text-lg font-bold tracking-[0.25em] text-foreground">
                  {referralCode}
                </p>
              </div>
              <Button
                onClick={copyCode}
                className="shrink-0 gap-1.5 bg-foreground text-background hover:bg-foreground/90"
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
              <div className="flex-1 min-w-0 rounded-lg border border-input bg-muted/40 px-3 py-2">
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

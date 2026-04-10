"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Gift, Copy, Check, Users, Trophy, Share2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/i18n/language-context";

interface ReferralStats {
  referralCode: string | null;
  totalReferred: number;
  totalRewarded: number;
  totalDaysEarned: number;
}

export function ReferralCard() {
  const { referralCode, isAuthenticated } = useAuth();
  const { t } = useLanguage();
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetch("/api/referral")
      .then((r) => r.json())
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isAuthenticated]);

  const code = stats?.referralCode || referralCode;
  if (!code || loading) return null;

  const referralLink = `${typeof window !== "undefined" ? window.location.origin : ""}/sign-up?ref=${code}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const input = document.createElement("input");
      input.value = referralLink;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const shareLink = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Brightroots",
          text: t.referral.shareText,
          url: referralLink,
        });
      } catch {}
    } else {
      copyLink();
    }
  };

  return (
    <Card className="overflow-hidden">
      {/* Header gradient */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/40">
            <Gift className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h3 className="font-semibold text-neutral-900 dark:text-white">
              {t.referral.title}
            </h3>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              {t.referral.subtitle}
            </p>
          </div>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* Referral link */}
        <div className="flex items-center gap-2">
          <div className="flex-1 truncate rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-3 py-2.5 text-sm font-mono text-neutral-700 dark:text-neutral-300">
            {referralLink}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="shrink-0 gap-1.5"
            onClick={copyLink}
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-green-600" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
            {copied ? t.referral.copied : t.referral.copy}
          </Button>
        </div>

        {/* Share button (mobile-friendly) */}
        <Button
          className="w-full gap-2"
          onClick={shareLink}
        >
          <Share2 className="h-4 w-4" />
          {t.referral.share}
        </Button>

        {/* Stats */}
        {stats && stats.totalReferred > 0 && (
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="rounded-lg bg-neutral-50 dark:bg-neutral-800 p-3 text-center">
              <Users className="mx-auto h-4 w-4 text-neutral-400 mb-1" />
              <p className="text-lg font-bold text-neutral-900 dark:text-white">
                {stats.totalReferred}
              </p>
              <p className="text-xs text-neutral-500">{t.referral.invited}</p>
            </div>
            <div className="rounded-lg bg-neutral-50 dark:bg-neutral-800 p-3 text-center">
              <Trophy className="mx-auto h-4 w-4 text-amber-500 mb-1" />
              <p className="text-lg font-bold text-neutral-900 dark:text-white">
                {stats.totalDaysEarned}
              </p>
              <p className="text-xs text-neutral-500">{t.referral.daysEarned}</p>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

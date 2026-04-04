"use client";

import Link from "next/link";
import { Crown, AlertTriangle, X } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/i18n/language-context";
import { useState } from "react";

/**
 * Shows a banner at the top of the page when:
 * - Pro is expiring in <= 5 days (warning)
 * - Pro has expired (urgent)
 */
export function ExpiryBanner() {
  const { isPro, isExpiringSoon, isExpired, daysUntilExpiry, isAdmin } = useAuth();
  const { t } = useLanguage();
  const [dismissed, setDismissed] = useState(false);
  const isEn = t.nav.signIn === "Sign In";

  // Don't show for admin or if dismissed
  if (isAdmin || dismissed) return null;

  // Expired
  if (isExpired) {
    return (
      <div className="bg-red-600 text-white px-3 sm:px-4 py-2.5 text-center text-sm">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>
              {isEn
                ? "Your Pro plan has expired. Renew to keep access to all courses."
                : "Votre plan Pro a expiré. Renouvelez pour garder l'accès à tous les cours."}
            </span>
          </div>
          <Link
            href="/dashboard/subscription"
            className="rounded-md bg-white px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
          >
            {isEn ? "Renew Now" : "Renouveler"}
          </Link>
        </div>
      </div>
    );
  }

  // Expiring soon
  if (isExpiringSoon && isPro) {
    return (
      <div className="bg-amber-500 text-white px-3 sm:px-4 py-2.5 text-sm">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
          <div className="flex items-center gap-2">
            <Crown className="h-4 w-4 shrink-0" />
            <span>
              {isEn
                ? `Your Pro plan expires in ${daysUntilExpiry} day${daysUntilExpiry !== 1 ? "s" : ""}. Renew to keep access.`
                : `Votre plan Pro expire dans ${daysUntilExpiry} jour${daysUntilExpiry !== 1 ? "s" : ""}. Renouvelez pour garder l'accès.`}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/subscription"
              className="rounded-md bg-white px-3 py-1 text-xs font-semibold text-amber-600 hover:bg-amber-50"
            >
              {isEn ? "Renew" : "Renouveler"}
            </Link>
            <button onClick={() => setDismissed(true)} className="opacity-70 hover:opacity-100">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

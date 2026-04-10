"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CheckCircle, BookOpen, Loader2, Crown } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/i18n/language-context";

export default function PaymentSuccessPage() {
  const { isPro } = useAuth();
  const { t } = useLanguage();
  const [checking, setChecking] = useState(true);

  // Give the webhook a few seconds to process
  useEffect(() => {
    const timer = setTimeout(() => setChecking(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  if (checking) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#faf9f7] px-4">
        <Loader2 className="h-10 w-10 animate-spin text-neutral-400" />
        <p className="mt-4 text-neutral-500">{t.payment.activating}</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#faf9f7] px-4">
      <div className="w-full max-w-md text-center space-y-6">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
          <CheckCircle className="h-10 w-10 text-green-600" />
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-neutral-900">
            {isPro ? t.payment.yourePro : t.payment.successTitle}
          </h1>
          <p className="text-lg text-neutral-500">
            {isPro ? t.payment.proDesc : t.payment.processingDesc}
          </p>
        </div>

        {isPro && (
          <div className="rounded-xl border border-neutral-200 bg-white p-6 text-left space-y-3">
            <div className="flex items-center gap-3">
              <Crown className="h-5 w-5 text-amber-500" />
              <p className="text-sm font-semibold text-neutral-900">{t.payment.proPlanActive}</p>
            </div>
            <ul className="space-y-2 text-sm text-neutral-600">
              {[t.payment.accessAllCourses, t.payment.exclusiveMaterials, t.payment.downloadableResources, t.payment.prioritySupport].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex flex-col gap-3">
          <Button
            className="h-12 w-full gap-2 text-base"
            render={<Link href="/" />}
          >
            <BookOpen className="h-5 w-5" />
            {isPro ? t.payment.startLearning : t.payment.browseCourses}
          </Button>

          {!isPro && (
            <p className="text-xs text-neutral-400">
              {t.payment.manualActivation}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CheckCircle, BookOpen, Loader2, Crown } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/i18n/language-context";
import { Illustration } from "@/components/shared/illustration";

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
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
        <Loader2 className="h-10 w-10 animate-spin text-muted-foreground/70" />
        <p className="mt-4 text-muted-foreground">{t.payment.activating}</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-md text-center space-y-6">
        <div className="flex justify-center">
          <Illustration name="payment-success" alt="" size="lg" priority />
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-medium tracking-tight text-foreground">
            {isPro ? t.payment.yourePro : t.payment.successTitle}
          </h1>
          <p className="text-lg text-muted-foreground">
            {isPro ? t.payment.proDesc : t.payment.processingDesc}
          </p>
        </div>

        {isPro && (
          <div className="rounded-xl border border-input bg-card p-6 text-left space-y-3">
            <div className="flex items-center gap-3">
              <Crown className="h-5 w-5 text-amber-500" />
              <p className="text-sm font-semibold text-foreground">{t.payment.proPlanActive}</p>
            </div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {[t.payment.accessAllCourses, t.payment.exclusiveMaterials, t.payment.downloadableResources, t.payment.prioritySupport].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-primary shrink-0" />
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
            <p className="text-xs text-muted-foreground/70">
              {t.payment.manualActivation}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Check, Key } from "lucide-react";
import { useLanguage } from "@/lib/i18n/language-context";

export default function SubscriptionPage() {
  const { t } = useLanguage();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">{t.subscription.title}</h1>
        <p className="mt-1 text-neutral-500">
          {t.subscription.subtitle}
        </p>
      </div>

      {/* Current plan */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-neutral-900">
                {t.subscription.proPlan}
              </h3>
              <Badge className="bg-green-100 text-green-700">{t.subscription.active}</Badge>
            </div>
            <p className="mt-1 text-sm text-neutral-500">
              {t.subscription.fullAccess}
            </p>
          </div>
        </div>

        <Separator className="my-4" />

        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-neutral-500">{t.subscription.licenceKey}</span>
            <div className="flex items-center gap-2">
              <Key className="h-4 w-4 text-neutral-400" />
              <code className="rounded bg-neutral-100 px-2 py-0.5 text-xs font-mono">
                ACAD-XXXX-XXXX-XXXX
              </code>
            </div>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-neutral-500">{t.subscription.status}</span>
            <span className="font-medium text-green-600">{t.subscription.active}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-neutral-500">{t.subscription.activatedOn}</span>
            <span className="text-neutral-700">December 1, 2025</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-neutral-500">{t.subscription.expires}</span>
            <span className="text-neutral-700">December 1, 2026</span>
          </div>
        </div>
      </Card>

      {/* Features included */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-neutral-900">
          {t.subscription.whatsIncluded}
        </h3>
        <Separator className="my-4" />
        <ul className="space-y-3">
          {[
            "Access to all 120+ courses",
            "Certificate of completion",
            "Downloadable resources",
            "Community access",
            "Priority support",
            "New courses as they launch",
          ].map((feature) => (
            <li key={feature} className="flex items-center gap-2 text-sm text-neutral-700">
              <Check className="h-4 w-4 text-green-600" />
              {feature}
            </li>
          ))}
        </ul>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold text-neutral-900">
          {t.subscription.needNewLicence}
        </h3>
        <p className="mt-1 text-sm text-neutral-500">
          {t.subscription.needNewLicenceDesc}
        </p>
        <Button variant="outline" className="mt-4">
          {t.subscription.contactSupport}
        </Button>
      </Card>
    </div>
  );
}

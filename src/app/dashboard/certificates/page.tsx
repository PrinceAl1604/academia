"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Award, Download, ExternalLink } from "lucide-react";
import { useLanguage } from "@/lib/i18n/language-context";

export default function CertificatesPage() {
  const { t } = useLanguage();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">{t.certificatesPage.title}</h1>
        <p className="mt-1 text-neutral-500">
          {t.certificatesPage.subtitle}
        </p>
      </div>

      {/* Earned certificates */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl bg-amber-50">
              <Award className="h-7 w-7 text-amber-600" />
            </div>
            <div className="flex-1">
              <Badge className="mb-2 bg-green-100 text-green-700">
                {t.certificatesPage.earned}
              </Badge>
              <h3 className="font-semibold text-neutral-900">
                UI/UX Design Fundamentals
              </h3>
              <p className="mt-1 text-sm text-neutral-500">
                {t.certificatesPage.completedOn} March 10, 2026
              </p>
              <div className="mt-4 flex gap-2">
                <Button size="sm" variant="outline" className="gap-1.5">
                  <Download className="h-3.5 w-3.5" />
                  {t.certificatesPage.download}
                </Button>
                <Button size="sm" variant="ghost" className="gap-1.5">
                  <ExternalLink className="h-3.5 w-3.5" />
                  {t.certificatesPage.share}
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* In progress */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-neutral-900">
          {t.certificatesPage.inProgressTitle}
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          {["Advanced React & Next.js", "Data Science with Python"].map(
            (title) => (
              <Card key={title} className="p-6 opacity-60">
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl bg-neutral-100">
                    <Award className="h-7 w-7 text-neutral-400" />
                  </div>
                  <div>
                    <Badge variant="secondary" className="mb-2">
                      {t.certificatesPage.inProgressTitle}
                    </Badge>
                    <h3 className="font-semibold text-neutral-900">{title}</h3>
                    <p className="mt-1 text-sm text-neutral-500">
                      {t.certificatesPage.completeToEarn}
                    </p>
                  </div>
                </div>
              </Card>
            )
          )}
        </div>
      </div>
    </div>
  );
}

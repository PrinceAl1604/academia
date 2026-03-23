"use client";

import { Card } from "@/components/ui/card";
import { Trophy } from "lucide-react";
import { useLanguage } from "@/lib/i18n/language-context";

export default function CertificatesPage() {
  const { t } = useLanguage();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">{t.certificatesPage.title}</h1>
        <p className="mt-1 text-neutral-500">{t.certificatesPage.subtitle}</p>
      </div>

      <Card className="p-8 text-center">
        <Trophy className="mx-auto h-10 w-10 text-neutral-300" />
        <p className="mt-3 text-neutral-500">
          {t.nav.signIn === "Sign In"
            ? "Complete a course to earn your first certificate. Certificates will appear here."
            : "Terminez un cours pour obtenir votre premier certificat. Les certificats apparaîtront ici."}
        </p>
      </Card>
    </div>
  );
}

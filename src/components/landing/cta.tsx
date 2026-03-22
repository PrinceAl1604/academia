"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useLanguage } from "@/lib/i18n/language-context";

export function CTASection() {
  const { t } = useLanguage();

  return (
    <section className="bg-neutral-900 py-20">
      <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
          {t.cta.title}
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-lg text-neutral-400">
          {t.cta.subtitle}
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Button
            size="lg"
            variant="secondary"
            className="h-12 gap-2 px-8 text-base"
            render={<Link href="/sign-up" />}
          >
            {t.cta.getStarted}
            <ArrowRight className="h-4 w-4" />
          </Button>
          <Button
            size="lg"
            variant="ghost"
            className="h-12 px-8 text-base text-neutral-300 hover:bg-neutral-800 hover:text-white"
            render={<Link href="/pricing" />}
          >
            {t.cta.viewPricing}
          </Button>
        </div>
      </div>
    </section>
  );
}

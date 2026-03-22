"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Play, Sparkles } from "lucide-react";
import { useLanguage } from "@/lib/i18n/language-context";

export function HeroSection() {
  const { t } = useLanguage();

  return (
    <section className="relative overflow-hidden bg-white">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:20px_20px] opacity-50" />

      <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8 lg:py-36">
        <div className="mx-auto max-w-3xl text-center">
          {/* Badge */}
          <Badge
            variant="secondary"
            className="mb-6 gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium"
          >
            <Sparkles className="h-3.5 w-3.5" />
            {t.hero.badge}
          </Badge>

          {/* Heading */}
          <h1 className="text-4xl font-bold tracking-tight text-neutral-900 sm:text-5xl lg:text-6xl">
            {t.hero.title}{" "}
            <span className="text-neutral-400">{t.hero.titleHighlight}</span>
          </h1>

          {/* Subtitle */}
          <p className="mt-6 text-lg leading-relaxed text-neutral-600 sm:text-xl">
            {t.hero.subtitle}
          </p>

          {/* CTAs */}
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button size="lg" className="h-12 gap-2 px-8 text-base" render={<Link href="/sign-up" />}>
              {t.hero.cta}
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="h-12 gap-2 px-8 text-base"
              render={<Link href="/courses" />}
            >
              <Play className="h-4 w-4" />
              {t.hero.browseCourses}
            </Button>
          </div>

          {/* Social proof */}
          <div className="mt-12 flex items-center justify-center gap-8 text-sm text-neutral-500">
            <div className="flex -space-x-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-neutral-200 text-xs font-medium text-neutral-600"
                >
                  {String.fromCharCode(64 + i)}
                </div>
              ))}
            </div>
            <span>
              {t.hero.join} <strong className="text-neutral-900">50,000+</strong>{" "}
              {t.hero.socialProof}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

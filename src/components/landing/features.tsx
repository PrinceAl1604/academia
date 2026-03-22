"use client";

import {
  Award,
  BookOpen,
  Clock,
  Laptop,
  MessageSquare,
  Shield,
} from "lucide-react";
import { useLanguage } from "@/lib/i18n/language-context";

export function FeaturesSection() {
  const { t } = useLanguage();

  const features = [
    {
      icon: BookOpen,
      title: t.features.expertLed,
      description: t.features.expertLedDesc,
    },
    {
      icon: Laptop,
      title: t.features.learnPace,
      description: t.features.learnPaceDesc,
    },
    {
      icon: Award,
      title: t.features.certificates,
      description: t.features.certificatesDesc,
    },
    {
      icon: MessageSquare,
      title: t.features.community,
      description: t.features.communityDesc,
    },
    {
      icon: Clock,
      title: t.features.biteSized,
      description: t.features.biteSizedDesc,
    },
    {
      icon: Shield,
      title: t.features.quality,
      description: t.features.qualityDesc,
    },
  ];

  return (
    <section className="bg-neutral-50 py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-neutral-900">
            {t.features.title}
          </h2>
          <p className="mt-3 text-lg text-neutral-500">
            {t.features.subtitle}
          </p>
        </div>

        <div className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div key={feature.title} className="rounded-xl bg-white p-6 shadow-sm">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-neutral-100">
                <feature.icon className="h-5 w-5 text-neutral-700" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-neutral-900">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-neutral-500">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

"use client";

import { BookOpen, GraduationCap, Star, Users } from "lucide-react";
import { useLanguage } from "@/lib/i18n/language-context";

export function StatsSection() {
  const { t } = useLanguage();

  const stats = [
    { label: t.stats.activeStudents, value: "50,000+", icon: Users },
    { label: t.stats.expertCourses, value: "120+", icon: BookOpen },
    { label: t.stats.averageRating, value: "4.8/5", icon: Star },
    { label: t.stats.certificatesIssued, value: "25,000+", icon: GraduationCap },
  ];

  return (
    <section className="border-y bg-neutral-50">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-sm">
                <stat.icon className="h-5 w-5 text-neutral-700" />
              </div>
              <p className="text-2xl font-bold text-neutral-900 sm:text-3xl">
                {stat.value}
              </p>
              <p className="mt-1 text-sm text-neutral-500">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

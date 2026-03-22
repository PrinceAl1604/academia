"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CourseCard } from "@/components/shared/course-card";
import { ArrowRight } from "lucide-react";
import { courses } from "@/data/mock";
import { useLanguage } from "@/lib/i18n/language-context";

export function CoursesPreview() {
  const { t } = useLanguage();
  const featuredCourses = courses.filter((c) => c.isFeatured).slice(0, 3);

  return (
    <section className="bg-white py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-neutral-900">
              {t.featured.title}
            </h2>
            <p className="mt-2 text-lg text-neutral-500">
              {t.featured.subtitle}
            </p>
          </div>
          <Button variant="ghost" className="hidden gap-2 md:flex" render={<Link href="/courses" />}>
            {t.featured.viewAll}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {featuredCourses.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>

        <div className="mt-8 text-center md:hidden">
          <Button variant="outline" className="gap-2" render={<Link href="/courses" />}>
            {t.featured.viewAll}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </section>
  );
}

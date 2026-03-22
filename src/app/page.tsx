"use client";

import { useState, useMemo } from "react";
import { DashboardSidebar } from "@/components/layout/dashboard-sidebar";
import { DashboardTopbar } from "@/components/layout/dashboard-topbar";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/i18n/language-context";
import { LicenceModal } from "@/components/shared/licence-modal";
import { CourseCarousel } from "@/components/shared/course-carousel";
import { courses, categories } from "@/data/mock";

export default function HomePage() {
  const { isActivated } = useAuth();
  const { t } = useLanguage();
  const [selectedCategory, setSelectedCategory] = useState("All");

  const filteredCourses = useMemo(() => {
    if (selectedCategory === "All") return courses;
    return courses.filter((c) => c.category === selectedCategory);
  }, [selectedCategory]);

  const coursesByCategory = useMemo(() => {
    const grouped: Record<string, typeof courses> = {};
    for (const cat of categories) {
      const catCourses = filteredCourses.filter((c) => c.category === cat);
      if (catCourses.length > 0) {
        grouped[cat] = catCourses;
      }
    }
    return grouped;
  }, [filteredCourses]);

  const isLocked = (course: (typeof courses)[0]) =>
    !isActivated && !course.isFree;

  // Determine level label for a category group
  const getCategoryLevel = (categoryCourses: typeof courses) => {
    const levels = [...new Set(categoryCourses.map((c) => c.level))];
    return levels.length === 1 ? levels[0] : "Mixed";
  };

  return (
    <div className="min-h-screen bg-neutral-50/50">
      <DashboardSidebar />
      <div className="lg:pl-64">
        <DashboardTopbar />
        <main className="px-4 py-6 lg:px-8 lg:py-8">
          {/* Page header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-neutral-900">
              {t.nav.courses}
            </h1>
          </div>

          {/* Category filter pills */}
          <div className="mb-8 flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategory("All")}
              className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                selectedCategory === "All"
                  ? "border-neutral-900 bg-neutral-900 text-white"
                  : "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300 hover:bg-neutral-50"
              }`}
            >
              {t.catalog.all}
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                  selectedCategory === cat
                    ? "border-neutral-900 bg-neutral-900 text-white"
                    : "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300 hover:bg-neutral-50"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Course carousels by category */}
          {Object.entries(coursesByCategory).map(
            ([category, categoryCourses]) => (
              <CourseCarousel
                key={category}
                title={category}
                subtitle={`${categoryCourses.length} ${
                  categoryCourses.length === 1
                    ? t.catalog.course
                    : t.catalog.courses
                } · ${getCategoryLevel(categoryCourses)}`}
                courses={categoryCourses}
                locked={isLocked}
              />
            )
          )}

          {filteredCourses.length === 0 && (
            <div className="py-20 text-center">
              <p className="text-neutral-500">{t.catalog.noCourses}</p>
            </div>
          )}
        </main>
      </div>
      <LicenceModal />
    </div>
  );
}

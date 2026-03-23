"use client";

import { useState, useMemo, useEffect } from "react";
import { DashboardSidebar } from "@/components/layout/dashboard-sidebar";
import { DashboardTopbar } from "@/components/layout/dashboard-topbar";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/i18n/language-context";
import { CourseCarousel } from "@/components/shared/course-carousel";
import { getCourses, getCategories, type CourseRow, type CategoryRow } from "@/lib/api";
import { Loader2 } from "lucide-react";

export default function HomePage() {
  const { isPro } = useAuth();
  const { t } = useLanguage();
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch courses and categories from Supabase
  useEffect(() => {
    async function load() {
      const [coursesData, categoriesData] = await Promise.all([
        getCourses(),
        getCategories(),
      ]);
      setCourses(coursesData);
      setCategories(categoriesData);
      setLoading(false);
    }
    load();
  }, []);

  const categoryNames = useMemo(
    () => categories.map((c) => c.name),
    [categories]
  );

  const filteredCourses = useMemo(() => {
    if (selectedCategory === "All") return courses;
    return courses.filter((c) => c.category?.name === selectedCategory);
  }, [selectedCategory, courses]);

  const coursesByCategory = useMemo(() => {
    const grouped: Record<string, CourseRow[]> = {};
    for (const cat of categoryNames) {
      const catCourses = filteredCourses.filter(
        (c) => c.category?.name === cat
      );
      if (catCourses.length > 0) {
        grouped[cat] = catCourses;
      }
    }
    // Include uncategorized courses
    const uncategorized = filteredCourses.filter((c) => !c.category?.name);
    if (uncategorized.length > 0) {
      const label = t.nav.signIn === "Sign In" ? "Other" : "Autres";
      grouped[label] = uncategorized;
    }
    return grouped;
  }, [filteredCourses, categoryNames, t]);

  const isLocked = (course: CourseRow) => !isPro && !course.is_free;

  const getCategoryLevel = (categoryCourses: CourseRow[]) => {
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
            {categoryNames.map((cat) => (
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

          {/* Loading state */}
          {loading && (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
            </div>
          )}

          {/* Course carousels by category */}
          {!loading &&
            Object.entries(coursesByCategory).map(
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

          {!loading && filteredCourses.length === 0 && (
            <div className="py-20 text-center">
              <p className="text-neutral-500">{t.catalog.noCourses}</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

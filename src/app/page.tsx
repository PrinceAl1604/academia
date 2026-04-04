"use client";

import { useState, useMemo, useEffect } from "react";
import { DashboardSidebar } from "@/components/layout/dashboard-sidebar";
import { DashboardTopbar } from "@/components/layout/dashboard-topbar";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/i18n/language-context";
import { CourseCarousel } from "@/components/shared/course-carousel";
import { getCourses, getCategories, type CourseRow, type CategoryRow } from "@/lib/api";
import { Loader2, Search, X } from "lucide-react";

export default function HomePage() {
  const { isPro } = useAuth();
  const { t } = useLanguage();
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const isEn = t.nav.signIn === "Sign In";

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
    let result = courses;

    // Filter by category
    if (selectedCategory !== "All") {
      result = result.filter((c) => c.category?.name === selectedCategory);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          c.description?.toLowerCase().includes(q) ||
          c.category?.name.toLowerCase().includes(q)
      );
    }

    return result;
  }, [selectedCategory, searchQuery, courses]);

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
    <div className="min-h-screen bg-neutral-50/50 dark:bg-neutral-950">
      <DashboardSidebar />
      <div className="lg:pl-64">
        <DashboardTopbar />
        <main className="px-4 py-6 lg:px-8 lg:py-8">
          {/* Page header + Search */}
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h1 className="text-3xl font-bold text-neutral-900 dark:text-white">
              {t.nav.courses}
            </h1>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isEn ? "Search courses..." : "Rechercher des cours..."}
                className="h-9 w-full rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 pl-9 pr-8 text-sm text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500 outline-none focus:border-neutral-400 dark:focus:border-neutral-600 transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Category filter pills */}
          <div className="mb-8 flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategory("All")}
              className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                selectedCategory === "All"
                  ? "border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900"
                  : "border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 hover:border-neutral-300 dark:hover:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800"
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
                    ? "border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900"
                    : "border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 hover:border-neutral-300 dark:hover:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800"
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
              <p className="text-neutral-500 dark:text-neutral-400">
                {searchQuery
                  ? (isEn
                    ? `No courses found for "${searchQuery}"`
                    : `Aucun cours trouvé pour "${searchQuery}"`)
                  : t.catalog.noCourses}
              </p>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="mt-3 text-sm text-neutral-500 underline hover:text-neutral-700 dark:hover:text-neutral-300"
                >
                  {isEn ? "Clear search" : "Effacer la recherche"}
                </button>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

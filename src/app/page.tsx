"use client";

import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { SidebarLayout } from "@/components/layout/sidebar-layout";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/i18n/language-context";
import { CourseCarousel } from "@/components/shared/course-carousel";
import { getCourses, getCategories, type CourseRow, type CategoryRow } from "@/lib/api";
import { Loader2 } from "lucide-react";

export default function HomePage() {
  const { isPro } = useAuth();
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const isEn = t.nav.signIn === "Sign In";

  // Sync search query from URL params (e.g. from topbar search)
  useEffect(() => {
    const q = searchParams.get("q");
    if (q) setSearchQuery(q);
  }, [searchParams]);

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
    <SidebarLayout>
        <main className="px-4 py-6 lg:px-8 lg:py-8">
          {/* Page header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-neutral-900 dark:text-white">
              {t.nav.courses}
            </h1>
          </div>

          {/* Category filter pills */}
          <div className="mb-8 flex flex-wrap gap-2" role="group" aria-label={isEn ? "Filter by category" : "Filtrer par catégorie"}>
            <button
              onClick={() => setSelectedCategory("All")}
              aria-pressed={selectedCategory === "All"}
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
                aria-pressed={selectedCategory === cat}
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
    </SidebarLayout>
  );
}

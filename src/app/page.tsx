"use client";

import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { SidebarLayout } from "@/components/layout/sidebar-layout";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/i18n/language-context";
import { CourseCarousel } from "@/components/shared/course-carousel";
import { getCourses, getCategories, type CourseRow, type CategoryRow } from "@/lib/api";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Illustration } from "@/components/shared/illustration";

/**
 * Home / browse — Cook-OS-flavored refresh.
 *
 * Hero block carries a mono-uppercase preheader + a tight
 * `text-3xl sm:text-4xl` headline (was just text-3xl bold). Category
 * filter pills migrated from custom-rolled buttons with hardcoded
 * `border-neutral-900 bg-neutral-900` to a uniform pill style using
 * semantic tokens — active pill fills with `bg-primary`, inactive
 * uses `bg-card` with subtle border.
 *
 * Empty-state copy gets a calmer treatment (less center-stage, more
 * "no results yet" tone).
 */
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

  useEffect(() => {
    const q = searchParams.get("q");
    if (q) setSearchQuery(q);
  }, [searchParams]);

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

    if (selectedCategory !== "All") {
      result = result.filter((c) => c.category?.name === selectedCategory);
    }

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

  const allCategories = ["All", ...categoryNames];

  return (
    <SidebarLayout>
      <main className="px-4 py-8 lg:px-8 lg:py-12 max-w-6xl mx-auto">
        {/* ── Hero ──────────────────────────────────────────── */}
        <header className="mb-8 space-y-2">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            / Catalog
          </p>
          <h1 className="text-3xl sm:text-4xl font-medium tracking-tight text-foreground">
            {t.nav.courses}
          </h1>
        </header>

        {/* ── Category filter pills ─────────────────────────── */}
        <div
          className="mb-10 flex flex-wrap gap-1.5"
          role="group"
          aria-label={isEn ? "Filter by category" : "Filtrer par catégorie"}
        >
          {allCategories.map((cat) => {
            const isActive = selectedCategory === cat;
            const label = cat === "All" ? t.catalog.all : cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                aria-pressed={isActive}
                className={cn(
                  "rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors border",
                  isActive
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground hover:border-border/80 hover:bg-muted hover:text-foreground"
                )}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* ── Loading state ─────────────────────────────────── */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* ── Course carousels ──────────────────────────────── */}
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

        {/* ── Empty state ───────────────────────────────────── */}
        {!loading && filteredCourses.length === 0 && (
          <div className="py-20 text-center space-y-4">
            <div className="flex justify-center">
              <Illustration name="no-results" alt="" size="md" />
            </div>
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              / No results
            </p>
            <p className="text-foreground text-base max-w-md mx-auto">
              {searchQuery
                ? (isEn
                  ? `Nothing matches "${searchQuery}".`
                  : `Aucun cours pour "${searchQuery}".`)
                : t.catalog.noCourses}
            </p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground transition-colors"
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

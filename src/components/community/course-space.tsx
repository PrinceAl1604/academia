"use client";

import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/i18n/language-context";
import { CourseCarousel } from "@/components/shared/course-carousel";
import { getCourses, getCategories, type CourseRow, type CategoryRow } from "@/lib/api";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Illustration } from "@/components/shared/illustration";

/**
 * Course space — the catalog (moved here from the old Home). Category pills +
 * per-category carousels + search (?q=). Pro lock on non-free courses for
 * non-Pro members (existing behavior). Phase 1b will let a course space scope
 * to a specific category via its config.
 */
export function CourseSpace({ name, emoji }: { name: string; emoji: string | null }) {
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
      const [coursesData, categoriesData] = await Promise.all([getCourses(), getCategories()]);
      setCourses(coursesData);
      setCategories(categoriesData);
      setLoading(false);
    }
    load();
  }, []);

  const categoryNames = useMemo(() => categories.map((c) => c.name), [categories]);

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
      const catCourses = filteredCourses.filter((c) => c.category?.name === cat);
      if (catCourses.length > 0) grouped[cat] = catCourses;
    }
    const uncategorized = filteredCourses.filter((c) => !c.category?.name);
    if (uncategorized.length > 0) {
      grouped[isEn ? "Other" : "Autres"] = uncategorized;
    }
    return grouped;
  }, [filteredCourses, categoryNames, isEn]);

  const isLocked = (course: CourseRow) => !isPro && !course.is_free;
  const getCategoryLevel = (categoryCourses: CourseRow[]) => {
    const levels = [...new Set(categoryCourses.map((c) => c.level))];
    return levels.length === 1 ? levels[0] : "Mixed";
  };
  const allCategories = ["All", ...categoryNames];

  return (
    <main className="px-4 py-8 lg:px-8 lg:py-12 max-w-6xl mx-auto">
      <header className="mb-8 flex items-center gap-3">
        <span className="text-3xl leading-none">{emoji ?? "📚"}</span>
        <h1 className="text-2xl sm:text-3xl font-medium tracking-tight text-foreground">{name}</h1>
      </header>

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

      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {!loading &&
        Object.entries(coursesByCategory).map(([category, categoryCourses]) => (
          <CourseCarousel
            key={category}
            title={category}
            subtitle={`${categoryCourses.length} ${
              categoryCourses.length === 1 ? t.catalog.course : t.catalog.courses
            } · ${getCategoryLevel(categoryCourses)}`}
            courses={categoryCourses}
            locked={isLocked}
          />
        ))}

      {!loading && filteredCourses.length === 0 && (
        <div className="py-20 text-center space-y-4">
          <div className="flex justify-center">
            <Illustration name="no-results" alt="" size="md" />
          </div>
          <p className="text-foreground text-base max-w-md mx-auto">
            {searchQuery
              ? isEn
                ? `Nothing matches "${searchQuery}".`
                : `Aucun cours pour "${searchQuery}".`
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
  );
}

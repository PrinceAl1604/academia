"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Loader2,
  Search,
  Sparkles,
  Compass,
  Crown,
  ArrowRight,
  Flame,
} from "lucide-react";
import { SidebarLayout } from "@/components/layout/sidebar-layout";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/i18n/language-context";
import { useProgress } from "@/lib/progress-context";
import { CourseCarousel } from "@/components/shared/course-carousel";
import { CourseCard } from "@/components/shared/course-card";
import {
  getCourses,
  getCategories,
  type CourseRow,
  type CategoryRow,
} from "@/lib/api";

export default function HomePage() {
  const { isPro, userName, isAuthenticated } = useAuth();
  const { t } = useLanguage();
  const { progress } = useProgress();
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
      const label = isEn ? "Other" : "Autres";
      grouped[label] = uncategorized;
    }
    return grouped;
  }, [filteredCourses, categoryNames, isEn]);

  const isLocked = (course: CourseRow) => !isPro && !course.is_free;

  const getCategoryLevel = (categoryCourses: CourseRow[]) => {
    const levels = [...new Set(categoryCourses.map((c) => c.level))];
    return levels.length === 1 ? levels[0] : "Mixed";
  };

  // ─── Derived: continue-learning courses (in-progress only) ───
  const inProgressCourses = useMemo(() => {
    return courses
      .filter((c) => {
        const p = progress[c.id] ?? 0;
        return p > 0 && p < 100;
      })
      .sort((a, b) => (progress[b.id] ?? 0) - (progress[a.id] ?? 0))
      .slice(0, 6);
  }, [courses, progress]);

  // ─── Derived: featured spotlight ───
  const featuredCourse = useMemo(
    () => courses.find((c) => c.is_featured) ?? null,
    [courses]
  );

  // ─── Hero greeting (personalized) ───
  const firstName = (userName || (isEn ? "there" : "vous")).split(" ")[0];
  const hour = new Date().getHours();
  const greet = isEn
    ? hour < 12
      ? "Good morning"
      : hour < 18
        ? "Good afternoon"
        : "Good evening"
    : hour < 12
      ? "Bonjour"
      : hour < 18
        ? "Bon après-midi"
        : "Bonsoir";

  const lockedCount = useMemo(
    () => (isPro ? 0 : courses.filter((c) => !c.is_free).length),
    [courses, isPro]
  );

  // Three hero states: (a) in-progress, (b) fresh Pro, (c) fresh Free
  const heroState: "continue" | "fresh-pro" | "fresh-free" =
    inProgressCourses.length > 0
      ? "continue"
      : isPro
        ? "fresh-pro"
        : "fresh-free";

  const heroSubtitle =
    heroState === "continue"
      ? isEn
        ? `You have ${inProgressCourses.length} course${inProgressCourses.length === 1 ? "" : "s"} in progress — pick up where you left off.`
        : `Vous avez ${inProgressCourses.length} cours en cours — reprenez là où vous vous êtes arrêté.`
      : heroState === "fresh-pro"
        ? isEn
          ? `Your Pro membership unlocks everything. What will you explore today?`
          : `Votre abonnement Pro débloque tout. Qu'allez-vous explorer aujourd'hui ?`
        : isEn
          ? `${lockedCount} premium course${lockedCount === 1 ? "" : "s"} are waiting for you. Or start with a free one below.`
          : `${lockedCount} cours premium vous attendent. Ou commencez gratuitement ci-dessous.`;

  return (
    <SidebarLayout>
      <main className="px-4 py-6 lg:px-8 lg:py-8">
        {/* ─── Hero welcome card ─────────────────────────────── */}
        <section
          className="relative mb-8 overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-6 sm:p-8 ring-1 ring-primary/15"
          aria-label={isEn ? "Welcome" : "Bienvenue"}
        >
          {/* Decorative orbs */}
          <div
            className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-primary/10 blur-3xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-20 right-1/3 h-40 w-40 rounded-full bg-chart-2/15 blur-3xl"
            aria-hidden
          />

          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                <Sparkles className="h-3 w-3" />
                {heroState === "continue"
                  ? t.dashboard.continueLearning
                  : heroState === "fresh-pro"
                    ? t.subscription.proPlan || "Pro"
                    : t.catalog.explore}
              </span>
              <h1 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                {isAuthenticated ? `${greet}, ${firstName}` : t.nav.courses}
              </h1>
              <p className="mt-2 text-sm text-muted-foreground sm:text-base">
                {isAuthenticated ? heroSubtitle : t.dashboard.continueSubtitle}
              </p>
            </div>

            {/* Hero CTA */}
            {heroState === "fresh-free" && isAuthenticated && (
              <Link
                href="/dashboard/subscription"
                className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-opacity hover:bg-primary/90"
              >
                <Crown className="h-4 w-4" />
                {t.pro.getKey}
                <ArrowRight className="h-4 w-4" />
              </Link>
            )}
            {heroState === "continue" && inProgressCourses[0] && (
              <Link
                href={`/courses/${inProgressCourses[0].slug}/learn`}
                className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-opacity hover:bg-primary/90"
              >
                <Flame className="h-4 w-4" />
                {t.dashboard.continue}
                <ArrowRight className="h-4 w-4" />
              </Link>
            )}
            {heroState === "fresh-pro" && (
              <Link
                href="/dashboard/courses"
                className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-muted"
              >
                <Compass className="h-4 w-4" />
                {t.myCourses.title}
                <ArrowRight className="h-4 w-4" />
              </Link>
            )}
          </div>

          {/* Quick search inside hero */}
          <div className="relative mt-6 max-w-xl">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder={t.catalog.searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-11 w-full rounded-xl border border-border bg-card/90 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground shadow-sm backdrop-blur-sm outline-none transition-colors focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
              aria-label={t.catalog.searchPlaceholder}
            />
          </div>
        </section>

        {/* ─── Continue Learning strip ───────────────────────── */}
        {!loading && inProgressCourses.length > 0 && !searchQuery && (
          <section className="mb-10" aria-label={t.dashboard.continueLearning}>
            <div className="mb-4 flex items-end justify-between">
              <div>
                <h2 className="text-xl font-bold text-foreground">
                  {t.dashboard.continueLearning}
                </h2>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {isEn
                    ? `${inProgressCourses.length} in progress`
                    : `${inProgressCourses.length} en cours`}
                </p>
              </div>
              <Link
                href="/dashboard/courses"
                className="text-sm font-medium text-primary hover:underline"
              >
                {t.dashboard.viewAll}
              </Link>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide sm:gap-4"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              {inProgressCourses.map((course, idx) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  index={idx}
                  locked={false}
                />
              ))}
            </div>
          </section>
        )}

        {/* ─── Featured spotlight (fresh users, no search) ───── */}
        {!loading &&
          featuredCourse &&
          inProgressCourses.length === 0 &&
          !searchQuery && (
            <FeaturedSpotlight
              course={featuredCourse}
              locked={isLocked(featuredCourse)}
              isEn={isEn}
            />
          )}

        {/* ─── Category filter pills ─────────────────────────── */}
        <div
          className="mb-8 flex flex-wrap gap-2"
          role="group"
          aria-label={isEn ? "Filter by category" : "Filtrer par catégorie"}
        >
          <CategoryPill
            active={selectedCategory === "All"}
            onClick={() => setSelectedCategory("All")}
            count={courses.length}
          >
            {t.catalog.all}
          </CategoryPill>
          {categoryNames.map((cat) => {
            const count = courses.filter((c) => c.category?.name === cat).length;
            return (
              <CategoryPill
                key={cat}
                active={selectedCategory === cat}
                onClick={() => setSelectedCategory(cat)}
                count={count}
              >
                {cat}
              </CategoryPill>
            );
          })}
        </div>

        {/* Loading state */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
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
          <div className="rounded-2xl border border-dashed border-border bg-card py-20 text-center">
            <Compass className="mx-auto h-10 w-10 text-muted-foreground/60" />
            <p className="mt-4 text-foreground font-medium">
              {searchQuery
                ? isEn
                  ? `No courses found for "${searchQuery}"`
                  : `Aucun cours trouvé pour "${searchQuery}"`
                : t.catalog.noCourses}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {t.catalog.noCoursesHint}
            </p>
            {(searchQuery || selectedCategory !== "All") && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("All");
                }}
                className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                {t.catalog.clearFilters}
              </button>
            )}
          </div>
        )}
      </main>
    </SidebarLayout>
  );
}

/* ─── Category pill ─────────────────────────────────────────── */
function CategoryPill({
  children,
  active,
  onClick,
  count,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
  count?: number;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
        active
          ? "border-primary bg-primary text-primary-foreground shadow-sm"
          : "border-border bg-card text-muted-foreground hover:border-primary/30 hover:bg-muted hover:text-foreground"
      }`}
    >
      {children}
      {count !== undefined && (
        <span
          className={`tabular-nums text-[11px] font-semibold ${
            active ? "text-primary-foreground/80" : "text-muted-foreground/70"
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
}

/* ─── Featured spotlight ────────────────────────────────────── */
function FeaturedSpotlight({
  course,
  locked,
  isEn,
}: {
  course: CourseRow;
  locked: boolean;
  isEn: boolean;
}) {
  const tag = course.category?.name ?? (isEn ? "Featured" : "À la une");
  return (
    <section
      className="mb-10 overflow-hidden rounded-2xl border border-border bg-card"
      aria-label={isEn ? "Featured course" : "Cours à la une"}
    >
      <div className="grid gap-0 md:grid-cols-[1.25fr_1fr]">
        <div className="flex flex-col justify-center p-6 sm:p-8">
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-chart-2/30 bg-chart-2/10 px-2.5 py-1 text-xs font-medium text-chart-2">
            <Sparkles className="h-3 w-3" />
            {isEn ? "Featured" : "À la une"}
          </span>
          <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
            {tag} · {course.level}
          </p>
          <h2 className="mt-2 text-2xl font-bold text-foreground sm:text-3xl">
            {course.title}
          </h2>
          {course.description && (
            <p className="mt-2 line-clamp-2 text-sm text-muted-foreground sm:text-base">
              {course.description}
            </p>
          )}
          <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
            <span className="tabular-nums">
              {course.total_lessons}{" "}
              {isEn ? "lessons" : "leçons"}
            </span>
            <span className="h-3 w-px bg-border" aria-hidden />
            <span className="tabular-nums">
              {course.duration_hours}h
            </span>
            {course.students_count > 0 && (
              <>
                <span className="h-3 w-px bg-border" aria-hidden />
                <span className="tabular-nums">
                  {course.students_count.toLocaleString(isEn ? "en" : "fr")}{" "}
                  {isEn ? "students" : "étudiants"}
                </span>
              </>
            )}
          </div>
          <div className="mt-5">
            <Link
              href={`/courses/${course.slug}`}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-opacity hover:bg-primary/90"
            >
              {locked
                ? isEn
                  ? "Preview"
                  : "Aperçu"
                : isEn
                  ? "Start learning"
                  : "Commencer"}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {/* Right: visual */}
        <div className="relative min-h-[180px] bg-gradient-to-br from-primary/20 via-primary/10 to-chart-2/10 md:min-h-[260px]">
          {course.cover_url || course.thumbnail_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={(course.cover_url || course.thumbnail_url)!}
              alt={course.title}
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <Sparkles className="h-16 w-16 text-primary/40" />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

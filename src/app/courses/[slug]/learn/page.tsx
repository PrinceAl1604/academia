"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronRight,
  Lock,
  Loader2,
  Play,
  BookOpen,
  X,
} from "lucide-react";
import {
  getCourseBySlug,
  getCompletedLessons,
  markLessonComplete,
  enrollInCourse,
  type CourseRow,
  type ModuleRow,
  type LessonRow,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/i18n/language-context";
import { useProgress } from "@/lib/progress-context";
import { Logo } from "@/components/shared/logo";
import { cn } from "@/lib/utils";

function getYouTubeId(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  return match?.[1] ?? null;
}

/**
 * Fetch lesson content through the secure server API.
 * The server checks Pro status and only returns youtube_url if authorized.
 */
async function fetchSecureLesson(
  lessonId: string
): Promise<{ youtube_url: string | null; locked: boolean } | null> {
  try {
    const res = await fetch(`/api/lessons/${lessonId}`);
    if (!res.ok) return null;
    const data = await res.json();
    return { youtube_url: data.youtube_url, locked: data.locked };
  } catch {
    return null;
  }
}

/**
 * Lesson player — Cook-OS-flavored refresh.
 *
 * Migrated from hardcoded `bg-white dark:bg-neutral-950 / bg-neutral-50 /
 * border-neutral-200 dark:border-neutral-800` patterns to semantic tokens.
 *
 * Active-lesson treatment: 2-px primary-green left edge + bg-muted fill.
 * Matches the sidebar nav active-state pattern from Phase 3 — same
 * "operator console" indicator across the whole app.
 *
 * Progress ring on the topbar uses --primary green (was raw `text-green-500`)
 * so brand-color changes propagate automatically.
 *
 * The video player area itself keeps `bg-black` — videos play best on
 * a true-black surface and that's a functional choice, not a theme one.
 *
 * Mobile + desktop sidebars share the same chapter/lesson rendering
 * (CurriculumSidebar component). The previous version duplicated ~120
 * lines between the two render paths.
 */
export default function CoursePlayerPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = params.slug as string;
  const lessonParam = searchParams.get("lesson");
  const { user, isPro, isAuthenticated } = useAuth();
  const { t } = useLanguage();
  const { refresh: refreshProgress } = useProgress();
  const isEn = t.nav.signIn === "Sign In";

  const [course, setCourse] = useState<
    (CourseRow & { modules: ModuleRow[] }) | null
  >(null);
  const [loading, setLoading] = useState(true);
  const [activeLesson, setActiveLesson] = useState<LessonRow | null>(null);
  const [secureVideoUrl, setSecureVideoUrl] = useState<string | null>(null);
  const [lessonLocked, setLessonLocked] = useState(false);
  const [expandedModules, setExpandedModules] = useState<string[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(
    new Set()
  );
  // Re-entrancy guard for "Complete & Next". Optimistic state flips
  // before the RPC resolves, so a fast double-click would fire
  // markLessonComplete twice and (worse) auto-advance two lessons in
  // one click — landing the user on a lesson they haven't seen.
  const markingRef = useRef(false);

  useEffect(() => {
    async function load() {
      const data = await getCourseBySlug(slug);
      setCourse(data);
      if (data) {
        const allLessons = data.modules.flatMap((m) => m.lessons);
        // Validate that ?lesson=ID actually belongs to this course.
        // Without this guard, /courses/A/learn?lesson=<id-from-course-B>
        // would render course-B's lesson inside course-A's shell — the
        // module/sidebar wouldn't match, the "complete & next" walk
        // would bounce, and a Pro user could deep-link to a peer's
        // unrelated course content.
        const targetLesson =
          (lessonParam && allLessons.find((l) => l.id === lessonParam)) ||
          allLessons[0];

        if (targetLesson) {
          setActiveLesson(targetLesson);
          const parentModule = data.modules.find((m) =>
            m.lessons.some((l) => l.id === targetLesson.id)
          );
          if (parentModule) {
            setExpandedModules([parentModule.id]);
          }
        }
      }

      if (user && data) {
        const completed = await getCompletedLessons(user.id);
        setCompletedLessons(new Set(completed));
        enrollInCourse(user.id, data.id).catch(() => {});
      }

      setLoading(false);
    }
    load();
  }, [slug, user, lessonParam]);

  useEffect(() => {
    if (!activeLesson) {
      setSecureVideoUrl(null);
      setLessonLocked(false);
      return;
    }
    let cancelled = false;
    fetchSecureLesson(activeLesson.id).then((result) => {
      if (cancelled) return;
      if (result) {
        // Server-validated payload — youtube_url is null for locked
        // lessons, populated for accessible ones.
        setSecureVideoUrl(result.youtube_url);
        setLessonLocked(result.locked);
      } else {
        // Server refused or errored — DO NOT fall back to the
        // client-cached `activeLesson.youtube_url`. The previous
        // version did, which silently bypassed the server's Pro
        // gate whenever /api/lessons/:id failed (network blip,
        // 401/403, transient 500). Treat null result as locked.
        setSecureVideoUrl(null);
        setLessonLocked(true);
      }
    });
    return () => { cancelled = true; };
  }, [activeLesson?.id]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Course not found</p>
      </div>
    );
  }

  const isLocked = !isPro && !course.is_free;

  if (!isAuthenticated) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-background p-8 text-center">
        <Lock className="h-10 w-10 text-muted-foreground/60" />
        <h1 className="text-xl font-medium tracking-tight text-foreground">
          {t.auth.signIn}
        </h1>
        <p className="max-w-md text-muted-foreground">
          {isEn ? "Sign in to start learning" : "Connectez-vous pour commencer"}
        </p>
        <Button className="mt-2 gap-2" render={<Link href="/sign-in" />}>
          {t.auth.signIn}
        </Button>
      </div>
    );
  }

  if (isLocked) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-background p-8 text-center">
        <Lock className="h-10 w-10 text-muted-foreground/60" />
        <h1 className="text-xl font-medium tracking-tight text-foreground">
          {isEn ? "Pro membership required" : "Abonnement Pro requis"}
        </h1>
        <p className="max-w-md text-muted-foreground">
          {isEn ? "Subscribe to unlock all courses." : "Abonnez-vous pour débloquer tous les cours."}
        </p>
        <Button className="mt-2 gap-2" render={<Link href="/dashboard/subscription" />}>
          {isEn ? "Subscribe Now" : "S'abonner"}
        </Button>
      </div>
    );
  }

  const allLessons = course.modules.flatMap((m) => m.lessons);
  const totalLessons = allLessons.length;
  const completedCount = allLessons.filter((l) => completedLessons.has(l.id)).length;
  const progress = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  const youtubeId = secureVideoUrl
    ? getYouTubeId(secureVideoUrl)
    : null;

  const toggleModule = (moduleId: string) => {
    setExpandedModules((prev) =>
      prev.includes(moduleId)
        ? prev.filter((id) => id !== moduleId)
        : [...prev, moduleId]
    );
  };

  const handleMarkComplete = () => {
    if (!activeLesson || !user) return;
    if (markingRef.current) return;
    markingRef.current = true;
    setCompletedLessons((prev) => new Set([...prev, activeLesson.id]));
    markLessonComplete(user.id, activeLesson.id)
      .then(() => refreshProgress())
      .catch(() => {})
      .finally(() => {
        markingRef.current = false;
      });

    const currentIdx = allLessons.findIndex((l) => l.id === activeLesson.id);
    if (currentIdx < allLessons.length - 1) {
      const next = allLessons[currentIdx + 1];
      setActiveLesson(next);
      const parentModule = course.modules.find((m) =>
        m.lessons.some((l) => l.id === next.id)
      );
      if (parentModule && !expandedModules.includes(parentModule.id)) {
        setExpandedModules((prev) => [...prev, parentModule.id]);
      }
    }
  };

  const selectLesson = (lesson: LessonRow) => {
    setActiveLesson(lesson);
    if (window.innerWidth < 1024) setSidebarOpen(false);
  };

  const activeChapter = course.modules.find((m) =>
    m.lessons.some((l) => l.id === activeLesson?.id)
  );

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* ── Top Bar ───────────────────────────────────────── */}
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-border bg-background px-4">
        <div className="flex items-center gap-3">
          <Link
            href={`/courses/${slug}`}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            aria-label={t.nav.courses}
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="h-4 w-px bg-border" />
          <Logo className="h-4" />
        </div>

        <div className="flex items-center gap-4">
          {/* Progress ring */}
          <div className="hidden items-center gap-2.5 sm:flex">
            <div className="relative h-7 w-7">
              <svg className="h-7 w-7 -rotate-90" viewBox="0 0 28 28">
                <circle
                  cx="14" cy="14" r="12" fill="none"
                  stroke="currentColor" strokeWidth="2"
                  className="text-muted"
                />
                <circle
                  cx="14" cy="14" r="12" fill="none"
                  stroke="currentColor" strokeWidth="2"
                  strokeDasharray={`${(progress / 100) * 75.4} 75.4`}
                  strokeLinecap="round"
                  className="text-primary"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center font-mono text-[9px] font-medium text-foreground tabular-nums">
                {progress}%
              </span>
            </div>
            <span className="font-mono text-[11px] text-muted-foreground tabular-nums">
              {completedCount}/{totalLessons}
            </span>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="gap-1.5"
          >
            <BookOpen className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">
              {isEn ? "Contents" : "Contenu"}
            </span>
          </Button>
        </div>
      </header>

      {/* ── Main Content ───────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* ── Video + Lesson Info ──────────────────────── */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Video Player — always pure black, video looks best on
              true-black background */}
          <div
            className="relative w-full bg-black"
            style={{ aspectRatio: "16/9", maxHeight: "calc(100vh - 12rem)" }}
          >
            {lessonLocked ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/5 backdrop-blur">
                  <Lock className="h-7 w-7 text-muted-foreground/60" />
                </div>
                <p className="text-sm text-foreground/80 font-medium">
                  {isEn ? "Pro membership required" : "Abonnement Pro requis"}
                </p>
                <Link
                  href="/dashboard/subscription"
                  className="mt-1 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  {isEn ? "Upgrade to Pro" : "Passer au Pro"}
                </Link>
              </div>
            ) : youtubeId ? (
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${youtubeId}?rel=0&modestbranding=1&showinfo=0&iv_load_policy=3&color=white&autoplay=1`}
                className="absolute inset-0 h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title={activeLesson?.title}
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/5 backdrop-blur">
                  <Play className="h-7 w-7 text-muted-foreground/60" fill="currentColor" />
                </div>
                <p className="text-sm text-muted-foreground/70">
                  {activeLesson?.title ?? "Select a lesson"}
                </p>
              </div>
            )}
          </div>

          {/* ── Action bar ──────────────────────────────── */}
          <div className="flex shrink-0 flex-col gap-2 border-t border-border bg-background px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div className="min-w-0 flex-1">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-0.5">
                {activeChapter
                  ? `Chapter ${course.modules.indexOf(activeChapter) + 1}`
                  : ""}
              </p>
              <h2 className="truncate text-sm font-medium tracking-tight text-foreground">
                {activeLesson?.title}
              </h2>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="ghost"
                size="sm"
                disabled={allLessons.findIndex((l) => l.id === activeLesson?.id) === 0}
                onClick={() => {
                  const idx = allLessons.findIndex((l) => l.id === activeLesson?.id);
                  if (idx > 0) selectLesson(allLessons[idx - 1]);
                }}
              >
                {isEn ? "Previous" : "Précédent"}
              </Button>

              {activeLesson && completedLessons.has(activeLesson.id) ? (
                <Button
                  size="sm"
                  className="gap-1.5"
                  onClick={() => {
                    const idx = allLessons.findIndex((l) => l.id === activeLesson?.id);
                    if (idx < allLessons.length - 1) selectLesson(allLessons[idx + 1]);
                  }}
                  disabled={
                    allLessons.findIndex((l) => l.id === activeLesson?.id) === allLessons.length - 1
                  }
                >
                  <Check className="h-3.5 w-3.5" />
                  {isEn ? "Next" : "Suivant"}
                </Button>
              ) : (
                <Button
                  size="sm"
                  className="gap-1.5"
                  onClick={handleMarkComplete}
                >
                  <Check className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">
                    {isEn ? "Complete & Next" : "Terminer & Suivant"}
                  </span>
                  <span className="sm:hidden">{isEn ? "Done" : "Fait"}</span>
                </Button>
              )}
            </div>
          </div>

          {/* ── Lesson description ─────────────────────── */}
          <div className="flex-1 overflow-y-auto border-t border-border bg-card/40">
            <div className="mx-auto max-w-3xl px-5 py-6">
              {activeLesson?.content ? (
                <div className="prose prose-sm dark:prose-invert max-w-none text-foreground">
                  <p>{activeLesson.content}</p>
                </div>
              ) : activeLesson?.description ? (
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {activeLesson.description}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground/70 italic">
                  {isEn ? "No description for this lesson." : "Aucune description pour cette leçon."}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ── Mobile sidebar overlay (below lg) ────────── */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-50 lg:hidden"
            role="dialog"
            aria-modal="true"
            aria-label={isEn ? "Course Content" : "Contenu du cours"}
            onKeyDown={(e) => { if (e.key === "Escape") setSidebarOpen(false); }}
          >
            <div className="absolute inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
            <aside className="absolute right-0 top-0 flex h-full w-[85vw] max-w-80 flex-col bg-card shadow-2xl shadow-black/50">
              <CurriculumSidebar
                course={course}
                activeLesson={activeLesson}
                completedLessons={completedLessons}
                expandedModules={expandedModules}
                completedCount={completedCount}
                totalLessons={totalLessons}
                progress={progress}
                isEn={isEn}
                onClose={() => setSidebarOpen(false)}
                onToggleModule={toggleModule}
                onSelectLesson={selectLesson}
              />
            </aside>
          </div>
        )}

        {/* ── Desktop sidebar (lg+) ───────────────────── */}
        {sidebarOpen && (
          <aside className="hidden w-80 shrink-0 flex-col border-l border-border bg-card lg:flex">
            <CurriculumSidebar
              course={course}
              activeLesson={activeLesson}
              completedLessons={completedLessons}
              expandedModules={expandedModules}
              completedCount={completedCount}
              totalLessons={totalLessons}
              progress={progress}
              isEn={isEn}
              onClose={() => setSidebarOpen(false)}
              onToggleModule={toggleModule}
              onSelectLesson={selectLesson}
            />
          </aside>
        )}
      </div>
    </div>
  );
}

/* ─── Curriculum Sidebar ───────────────────────────────────────
   Shared between the mobile overlay and the desktop right rail.
   The previous version duplicated ~120 lines between the two render
   paths; this consolidates them. The only difference between mobile
   and desktop was the close-button size, which we keep uniform now. */
function CurriculumSidebar({
  course,
  activeLesson,
  completedLessons,
  expandedModules,
  completedCount,
  totalLessons,
  progress,
  isEn,
  onClose,
  onToggleModule,
  onSelectLesson,
}: {
  course: CourseRow & { modules: ModuleRow[] };
  activeLesson: LessonRow | null;
  completedLessons: Set<string>;
  expandedModules: string[];
  completedCount: number;
  totalLessons: number;
  progress: number;
  isEn: boolean;
  onClose: () => void;
  onToggleModule: (id: string) => void;
  onSelectLesson: (l: LessonRow) => void;
}) {
  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            / Curriculum
          </p>
          <h3 className="text-sm font-medium tracking-tight text-foreground">
            {isEn ? "Course Content" : "Contenu du cours"}
          </h3>
          <p className="mt-0.5 font-mono text-[11px] text-muted-foreground tabular-nums">
            {completedCount}/{totalLessons} {isEn ? "completed" : "terminées"}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onClose}
          aria-label={isEn ? "Close course content" : "Fermer le contenu"}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Progress */}
      <div className="px-4 py-2 border-b border-border">
        <Progress value={progress} className="h-1" />
      </div>

      {/* Chapters */}
      <ScrollArea className="flex-1">
        {course.modules.map((module, idx) => {
          const isActiveChapter = module.lessons.some((l) => l.id === activeLesson?.id);
          const chapterCompleted = module.lessons.every((l) => completedLessons.has(l.id));
          const chapterProgress = module.lessons.filter((l) => completedLessons.has(l.id)).length;
          const isExpanded = expandedModules.includes(module.id);

          return (
            <div key={module.id}>
              <button
                className={cn(
                  "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors",
                  isActiveChapter
                    ? "bg-muted/50"
                    : "hover:bg-muted/30"
                )}
                onClick={() => onToggleModule(module.id)}
                aria-expanded={isExpanded}
              >
                {isExpanded ? (
                  <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                    Chapter {String(idx + 1).padStart(2, "0")}
                  </p>
                  <p className="text-sm font-medium text-foreground truncate tracking-tight">
                    {module.title}
                  </p>
                </div>
                <span className="shrink-0">
                  {chapterCompleted ? (
                    <Check className="h-3.5 w-3.5 text-primary" />
                  ) : (
                    <span className="font-mono text-[10px] text-muted-foreground tabular-nums">
                      {chapterProgress}/{module.lessons.length}
                    </span>
                  )}
                </span>
              </button>

              {isExpanded && (
                <div className="pb-1">
                  {module.lessons.map((lesson) => {
                    const isCompleted = completedLessons.has(lesson.id);
                    const isActive = lesson.id === activeLesson?.id;

                    return (
                      <button
                        key={lesson.id}
                        className={cn(
                          "group/lesson relative flex w-full items-center gap-3 px-4 py-2.5 pl-10 text-left transition-colors",
                          // Active gets the same 2-px primary-green left
                          // edge as the dashboard sidebar — single
                          // active-state pattern across the whole app.
                          isActive &&
                            "before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-[2px] before:rounded-r-sm before:bg-primary",
                          isActive
                            ? "bg-muted/60"
                            : "hover:bg-muted/30"
                        )}
                        onClick={() => onSelectLesson(lesson)}
                      >
                        <span className="shrink-0">
                          {isCompleted ? (
                            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/15">
                              <Check className="h-3 w-3 text-primary" />
                            </div>
                          ) : isActive ? (
                            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary">
                              <Play className="h-2.5 w-2.5 text-primary-foreground" fill="currentColor" />
                            </div>
                          ) : (
                            <div className="flex h-5 w-5 items-center justify-center rounded-full border border-border">
                              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
                            </div>
                          )}
                        </span>
                        <span
                          className={cn(
                            "flex-1 text-sm truncate",
                            isActive
                              ? "font-medium text-foreground"
                              : isCompleted
                                ? "text-muted-foreground line-through"
                                : "text-muted-foreground"
                          )}
                        >
                          {lesson.title}
                        </span>
                        {lesson.duration_minutes > 0 && (
                          <span className="shrink-0 font-mono text-[10px] text-muted-foreground tabular-nums">
                            {lesson.duration_minutes}m
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </ScrollArea>
    </>
  );
}

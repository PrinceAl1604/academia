"use client";

import { useState, useEffect } from "react";
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
import { Logo } from "@/components/shared/logo";

function getYouTubeId(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  return match?.[1] ?? null;
}

export default function CoursePlayerPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = params.slug as string;
  const lessonParam = searchParams.get("lesson");
  const { user, isPro, isAuthenticated } = useAuth();
  const { t } = useLanguage();
  const isEn = t.nav.signIn === "Sign In";

  const [course, setCourse] = useState<
    (CourseRow & { modules: ModuleRow[] }) | null
  >(null);
  const [loading, setLoading] = useState(true);
  const [activeLesson, setActiveLesson] = useState<LessonRow | null>(null);
  const [expandedModules, setExpandedModules] = useState<string[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(
    new Set()
  );

  useEffect(() => {
    async function load() {
      const data = await getCourseBySlug(slug);
      setCourse(data);
      if (data) {
        const allLessons = data.modules.flatMap((m) => m.lessons);
        const targetLesson = lessonParam
          ? allLessons.find((l) => l.id === lessonParam)
          : allLessons[0];

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

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-neutral-950">
        <Loader2 className="h-8 w-8 animate-spin text-neutral-500" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="flex h-screen items-center justify-center bg-neutral-950">
        <p className="text-neutral-400">Course not found</p>
      </div>
    );
  }

  const isLocked = !isPro && !course.is_free;

  if (!isAuthenticated) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-neutral-950 p-8 text-center">
        <Lock className="h-12 w-12 text-neutral-600" />
        <h1 className="text-xl font-semibold text-white">{t.auth.signIn}</h1>
        <p className="max-w-md text-neutral-400">
          {isEn
            ? "Sign in to start learning"
            : "Connectez-vous pour commencer"}
        </p>
        <Button
          className="mt-2 gap-2"
          render={<Link href="/sign-in" />}
        >
          {t.auth.signIn}
        </Button>
      </div>
    );
  }

  if (isLocked) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-neutral-950 p-8 text-center">
        <Lock className="h-12 w-12 text-neutral-600" />
        <h1 className="text-xl font-semibold text-white">
          {isEn ? "Pro membership required" : "Abonnement Pro requis"}
        </h1>
        <p className="max-w-md text-neutral-400">
          {isEn
            ? "Subscribe to unlock all courses."
            : "Abonnez-vous pour débloquer tous les cours."}
        </p>
        <Button
          className="mt-2 gap-2"
          render={<Link href="/dashboard/subscription" />}
        >
          {isEn ? "Subscribe Now" : "S'abonner"}
        </Button>
      </div>
    );
  }

  const allLessons = course.modules.flatMap((m) => m.lessons);
  const totalLessons = allLessons.length;
  const completedCount = allLessons.filter((l) =>
    completedLessons.has(l.id)
  ).length;
  const progress =
    totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  const youtubeId = activeLesson?.youtube_url
    ? getYouTubeId(activeLesson.youtube_url)
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
    setCompletedLessons((prev) => new Set([...prev, activeLesson.id]));
    markLessonComplete(user.id, activeLesson.id).catch(() => {});

    // Auto-advance to next lesson
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
    // On mobile, close sidebar after selecting
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  };

  const activeChapter = course.modules.find((m) =>
    m.lessons.some((l) => l.id === activeLesson?.id)
  );

  return (
    <div className="flex h-screen flex-col bg-neutral-950">
      {/* ─── Top Bar ─────────────────────────────────────────── */}
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-neutral-800 px-4">
        <div className="flex items-center gap-3">
          <Link
            href={`/courses/${slug}`}
            className="flex items-center gap-2 text-neutral-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="h-4 w-px bg-neutral-800" />
          <Logo className="h-4 brightness-0 invert" />
        </div>

        <div className="flex items-center gap-4">
          {/* Progress */}
          <div className="hidden items-center gap-2.5 sm:flex">
            <div className="relative h-7 w-7">
              <svg className="h-7 w-7 -rotate-90" viewBox="0 0 28 28">
                <circle
                  cx="14"
                  cy="14"
                  r="12"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="text-neutral-800"
                />
                <circle
                  cx="14"
                  cy="14"
                  r="12"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeDasharray={`${(progress / 100) * 75.4} 75.4`}
                  strokeLinecap="round"
                  className="text-green-500"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-neutral-300">
                {progress}%
              </span>
            </div>
            <span className="text-xs text-neutral-500">
              {completedCount}/{totalLessons}
            </span>
          </div>

          {/* Sidebar toggle */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs text-neutral-400 hover:bg-neutral-800 hover:text-white transition-colors"
          >
            <BookOpen className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">
              {isEn ? "Contents" : "Contenu"}
            </span>
          </button>
        </div>
      </header>

      {/* ─── Main Content ────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* ─── Video + Lesson Info ─────────────────────────── */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Video Player */}
          <div className="relative w-full bg-black" style={{ aspectRatio: "16/9", maxHeight: "calc(100vh - 12rem)" }}>
            {youtubeId ? (
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
                  <Play className="h-7 w-7 text-neutral-400" fill="currentColor" />
                </div>
                <p className="text-sm text-neutral-500">
                  {activeLesson?.title ?? "Select a lesson"}
                </p>
              </div>
            )}
          </div>

          {/* ─── Lesson Action Bar ──────────────────────────── */}
          <div className="flex shrink-0 items-center justify-between border-t border-neutral-800 px-5 py-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs text-neutral-500 mb-0.5">
                {activeChapter
                  ? `${isEn ? "Chapter" : "Chapitre"} ${course.modules.indexOf(activeChapter) + 1}`
                  : ""}
              </p>
              <h2 className="truncate text-sm font-medium text-white">
                {activeLesson?.title}
              </h2>
            </div>

            <div className="ml-4 flex items-center gap-2 shrink-0">
              {/* Previous */}
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-neutral-400 hover:text-white hover:bg-neutral-800"
                disabled={
                  allLessons.findIndex((l) => l.id === activeLesson?.id) === 0
                }
                onClick={() => {
                  const idx = allLessons.findIndex(
                    (l) => l.id === activeLesson?.id
                  );
                  if (idx > 0) selectLesson(allLessons[idx - 1]);
                }}
              >
                {isEn ? "Previous" : "Précédent"}
              </Button>

              {/* Mark Complete / Next */}
              {activeLesson && completedLessons.has(activeLesson.id) ? (
                <Button
                  size="sm"
                  className="h-8 gap-1.5 bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => {
                    const idx = allLessons.findIndex(
                      (l) => l.id === activeLesson?.id
                    );
                    if (idx < allLessons.length - 1)
                      selectLesson(allLessons[idx + 1]);
                  }}
                  disabled={
                    allLessons.findIndex((l) => l.id === activeLesson?.id) ===
                    allLessons.length - 1
                  }
                >
                  <Check className="h-3.5 w-3.5" />
                  {isEn ? "Next" : "Suivant"}
                </Button>
              ) : (
                <Button
                  size="sm"
                  className="h-8 gap-1.5"
                  onClick={handleMarkComplete}
                >
                  <Check className="h-3.5 w-3.5" />
                  {isEn ? "Complete & Next" : "Terminer & Suivant"}
                </Button>
              )}
            </div>
          </div>

          {/* ─── Lesson Description (scrollable) ────────────── */}
          <div className="flex-1 overflow-y-auto border-t border-neutral-800 bg-neutral-900/50">
            <div className="mx-auto max-w-3xl px-5 py-6">
              {activeLesson?.content ? (
                <div className="prose prose-invert prose-sm max-w-none text-neutral-300">
                  <p>{activeLesson.content}</p>
                </div>
              ) : activeLesson?.description ? (
                <p className="text-sm text-neutral-400 leading-relaxed">
                  {activeLesson.description}
                </p>
              ) : (
                <p className="text-sm text-neutral-600 italic">
                  {isEn
                    ? "No description for this lesson."
                    : "Aucune description pour cette leçon."}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ─── Right Sidebar ─────────────────────────────────── */}
        {sidebarOpen && (
          <aside className="hidden w-80 shrink-0 flex-col border-l border-neutral-800 bg-neutral-900 md:flex">
            {/* Sidebar Header */}
            <div className="flex items-center justify-between border-b border-neutral-800 px-4 py-3">
              <div>
                <h3 className="text-sm font-semibold text-white">
                  {isEn ? "Course Content" : "Contenu du cours"}
                </h3>
                <p className="mt-0.5 text-xs text-neutral-500">
                  {completedCount}/{totalLessons}{" "}
                  {isEn ? "completed" : "terminées"}
                </p>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="rounded-md p-1 text-neutral-500 hover:bg-neutral-800 hover:text-neutral-300"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Progress bar */}
            <div className="px-4 py-2 border-b border-neutral-800">
              <Progress value={progress} className="h-1" />
            </div>

            {/* Chapter list */}
            <ScrollArea className="flex-1">
              {course.modules.map((module, idx) => {
                const isActiveChapter = module.lessons.some(
                  (l) => l.id === activeLesson?.id
                );
                const chapterCompleted = module.lessons.every((l) =>
                  completedLessons.has(l.id)
                );
                const chapterProgress = module.lessons.length > 0
                  ? module.lessons.filter((l) => completedLessons.has(l.id)).length
                  : 0;

                return (
                  <div key={module.id}>
                    {/* Chapter header */}
                    <button
                      className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${
                        isActiveChapter
                          ? "bg-neutral-800/50"
                          : "hover:bg-neutral-800/30"
                      }`}
                      onClick={() => toggleModule(module.id)}
                    >
                      {expandedModules.includes(module.id) ? (
                        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-neutral-500" />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-neutral-500" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-medium uppercase tracking-wider text-neutral-500">
                          {isEn ? "Chapter" : "Chapitre"} {idx + 1}
                        </p>
                        <p className="text-sm font-medium text-neutral-200 truncate">
                          {module.title}
                        </p>
                      </div>
                      <span className="text-[10px] text-neutral-600 shrink-0">
                        {chapterCompleted ? (
                          <Check className="h-3.5 w-3.5 text-green-500" />
                        ) : (
                          `${chapterProgress}/${module.lessons.length}`
                        )}
                      </span>
                    </button>

                    {/* Lessons */}
                    {expandedModules.includes(module.id) && (
                      <div className="pb-1">
                        {module.lessons.map((lesson) => {
                          const isCompleted = completedLessons.has(lesson.id);
                          const isActive = lesson.id === activeLesson?.id;

                          return (
                            <button
                              key={lesson.id}
                              className={`flex w-full items-center gap-3 px-4 py-2.5 pl-10 text-left transition-colors ${
                                isActive
                                  ? "bg-neutral-800 border-l-2 border-white"
                                  : "hover:bg-neutral-800/40 border-l-2 border-transparent"
                              }`}
                              onClick={() => selectLesson(lesson)}
                            >
                              {/* Status icon */}
                              <span className="shrink-0">
                                {isCompleted ? (
                                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-green-500/20">
                                    <Check className="h-3 w-3 text-green-400" />
                                  </div>
                                ) : isActive ? (
                                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-white/10">
                                    <Play
                                      className="h-3 w-3 text-white"
                                      fill="currentColor"
                                    />
                                  </div>
                                ) : (
                                  <div className="flex h-5 w-5 items-center justify-center rounded-full border border-neutral-700">
                                    <span className="h-1.5 w-1.5 rounded-full bg-neutral-600" />
                                  </div>
                                )}
                              </span>

                              {/* Title */}
                              <span
                                className={`flex-1 text-sm truncate ${
                                  isActive
                                    ? "font-medium text-white"
                                    : isCompleted
                                      ? "text-neutral-500 line-through"
                                      : "text-neutral-400"
                                }`}
                              >
                                {lesson.title}
                              </span>

                              {/* Duration */}
                              {lesson.duration_minutes > 0 && (
                                <span className="shrink-0 text-[10px] text-neutral-600">
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
          </aside>
        )}
      </div>
    </div>
  );
}

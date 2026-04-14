"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { SidebarLayout } from "@/components/layout/sidebar-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  BookOpen,
  Clock,
  Play,
  Star,
  Users,
  CheckCircle2,
  Lock,
  Loader2,
  GraduationCap,
  Infinity,
} from "lucide-react";
import { getCourseBySlug, type CourseRow, type ModuleRow } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/i18n/language-context";
import { MembershipPopover } from "@/components/shared/upgrade-popover";

function extractYouTubeId(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  return match?.[1] ?? null;
}

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default function CourseDetailPage({ params }: PageProps) {
  const { slug } = use(params);
  const { isPro, isAuthenticated } = useAuth();
  const { t } = useLanguage();
  const [course, setCourse] = useState<
    (CourseRow & { modules: ModuleRow[] }) | null
  >(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCourseBySlug(slug).then((data) => {
      setCourse(data);
      setLoading(false);
    });
  }, [slug]);

  if (loading) {
    return (
      <SidebarLayout>
        <div className="flex items-center justify-center py-32">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </SidebarLayout>
    );
  }

  if (!course) {
    notFound();
  }

  const isLocked = !isPro && !course.is_free;
  const totalLessons = course.total_lessons ?? 0;
  const durationHours = course.duration_hours ?? 0;
  const totalChapters = course.modules.length;

  // Find first video for preview
  const firstVideo = course.modules
    .flatMap((m) => m.lessons)
    .find((l) => l.youtube_url);
  const previewVideoId = firstVideo?.youtube_url
    ? extractYouTubeId(firstVideo.youtube_url)
    : null;

  return (
    <SidebarLayout>
        <main className="pb-16">
          {/* ─── Hero Section ──────────────────────────────────── */}
          <div className="relative bg-neutral-900 dark:bg-neutral-900">
            {/* Background gradient */}
            <div className="absolute inset-0 bg-gradient-to-b from-neutral-900 via-neutral-900/95 to-neutral-900" />

            <div className="relative mx-auto max-w-5xl px-4 sm:px-6 py-8 lg:py-12">
              {/* Back */}
              <Link
                href="/"
                className="mb-6 inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                {t.nav.courses}
              </Link>

              <div className="grid gap-8 lg:grid-cols-5">
                {/* Left — Course info */}
                <div className="lg:col-span-3">
                  {/* Category + Level badges */}
                  <div className="flex items-center gap-2 mb-4">
                    <Badge className="bg-white/10 text-white border-0 backdrop-blur">
                      {course.category?.name ?? "General"}
                    </Badge>
                    <Badge className="bg-white/5 text-neutral-300 border-0">
                      {course.level}
                    </Badge>
                    {course.is_free && (
                      <Badge className="bg-green-500/20 text-green-300 border-0">
                        {t.courseDetail.free}
                      </Badge>
                    )}
                  </div>

                  {/* Title */}
                  <h1 className="text-2xl font-bold text-white sm:text-3xl lg:text-4xl leading-tight">
                    {course.title}
                  </h1>

                  {/* Description */}
                  {course.description && (
                    <p className="mt-4 text-neutral-300 leading-relaxed max-w-xl">
                      {course.description}
                    </p>
                  )}

                  {/* Stats */}
                  <div className="mt-6 flex flex-wrap items-center gap-4 text-sm">
                    {course.rating > 0 && (
                      <span className="flex items-center gap-1.5 text-amber-400">
                        <Star className="h-4 w-4 fill-current" />
                        <span className="font-semibold">{course.rating}</span>
                      </span>
                    )}
                    <span className="flex items-center gap-1.5 text-neutral-400">
                      <Users className="h-4 w-4" />
                      {course.students_count.toLocaleString()} {t.courseDetail.students}
                    </span>
                    <span className="flex items-center gap-1.5 text-neutral-400">
                      <Clock className="h-4 w-4" />
                      {durationHours}h
                    </span>
                    <span className="flex items-center gap-1.5 text-neutral-400">
                      <BookOpen className="h-4 w-4" />
                      {totalChapters} {t.courseDetail.chapters} · {totalLessons} {t.courseDetail.lessons}
                    </span>
                  </div>

                  {/* Instructor */}
                  {course.instructor && (
                    <div className="mt-6 flex items-center gap-3">
                      <Avatar className="h-10 w-10 border-2 border-white/10">
                        <AvatarFallback className="bg-white/10 text-sm font-medium text-white">
                          {course.instructor.name.split(" ").map((n) => n[0]).join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-semibold text-white">
                          {course.instructor.name}
                        </p>
                        {course.instructor.title && (
                          <p className="text-xs text-neutral-400">
                            {course.instructor.title}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Right — Video Preview + CTA */}
                <div className="lg:col-span-2">
                  <div className="rounded-xl overflow-hidden border border-white/10 bg-neutral-800/50 backdrop-blur">
                    {/* Course preview image */}
                    {(() => {
                      const imgSrc = course.cover_url
                        || (previewVideoId ? `https://img.youtube.com/vi/${previewVideoId}/maxresdefault.jpg` : null);

                      return imgSrc ? (
                        <div className="aspect-video relative group cursor-pointer">
                          <Image
                            src={imgSrc}
                            alt={course.title}
                            fill
                            sizes="(max-width: 1024px) 100vw, 40vw"
                            className="object-cover"
                            priority
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition-colors">
                            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-lg group-hover:scale-110 transition-transform">
                              <Play className="h-6 w-6 text-neutral-900 ml-0.5" fill="currentColor" />
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="aspect-video flex items-center justify-center bg-gradient-to-br from-neutral-700 to-neutral-800">
                          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/10 backdrop-blur">
                            <Play className="h-6 w-6 text-white" fill="currentColor" />
                          </div>
                        </div>
                      );
                    })()}

                    {/* CTA area */}
                    <div className="p-5 space-y-3">
                      {isLocked ? (
                        <MembershipPopover>
                          <Button className="h-11 w-full gap-2 text-sm !bg-white !text-neutral-900 hover:!bg-neutral-200">
                            <Lock className="h-4 w-4" />
                            {t.courseDetail.getMembership}
                          </Button>
                        </MembershipPopover>
                      ) : !isAuthenticated ? (
                        <Button
                          className="h-11 w-full text-sm !bg-white !text-neutral-900 hover:!bg-neutral-200"
                          render={<Link href="/sign-in" />}
                        >
                          {t.courseDetail.startLearning}
                        </Button>
                      ) : (
                        <Button
                          className="h-11 w-full text-sm !bg-white !text-neutral-900 hover:!bg-neutral-200"
                          render={<Link href={`/courses/${course.slug}/learn`} />}
                        >
                          {t.courseDetail.startLearning}
                        </Button>
                      )}

                      <p className="text-center text-xs text-neutral-500">
                        {isLocked
                          ? t.courseDetail.proRequired
                          : t.courseDetail.includedInSub}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ─── Course Content ────────────────────────────────── */}
          <div className="mx-auto max-w-5xl px-4 sm:px-6 py-10">
            {/* What's included — horizontal cards */}
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 mb-10">
              <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
                <Clock className="h-5 w-5 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-foreground">{durationHours}h</p>
                  <p className="text-xs text-muted-foreground">{t.courseDetail.ofContent}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
                <GraduationCap className="h-5 w-5 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-foreground">{totalLessons}</p>
                  <p className="text-xs text-muted-foreground">{t.courseDetail.lessons}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
                <Infinity className="h-5 w-5 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-foreground">{t.courseDetail.lifetime}</p>
                  <p className="text-xs text-muted-foreground">{t.courseDetail.accessLabel}</p>
                </div>
              </div>
            </div>

            {/* Curriculum */}
            <div>
              <h2 className="text-xl font-bold text-foreground">
                {t.courseDetail.curriculum}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {totalChapters} {t.courseDetail.chapters} · {totalLessons} {t.courseDetail.lessons} · {durationHours}h
              </p>

              {course.modules.length > 0 ? (
                <div className="mt-6 space-y-3">
                  {course.modules.map((module, idx) => (
                    <ChapterCard
                      key={module.id}
                      module={module}
                      index={idx}
                      courseSlug={course.slug}
                      isLocked={isLocked}
                      isAuthenticated={isAuthenticated}
                      t={t}
                    />
                  ))}
                </div>
              ) : (
                <p className="mt-6 text-sm text-muted-foreground italic">
                  {t.courseDetail.curriculumSoon}
                </p>
              )}
            </div>

            {/* Tags */}
            {course.tags && course.tags.length > 0 && (
              <div className="mt-12">
                <h3 className="text-sm font-semibold text-foreground">
                  {t.courseDetail.skillsYoullLearn}
                </h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {course.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-border bg-muted/40 px-3 py-1 text-xs text-muted-foreground"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </main>
    </SidebarLayout>
  );
}

/* ─── Chapter Card Component ───────────────────────────────────── */

function ChapterCard({
  module,
  index,
  courseSlug,
  isLocked,
  isAuthenticated,
  t,
}: {
  module: ModuleRow;
  index: number;
  courseSlug: string;
  isLocked: boolean;
  isAuthenticated: boolean;
  t: ReturnType<typeof import("@/lib/i18n/language-context").useLanguage>["t"];
}) {
  const [expanded, setExpanded] = useState(index === 0);

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Chapter header */}
      <button
        className="flex w-full items-center gap-4 px-5 py-4 text-left hover:bg-muted/40 transition-colors"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-sm font-bold text-muted-foreground shrink-0">
          {index + 1}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">
            {module.title}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {module.lessons.length} {t.courseDetail.lessons}
            {module.description && ` · ${module.description}`}
          </p>
        </div>
        <svg
          className={`h-5 w-5 text-muted-foreground shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Lessons */}
      {expanded && (
        <div className="border-t border-border">
          {module.lessons.map((lesson, lIdx) => {
            const canPlay = !isLocked || lesson.is_free;
            const lessonLink =
              canPlay && isAuthenticated
                ? `/courses/${courseSlug}/learn?lesson=${lesson.id}`
                : undefined;

            return (
              <div key={lesson.id}>
                {lIdx > 0 && (
                  <div className="mx-5 border-t border-border/60" />
                )}
                {lessonLink ? (
                  <Link
                    href={lessonLink}
                    className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/40 transition-colors group"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted group-hover:bg-primary/10 transition-colors shrink-0">
                      <Play className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground/80 group-hover:text-foreground transition-colors truncate">
                        {lesson.title}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {lesson.is_free && (
                        <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-medium text-primary">
                          {t.courseDetail.free}
                        </span>
                      )}
                      {lesson.duration_minutes > 0 && (
                        <span className="text-xs text-muted-foreground">
                          {lesson.duration_minutes}min
                        </span>
                      )}
                    </div>
                  </Link>
                ) : (
                  <div className="flex items-center gap-4 px-5 py-3.5 opacity-60">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted shrink-0">
                      <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-muted-foreground truncate">
                        {lesson.title}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {lesson.duration_minutes > 0 && (
                        <span className="text-xs text-muted-foreground">
                          {lesson.duration_minutes}min
                        </span>
                      )}
                      <Lock className="h-3 w-3 text-muted-foreground/60" />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

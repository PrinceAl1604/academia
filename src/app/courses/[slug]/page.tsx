"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { SidebarLayout } from "@/components/layout/sidebar-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  ArrowLeft,
  BookOpen,
  Clock,
  Play,
  Star,
  Users,
  Lock,
  Loader2,
  GraduationCap,
  Infinity,
  ChevronDown,
} from "lucide-react";
import { getCourseBySlug, type CourseRow, type ModuleRow } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/i18n/language-context";
import { MembershipPopover } from "@/components/shared/upgrade-popover";
import { cn } from "@/lib/utils";

function extractYouTubeId(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  return match?.[1] ?? null;
}

interface PageProps {
  params: Promise<{ slug: string }>;
}

/**
 * Course detail — Cook-OS-flavored refresh.
 *
 * Hero rebuilt:
 *   • Page lives on `bg-background`; the hero is `bg-card` (one
 *     luminance step up) — preserves the "elevated hero" feel without
 *     hardcoded `bg-neutral-900`. The override block would have
 *     hijacked that to bg-primary green.
 *   • Title goes from `text-2xl/3xl/4xl font-bold` to
 *     `text-3xl/4xl/5xl font-medium tracking-tight` — bigger,
 *     calmer, more "documentation".
 *   • Stats row uses mono-tabular for the figures.
 *   • CTA migrates from `!bg-white !text-neutral-900` (inverted on
 *     dark hero) to the standard primary-green default Button. The
 *     inversion was a hack against the hardcoded dark band; with
 *     bg-card the brand green reads cleanly without overrides.
 *
 * "What's included" cards drop the redundant hover styling and use
 * mono-tabular figures. Curriculum chapter cards migrate to bg-card +
 * border-border/60 with the same lesson-row treatment.
 */
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

  const firstVideo = course.modules
    .flatMap((m) => m.lessons)
    .find((l) => l.youtube_url);
  const previewVideoId = firstVideo?.youtube_url
    ? extractYouTubeId(firstVideo.youtube_url)
    : null;

  return (
    <SidebarLayout>
      <main className="pb-16">
        {/* ── Hero ──────────────────────────────────────────── */}
        <div className="relative bg-card border-b border-border/60">
          <div className="relative mx-auto max-w-6xl px-4 sm:px-6 py-10 lg:py-14">
            {/* Back */}
            <Link
              href="/"
              className="mb-8 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              {t.nav.courses}
            </Link>

            <div className="grid gap-8 lg:grid-cols-5">
              {/* Left — Course info */}
              <div className="lg:col-span-3 space-y-6">
                {/* Category + Level + Free badges */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Badge variant="mono">{course.category?.name ?? "General"}</Badge>
                  <Badge variant="mono">{course.level}</Badge>
                  {course.is_free && (
                    <Badge variant="primary">
                      {t.courseDetail.free}
                    </Badge>
                  )}
                </div>

                {/* Title */}
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-medium tracking-tight text-foreground leading-[1.1]">
                  {course.title}
                </h1>

                {/* Description */}
                {course.description && (
                  <p className="text-muted-foreground leading-relaxed text-base max-w-xl">
                    {course.description}
                  </p>
                )}

                {/* Stats */}
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm pt-2">
                  {course.rating > 0 && (
                    <span className="flex items-center gap-1.5 text-amber-400">
                      <Star className="h-3.5 w-3.5 fill-current" />
                      <span className="font-mono font-medium tabular-nums">
                        {course.rating}
                      </span>
                    </span>
                  )}
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <Users className="h-3.5 w-3.5" />
                    <span className="font-mono tabular-nums">
                      {course.students_count.toLocaleString()}
                    </span>
                    <span>{t.courseDetail.students}</span>
                  </span>
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    <span className="font-mono tabular-nums">{durationHours}h</span>
                  </span>
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <BookOpen className="h-3.5 w-3.5" />
                    <span className="font-mono tabular-nums">{totalChapters}</span>
                    <span>{t.courseDetail.chapters}</span>
                    <span className="text-muted-foreground/60">·</span>
                    <span className="font-mono tabular-nums">{totalLessons}</span>
                    <span>{t.courseDetail.lessons}</span>
                  </span>
                </div>

                {/* Instructor */}
                {course.instructor && (
                  <div className="flex items-center gap-3 pt-2">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-muted text-xs font-medium text-foreground">
                        {course.instructor.name.split(" ").map((n) => n[0]).join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {course.instructor.name}
                      </p>
                      {course.instructor.title && (
                        <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">
                          {course.instructor.title}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Right — Video preview + CTA */}
              <div className="lg:col-span-2">
                <div className="rounded-xl overflow-hidden border border-border/60 bg-popover">
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
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 group-hover:bg-black/30 transition-colors">
                          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary shadow-lg group-hover:scale-105 transition-transform">
                            <Play className="h-6 w-6 text-primary-foreground ml-0.5" fill="currentColor" />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="aspect-video flex items-center justify-center bg-gradient-to-br from-muted to-muted/40">
                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary">
                          <Play className="h-6 w-6 text-primary-foreground ml-0.5" fill="currentColor" />
                        </div>
                      </div>
                    );
                  })()}

                  {/* CTA */}
                  <div className="p-5 space-y-3 border-t border-border/60">
                    {isLocked ? (
                      <MembershipPopover>
                        <Button className="h-11 w-full gap-2 text-sm">
                          <Lock className="h-4 w-4" />
                          {t.courseDetail.getMembership}
                        </Button>
                      </MembershipPopover>
                    ) : !isAuthenticated ? (
                      <Button
                        className="h-11 w-full text-sm"
                        render={<Link href="/sign-in" />}
                      >
                        {t.courseDetail.startLearning}
                      </Button>
                    ) : (
                      <Button
                        className="h-11 w-full text-sm"
                        render={<Link href={`/courses/${course.slug}/learn`} />}
                      >
                        {t.courseDetail.startLearning}
                      </Button>
                    )}

                    <p className="text-center font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
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

        {/* ── Course content ────────────────────────────────── */}
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-12 space-y-12">
          {/* What's included */}
          <section>
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-4">
              / Includes
            </p>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
              <IncludeCard
                icon={<Clock className="h-4 w-4" />}
                value={`${durationHours}h`}
                label={t.courseDetail.ofContent}
              />
              <IncludeCard
                icon={<GraduationCap className="h-4 w-4" />}
                value={String(totalLessons)}
                label={t.courseDetail.lessons}
              />
              <IncludeCard
                icon={<Infinity className="h-4 w-4" />}
                value={t.courseDetail.lifetime}
                label={t.courseDetail.accessLabel}
              />
            </div>
          </section>

          {/* Curriculum */}
          <section className="space-y-4">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-1">
                / Curriculum
              </p>
              <h2 className="text-xl font-medium tracking-tight text-foreground">
                {t.courseDetail.curriculum}
              </h2>
              <p className="mt-1 font-mono text-[11px] text-muted-foreground tabular-nums">
                {totalChapters} {t.courseDetail.chapters} · {totalLessons} {t.courseDetail.lessons} · {durationHours}h
              </p>
            </div>

            {course.modules.length > 0 ? (
              <div className="space-y-2">
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
              <p className="text-sm text-muted-foreground italic">
                {t.courseDetail.curriculumSoon}
              </p>
            )}
          </section>

          {/* Tags */}
          {course.tags && course.tags.length > 0 && (
            <section>
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-3">
                / Skills
              </p>
              <h3 className="text-base font-medium tracking-tight text-foreground mb-3">
                {t.courseDetail.skillsYoullLearn}
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {course.tags.map((tag) => (
                  <Badge key={tag} variant="outline">
                    {tag}
                  </Badge>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>
    </SidebarLayout>
  );
}

/* ─── "What's included" Card ─────────────────────────────── */
function IncludeCard({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-card p-4">
      <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted text-muted-foreground shrink-0">
        {icon}
      </div>
      <div>
        <p className="font-mono text-base font-medium text-foreground tabular-nums tracking-tight">
          {value}
        </p>
        <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground mt-0.5">
          {label}
        </p>
      </div>
    </div>
  );
}

/* ─── Chapter Card ────────────────────────────────────────── */
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

  // Mono-tabular index ("01", "02", ...) for figure parity in the
  // chapter header.
  const indexLabel = String(index + 1).padStart(2, "0");

  return (
    <div className="rounded-xl border border-border/60 bg-card overflow-hidden transition-colors">
      {/* Chapter header */}
      <button
        className="flex w-full items-center gap-4 px-5 py-4 text-left hover:bg-muted/40 transition-colors"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
      >
        <span className="font-mono text-sm font-medium text-muted-foreground tabular-nums shrink-0">
          {indexLabel}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate tracking-tight">
            {module.title}
          </p>
          <p className="font-mono text-[11px] text-muted-foreground tabular-nums mt-0.5">
            {module.lessons.length} {t.courseDetail.lessons}
            {module.description && ` · ${module.description}`}
          </p>
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-muted-foreground shrink-0 transition-transform",
            expanded && "rotate-180"
          )}
        />
      </button>

      {/* Lessons */}
      {expanded && (
        <div className="border-t border-border/60">
          {module.lessons.map((lesson, lIdx) => {
            const canPlay = !isLocked || lesson.is_free;
            const lessonLink =
              canPlay && isAuthenticated
                ? `/courses/${courseSlug}/learn?lesson=${lesson.id}`
                : undefined;

            return (
              <div key={lesson.id}>
                {lIdx > 0 && (
                  <div className="mx-5 border-t border-border/40" />
                )}
                {lessonLink ? (
                  <Link
                    href={lessonLink}
                    className="flex items-center gap-4 px-5 py-3 hover:bg-muted/40 transition-colors group"
                  >
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted group-hover:bg-muted/70 transition-colors shrink-0">
                      <Play className="h-3 w-3 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground group-hover:text-foreground transition-colors truncate">
                        {lesson.title}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {lesson.is_free && (
                        <Badge variant="outline" className="text-[10px] h-4">
                          {t.courseDetail.free}
                        </Badge>
                      )}
                      {lesson.duration_minutes > 0 && (
                        <span className="font-mono text-[11px] text-muted-foreground tabular-nums">
                          {lesson.duration_minutes}m
                        </span>
                      )}
                    </div>
                  </Link>
                ) : (
                  <div className="flex items-center gap-4 px-5 py-3 opacity-50">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted shrink-0">
                      <Lock className="h-3 w-3 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-muted-foreground truncate">
                        {lesson.title}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {lesson.duration_minutes > 0 && (
                        <span className="font-mono text-[11px] text-muted-foreground tabular-nums">
                          {lesson.duration_minutes}m
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

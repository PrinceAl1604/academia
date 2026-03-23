"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DashboardSidebar } from "@/components/layout/dashboard-sidebar";
import { DashboardTopbar } from "@/components/layout/dashboard-topbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  ArrowLeft,
  BookOpen,
  Clock,
  FileText,
  HelpCircle,
  Play,
  Star,
  Users,
  CheckCircle,
  Lock,
  Video,
  Loader2,
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
  const [course, setCourse] = useState<(CourseRow & { modules: ModuleRow[] }) | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCourseBySlug(slug).then((data) => {
      setCourse(data);
      setLoading(false);
    });
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50/50">
        <DashboardSidebar />
        <div className="lg:pl-64">
          <DashboardTopbar />
          <div className="flex items-center justify-center py-32">
            <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
          </div>
        </div>
      </div>
    );
  }

  if (!course) {
    notFound();
  }

  const isEn = t.nav.signIn === "Sign In";
  const isLocked = !isPro && !course.is_free;
  const totalLessons = course.total_lessons ?? 0;
  const durationLabel = `${course.duration_hours ?? 0} hours`;

  const lessonIcon = (type: string) => {
    switch (type) {
      case "video":
        return <Video className="h-4 w-4 text-neutral-400" />;
      case "article":
        return <FileText className="h-4 w-4 text-neutral-400" />;
      case "quiz":
        return <HelpCircle className="h-4 w-4 text-neutral-400" />;
      default:
        return <Play className="h-4 w-4 text-neutral-400" />;
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50/50">
      <DashboardSidebar />
      <div className="lg:pl-64">
        <DashboardTopbar />

        <main className="mx-auto max-w-4xl px-6 py-8">
          {/* Back button */}
          <Link
            href="/"
            className="mb-6 inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            {t.nav.courses}
          </Link>

          {/* Course Header */}
          <div className="mb-8">
            <Badge variant="secondary" className="mb-3">
              {course.category?.name ?? "General"}
            </Badge>
            <h1 className="text-2xl font-bold text-neutral-900 sm:text-3xl">
              {course.title}
            </h1>
            {course.description && (
              <p className="mt-3 text-neutral-500 leading-relaxed max-w-2xl">
                {course.description}
              </p>
            )}

            {/* Stats row */}
            <div className="mt-5 flex flex-wrap items-center gap-5 text-sm text-neutral-500">
              {course.rating > 0 && (
                <span className="flex items-center gap-1.5">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  <span className="font-semibold text-neutral-900">
                    {course.rating}
                  </span>
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Users className="h-4 w-4" />
                {course.students_count.toLocaleString()} {t.courseDetail.students}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                {durationLabel}
              </span>
              <span className="flex items-center gap-1.5">
                <BookOpen className="h-4 w-4" />
                {totalLessons} {t.courseDetail.lessons}
              </span>
            </div>

            {/* Instructor */}
            {course.instructor && (
              <div className="mt-6 flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-neutral-200 text-xs font-medium text-neutral-700">
                    {course.instructor.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-semibold text-neutral-900">
                    {course.instructor.name}
                  </p>
                  {course.instructor.title && (
                    <p className="text-xs text-neutral-500">
                      {course.instructor.title}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          <Separator className="mb-8" />

          <div className="grid gap-8 lg:grid-cols-3">
            {/* Curriculum - left side */}
            <div className="lg:col-span-2">
              <h2 className="text-lg font-semibold text-neutral-900">
                {t.courseDetail.curriculum}
              </h2>
              <p className="mt-1 text-sm text-neutral-500">
                {course.modules.length} {isEn ? "chapters" : "chapitres"} · {totalLessons} {t.courseDetail.lessons} ·{" "}
                {durationLabel}
              </p>

              {course.modules.length > 0 ? (
                <Accordion
                  className="mt-5"
                  defaultValue={[course.modules[0]?.id]}
                >
                  {course.modules.map((module, idx) => (
                    <AccordionItem key={module.id} value={module.id}>
                      <AccordionTrigger className="text-left hover:no-underline">
                        <div className="flex-1">
                          <span className="text-sm font-semibold">
                            {isEn ? "Chapter" : "Chapitre"} {idx + 1}: {module.title}
                          </span>
                          <p className="mt-0.5 text-xs text-neutral-500">
                            {module.lessons.length} {t.courseDetail.lessons}
                            {module.description && ` · ${module.description}`}
                          </p>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <ul className="space-y-0.5">
                          {module.lessons.map((lesson) => {
                            const canPlay = !isLocked || lesson.is_free;
                            const lessonLink = canPlay && isAuthenticated
                              ? `/courses/${course.slug}/learn?lesson=${lesson.id}`
                              : undefined;

                            return (
                              <li key={lesson.id}>
                                {lessonLink ? (
                                  <Link
                                    href={lessonLink}
                                    className="flex items-center justify-between rounded-lg px-3 py-2.5 hover:bg-neutral-100/80 transition-colors"
                                  >
                                    <div className="flex items-center gap-3">
                                      <Play className="h-4 w-4 text-neutral-400" />
                                      <span className="text-sm text-neutral-700">
                                        {lesson.title}
                                      </span>
                                      {lesson.is_free && (
                                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                          {t.courseDetail.free}
                                        </Badge>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-neutral-400">
                                      {lesson.duration_minutes > 0 && <span>{lesson.duration_minutes}min</span>}
                                    </div>
                                  </Link>
                                ) : (
                                  <div className="flex items-center justify-between rounded-lg px-3 py-2.5 opacity-60">
                                    <div className="flex items-center gap-3">
                                      <Lock className="h-4 w-4 text-neutral-300" />
                                      <span className="text-sm text-neutral-500">
                                        {lesson.title}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-neutral-400">
                                      {lesson.duration_minutes > 0 && <span>{lesson.duration_minutes}min</span>}
                                      <Lock className="h-3 w-3" />
                                    </div>
                                  </div>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              ) : (
                <p className="mt-5 text-sm text-neutral-400">
                  {t.courseDetail.curriculum}...
                </p>
              )}

              {/* Tags */}
              {course.tags && course.tags.length > 0 && (
                <div className="mt-10">
                  <h3 className="text-sm font-semibold text-neutral-900">
                    {t.courseDetail.skillsYoullLearn}
                  </h3>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {course.tags.map((tag) => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="px-2.5 py-0.5 text-xs"
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar card */}
            <div>
              <div className="sticky top-24 rounded-xl border border-neutral-200 bg-white p-5">
                {(() => {
                  // Find first lesson with a YouTube URL for the preview
                  const firstVideo = course.modules
                    .flatMap((m) => m.lessons)
                    .find((l) => l.youtube_url);
                  const videoId = firstVideo?.youtube_url
                    ? extractYouTubeId(firstVideo.youtube_url)
                    : null;

                  return videoId ? (
                    <div className="aspect-video rounded-lg overflow-hidden mb-4 relative group cursor-pointer">
                      <img
                        src={`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`}
                        alt={course.title}
                        className="h-full w-full object-cover"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 shadow-md">
                          <Play className="h-5 w-5 text-neutral-900" fill="currentColor" />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="aspect-video rounded-lg bg-gradient-to-br from-neutral-100 to-neutral-200 mb-4">
                      <div className="flex h-full items-center justify-center">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 shadow-md">
                          <Play className="h-5 w-5 text-neutral-900" fill="currentColor" />
                        </div>
                      </div>
                    </div>
                  );
                })()}

                <p className="text-xs text-neutral-500 mb-3">
                  {isLocked
                    ? (t.nav.signIn === "Sign In" ? "Pro membership required" : "Abonnement Pro requis")
                    : t.courseDetail.includedInSub}
                </p>

                {isLocked ? (
                  <MembershipPopover>
                    <Button className="h-10 w-full gap-2 text-sm">
                      <Lock className="h-4 w-4" />
                      {t.nav.signIn === "Sign In" ? "Get Membership" : "S'abonner"}
                    </Button>
                  </MembershipPopover>
                ) : !isAuthenticated ? (
                  <Button
                    className="h-10 w-full text-sm"
                    render={<Link href="/sign-in" />}
                  >
                    {t.auth.signIn}
                  </Button>
                ) : (
                  <Button
                    className="h-10 w-full text-sm"
                    render={
                      <Link href={`/courses/${course.slug}/learn`} />
                    }
                  >
                    {t.courseDetail.startLearning}
                  </Button>
                )}
                <Button
                  variant="outline"
                  className="mt-2 h-10 w-full text-sm"
                >
                  {t.courseDetail.previewCourse}
                </Button>

                <Separator className="my-4" />

                <ul className="space-y-2.5 text-xs">
                  <li className="flex items-center gap-2 text-neutral-600">
                    <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                    {durationLabel} {t.courseDetail.ofContent}
                  </li>
                  <li className="flex items-center gap-2 text-neutral-600">
                    <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                    {totalLessons} {t.courseDetail.lessons}
                  </li>
                  <li className="flex items-center gap-2 text-neutral-600">
                    <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                    {t.courseDetail.certificateCompletion}
                  </li>
                  <li className="flex items-center gap-2 text-neutral-600">
                    <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                    {t.courseDetail.lifetimeAccess}
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

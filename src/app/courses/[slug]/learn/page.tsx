"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  BookOpen,
  Check,
  ChevronDown,
  ChevronUp,
  FileText,
  GraduationCap,
  HelpCircle,
  Lock,
  Loader2,
  Play,
  Video,
} from "lucide-react";
import { getCourseBySlug, type CourseRow, type ModuleRow, type LessonRow } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

/**
 * Extract YouTube video ID from various URL formats
 */
function getYouTubeId(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  return match?.[1] ?? null;
}

export default function CoursePlayerPage() {
  const params = useParams();
  const slug = params.slug as string;
  const { isPro, isAuthenticated } = useAuth();

  const [course, setCourse] = useState<(CourseRow & { modules: ModuleRow[] }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeLesson, setActiveLesson] = useState<LessonRow | null>(null);
  const [expandedModules, setExpandedModules] = useState<string[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(new Set());

  useEffect(() => {
    getCourseBySlug(slug).then((data) => {
      setCourse(data);
      if (data?.modules?.[0]?.lessons?.[0]) {
        setActiveLesson(data.modules[0].lessons[0]);
        setExpandedModules([data.modules[0].id]);
      }
      setLoading(false);
    });
  }, [slug]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p>Course not found</p>
      </div>
    );
  }

  const isLocked = !isPro && !course.is_free;

  if (!isAuthenticated) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-white p-8 text-center">
        <Lock className="h-12 w-12 text-neutral-300" />
        <h1 className="text-xl font-semibold text-neutral-900">
          Sign in to watch this course
        </h1>
        <p className="max-w-md text-neutral-500">
          Create a free account or sign in to start learning.
        </p>
        <Button className="mt-2 gap-2" render={<Link href="/sign-in" />}>
          Sign In
        </Button>
      </div>
    );
  }

  if (isLocked) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-white p-8 text-center">
        <Lock className="h-12 w-12 text-neutral-300" />
        <h1 className="text-xl font-semibold text-neutral-900">
          Pro membership required
        </h1>
        <p className="max-w-md text-neutral-500">
          Subscribe to unlock all courses — 15,000 FCFA/month.
        </p>
        <Button className="mt-2 gap-2" render={<Link href="/dashboard/subscription" />}>
          Subscribe Now
        </Button>
      </div>
    );
  }

  const allLessons = course.modules.flatMap((m) => m.lessons);
  const totalLessons = allLessons.length;
  const completedCount = completedLessons.size;
  const progress = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

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

  const markComplete = () => {
    if (!activeLesson) return;
    setCompletedLessons((prev) => new Set([...prev, activeLesson.id]));

    // Auto-advance to next lesson
    const currentIdx = allLessons.findIndex((l) => l.id === activeLesson.id);
    if (currentIdx < allLessons.length - 1) {
      const next = allLessons[currentIdx + 1];
      setActiveLesson(next);
      // Expand the module containing the next lesson
      const parentModule = course.modules.find((m) =>
        m.lessons.some((l) => l.id === next.id)
      );
      if (parentModule && !expandedModules.includes(parentModule.id)) {
        setExpandedModules((prev) => [...prev, parentModule.id]);
      }
    }
  };

  const lessonIcon = (type: string, isCompleted: boolean) => {
    if (isCompleted) return <Check className="h-4 w-4 text-green-600" />;
    switch (type) {
      case "video": return <Video className="h-4 w-4" />;
      case "article": return <FileText className="h-4 w-4" />;
      case "quiz": return <HelpCircle className="h-4 w-4" />;
      default: return <Play className="h-4 w-4" />;
    }
  };

  return (
    <div className="flex h-screen flex-col bg-white">
      {/* Top Bar */}
      <header className="flex h-14 items-center justify-between border-b px-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8" render={<Link href={`/courses/${slug}`} />}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-neutral-500" />
            <span className="text-sm font-medium line-clamp-1">
              {course.title}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden items-center gap-2 sm:flex">
            <Progress value={progress} className="h-1.5 w-24" />
            <span className="text-xs text-neutral-500">{progress}%</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <BookOpen className="mr-1.5 h-4 w-4" />
            Curriculum
          </Button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Video area */}
        <div className="flex flex-1 flex-col">
          {/* YouTube embed or placeholder */}
          <div className="aspect-video w-full bg-neutral-900">
            {youtubeId ? (
              <iframe
                src={`https://www.youtube.com/embed/${youtubeId}?rel=0&modestbranding=1`}
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title={activeLesson?.title}
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-white">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/10 backdrop-blur">
                  <Play className="h-7 w-7" fill="currentColor" />
                </div>
                <p className="text-sm text-neutral-400">
                  {activeLesson?.title ?? "Select a lesson"}
                </p>
                <p className="text-xs text-neutral-500">
                  No video URL set for this lesson
                </p>
              </div>
            )}
          </div>

          {/* Lesson info */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="mx-auto max-w-3xl">
              <Badge variant="secondary" className="mb-3">
                {activeLesson?.type}
              </Badge>
              <h1 className="text-2xl font-bold text-neutral-900">
                {activeLesson?.title}
              </h1>
              {activeLesson?.duration_minutes && activeLesson.duration_minutes > 0 && (
                <p className="mt-2 text-neutral-500">
                  Duration: {activeLesson.duration_minutes} min
                </p>
              )}

              <Separator className="my-6" />

              <Button
                className="gap-2"
                onClick={markComplete}
                disabled={activeLesson ? completedLessons.has(activeLesson.id) : true}
              >
                <Check className="h-4 w-4" />
                {activeLesson && completedLessons.has(activeLesson.id)
                  ? "Completed"
                  : "Mark as Complete"}
              </Button>
            </div>
          </div>
        </div>

        {/* Sidebar - Curriculum */}
        {sidebarOpen && (
          <aside className="hidden w-80 flex-shrink-0 border-l bg-neutral-50 md:block">
            <div className="border-b p-4">
              <h3 className="font-semibold text-neutral-900">Course Content</h3>
              <p className="mt-0.5 text-xs text-neutral-500">
                {completedCount}/{totalLessons} lessons completed
              </p>
              <Progress value={progress} className="mt-2 h-1.5" />
            </div>
            <ScrollArea className="h-[calc(100vh-14rem)]">
              {course.modules.map((module, idx) => (
                <div key={module.id}>
                  <button
                    className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-neutral-100"
                    onClick={() => toggleModule(module.id)}
                  >
                    <div>
                      <p className="text-xs font-medium uppercase text-neutral-400">
                        Module {idx + 1}
                      </p>
                      <p className="text-sm font-medium text-neutral-900">
                        {module.title}
                      </p>
                    </div>
                    {expandedModules.includes(module.id) ? (
                      <ChevronUp className="h-4 w-4 text-neutral-400" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-neutral-400" />
                    )}
                  </button>
                  {expandedModules.includes(module.id) && (
                    <div className="pb-2">
                      {module.lessons.map((lesson) => {
                        const isCompleted = completedLessons.has(lesson.id);
                        const isActive = lesson.id === activeLesson?.id;
                        return (
                          <button
                            key={lesson.id}
                            className={`flex w-full items-center gap-3 px-4 py-2 text-left text-sm transition-colors ${
                              isActive
                                ? "bg-neutral-200/70"
                                : "hover:bg-neutral-100"
                            }`}
                            onClick={() => setActiveLesson(lesson)}
                          >
                            <span
                              className={`flex-shrink-0 ${
                                isCompleted
                                  ? "text-green-600"
                                  : isActive
                                    ? "text-neutral-900"
                                    : "text-neutral-400"
                              }`}
                            >
                              {lessonIcon(lesson.type, isCompleted)}
                            </span>
                            <span
                              className={`flex-1 ${
                                isActive
                                  ? "font-medium text-neutral-900"
                                  : "text-neutral-600"
                              }`}
                            >
                              {lesson.title}
                            </span>
                            {lesson.duration_minutes > 0 && (
                              <span className="flex-shrink-0 text-xs text-neutral-400">
                                {lesson.duration_minutes}m
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </ScrollArea>
          </aside>
        )}
      </div>
    </div>
  );
}

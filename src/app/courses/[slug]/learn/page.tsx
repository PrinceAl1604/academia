"use client";

import { useState } from "react";
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
  MessageSquare,
  Play,
  Video,
} from "lucide-react";
import { courses, currentUser } from "@/data/mock";
import { useAuth } from "@/lib/auth-context";

export default function CoursePlayerPage() {
  const params = useParams();
  const slug = params.slug as string;
  const course = courses.find((c) => c.slug === slug);
  const { isPro, isAuthenticated } = useAuth();

  const [activeLesson, setActiveLesson] = useState(
    course?.curriculum[0]?.lessons[0]?.id ?? ""
  );
  const [expandedModules, setExpandedModules] = useState<string[]>(
    course?.curriculum[0] ? [course.curriculum[0].id] : []
  );
  const [sidebarOpen, setSidebarOpen] = useState(true);

  if (!course) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p>Course not found</p>
      </div>
    );
  }

  const isLocked = !isPro && !course.isFree;

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
          This course is part of the Pro plan. Upgrade your membership to unlock all courses.
        </p>
        <Button className="mt-2 gap-2" render={<Link href="/dashboard/subscription" />}>
          Get Membership
        </Button>
      </div>
    );
  }

  const totalLessons = course.curriculum.reduce(
    (acc, mod) => acc + mod.lessons.length,
    0
  );
  const completedCount = currentUser.completedLessons.filter((id) =>
    course.curriculum.some((m) => m.lessons.some((l) => l.id === id))
  ).length;
  const progress = Math.round((completedCount / totalLessons) * 100);

  const currentLessonData = course.curriculum
    .flatMap((m) => m.lessons)
    .find((l) => l.id === activeLesson);

  const toggleModule = (moduleId: string) => {
    setExpandedModules((prev) =>
      prev.includes(moduleId)
        ? prev.filter((id) => id !== moduleId)
        : [...prev, moduleId]
    );
  };

  const lessonIcon = (type: string, isCompleted: boolean) => {
    if (isCompleted) return <Check className="h-4 w-4 text-green-600" />;
    switch (type) {
      case "video":
        return <Video className="h-4 w-4" />;
      case "article":
        return <FileText className="h-4 w-4" />;
      case "quiz":
        return <HelpCircle className="h-4 w-4" />;
      default:
        return <Play className="h-4 w-4" />;
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
          {/* Video player placeholder */}
          <div className="aspect-video w-full bg-neutral-900">
            <div className="flex h-full flex-col items-center justify-center gap-3 text-white">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/10 backdrop-blur">
                <Play className="h-7 w-7" fill="currentColor" />
              </div>
              <p className="text-sm text-neutral-400">
                {currentLessonData?.title}
              </p>
            </div>
          </div>

          {/* Lesson info */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="mx-auto max-w-3xl">
              <Badge variant="secondary" className="mb-3">
                {currentLessonData?.type}
              </Badge>
              <h1 className="text-2xl font-bold text-neutral-900">
                {currentLessonData?.title}
              </h1>
              <p className="mt-2 text-neutral-500">
                Duration: {currentLessonData?.duration}
              </p>

              <Separator className="my-6" />

              <div className="flex gap-3">
                <Button className="gap-2">
                  <Check className="h-4 w-4" />
                  Mark as Complete
                </Button>
                <Button variant="outline" className="gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Discussion
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar - Curriculum */}
        {sidebarOpen && (
          <aside className="hidden w-80 flex-shrink-0 border-l bg-neutral-50 md:block">
            <div className="border-b p-4">
              <h3 className="font-semibold text-neutral-900">
                Course Content
              </h3>
              <p className="mt-0.5 text-xs text-neutral-500">
                {completedCount}/{totalLessons} lessons completed
              </p>
              <Progress value={progress} className="mt-2 h-1.5" />
            </div>
            <ScrollArea className="h-[calc(100vh-14rem)]">
              {course.curriculum.map((module, idx) => (
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
                        const isCompleted =
                          currentUser.completedLessons.includes(lesson.id);
                        const isActive = lesson.id === activeLesson;
                        return (
                          <button
                            key={lesson.id}
                            className={`flex w-full items-center gap-3 px-4 py-2 text-left text-sm transition-colors ${
                              isActive
                                ? "bg-neutral-200/70"
                                : "hover:bg-neutral-100"
                            }`}
                            onClick={() => setActiveLesson(lesson.id)}
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
                            <span className="flex-shrink-0 text-xs text-neutral-400">
                              {lesson.duration}
                            </span>
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

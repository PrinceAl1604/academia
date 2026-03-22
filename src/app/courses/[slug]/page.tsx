"use client";

import { use } from "react";
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
} from "lucide-react";
import { courses } from "@/data/mock";
import { useAuth } from "@/lib/auth-context";
import { LicenceModal } from "@/components/shared/licence-modal";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default function CourseDetailPage({ params }: PageProps) {
  const { slug } = use(params);
  const { isActivated, openLicenceModal } = useAuth();
  const course = courses.find((c) => c.slug === slug);

  if (!course) {
    notFound();
  }

  const isLocked = !isActivated && !course.isFree;

  const totalLessons = course.curriculum.reduce(
    (acc, mod) => acc + mod.lessons.length,
    0
  );

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
      <DashboardTopbar />

      <main className="lg:pl-64 pt-16 lg:pt-0">
        <div className="mx-auto max-w-4xl px-6 py-8">
          {/* Back button */}
          <Link
            href="/"
            className="mb-6 inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to courses
          </Link>

          {/* Course Header */}
          <div className="mb-8">
            <Badge variant="secondary" className="mb-3">
              {course.category}
            </Badge>
            <h1 className="text-2xl font-bold text-neutral-900 sm:text-3xl">
              {course.title}
            </h1>
            <p className="mt-3 text-neutral-500 leading-relaxed max-w-2xl">
              {course.description}
            </p>

            {/* Stats row */}
            <div className="mt-5 flex flex-wrap items-center gap-5 text-sm text-neutral-500">
              <span className="flex items-center gap-1.5">
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                <span className="font-semibold text-neutral-900">
                  {course.rating}
                </span>
                ({course.reviewsCount} reviews)
              </span>
              <span className="flex items-center gap-1.5">
                <Users className="h-4 w-4" />
                {course.studentsCount.toLocaleString()} students
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                {course.duration}
              </span>
              <span className="flex items-center gap-1.5">
                <BookOpen className="h-4 w-4" />
                {totalLessons} lessons
              </span>
            </div>

            {/* Instructor */}
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
                <p className="text-xs text-neutral-500">
                  {course.instructor.title}
                </p>
              </div>
            </div>
          </div>

          <Separator className="mb-8" />

          <div className="grid gap-8 lg:grid-cols-3">
            {/* Curriculum - left side */}
            <div className="lg:col-span-2">
              <h2 className="text-lg font-semibold text-neutral-900">
                Course Curriculum
              </h2>
              <p className="mt-1 text-sm text-neutral-500">
                {course.curriculum.length} modules · {totalLessons} lessons ·{" "}
                {course.duration}
              </p>

              <Accordion
                className="mt-5"
                defaultValue={[course.curriculum[0]?.id]}
              >
                {course.curriculum.map((module, idx) => (
                  <AccordionItem key={module.id} value={module.id}>
                    <AccordionTrigger className="text-left hover:no-underline">
                      <div className="flex-1">
                        <span className="text-sm font-semibold">
                          Module {idx + 1}: {module.title}
                        </span>
                        <p className="mt-0.5 text-xs text-neutral-500">
                          {module.lessons.length} lessons
                        </p>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <ul className="space-y-0.5">
                        {module.lessons.map((lesson) => (
                          <li
                            key={lesson.id}
                            className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-neutral-100/80"
                          >
                            <div className="flex items-center gap-3">
                              {lessonIcon(lesson.type)}
                              <span className="text-sm text-neutral-700">
                                {lesson.title}
                              </span>
                              {lesson.isFree && (
                                <Badge
                                  variant="secondary"
                                  className="text-[10px] px-1.5 py-0"
                                >
                                  Free
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-neutral-400">
                              <span>{lesson.duration}</span>
                              {!lesson.isFree && isLocked && (
                                <Lock className="h-3 w-3" />
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>

              {/* Tags */}
              <div className="mt-10">
                <h3 className="text-sm font-semibold text-neutral-900">
                  Skills you&apos;ll learn
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
            </div>

            {/* Sidebar card - right side */}
            <div>
              <div className="sticky top-24 rounded-xl border border-neutral-200 bg-white p-5">
                {/* Thumbnail */}
                <div className="aspect-video rounded-lg bg-gradient-to-br from-neutral-100 to-neutral-200 mb-4">
                  <div className="flex h-full items-center justify-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 shadow-md">
                      <Play
                        className="h-5 w-5 text-neutral-900"
                        fill="currentColor"
                      />
                    </div>
                  </div>
                </div>

                <p className="text-xs text-neutral-500 mb-3">
                  {isLocked
                    ? "Activate your licence to access"
                    : "Included in your subscription"}
                </p>

                {isLocked ? (
                  <Button
                    className="h-10 w-full gap-2 text-sm"
                    onClick={openLicenceModal}
                  >
                    <Lock className="h-4 w-4" />
                    Activate to Access
                  </Button>
                ) : (
                  <Button
                    className="h-10 w-full text-sm"
                    render={
                      <Link href={`/courses/${course.slug}/learn`} />
                    }
                  >
                    Start Learning
                  </Button>
                )}
                <Button
                  variant="outline"
                  className="mt-2 h-10 w-full text-sm"
                >
                  Preview Course
                </Button>

                <Separator className="my-4" />

                <ul className="space-y-2.5 text-xs">
                  <li className="flex items-center gap-2 text-neutral-600">
                    <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                    {course.duration} of content
                  </li>
                  <li className="flex items-center gap-2 text-neutral-600">
                    <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                    {totalLessons} lessons
                  </li>
                  <li className="flex items-center gap-2 text-neutral-600">
                    <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                    Certificate of completion
                  </li>
                  <li className="flex items-center gap-2 text-neutral-600">
                    <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                    Lifetime access
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </main>
      <LicenceModal />
    </div>
  );
}

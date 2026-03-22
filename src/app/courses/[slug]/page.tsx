"use client";

import { use } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
    <>
      <Navbar />
      <main className="min-h-screen">
        {/* Hero */}
        <div className="bg-neutral-900 text-white">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
            <div className="grid gap-12 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <Badge variant="secondary" className="mb-4">
                  {course.category}
                </Badge>
                <h1 className="text-3xl font-bold sm:text-4xl">
                  {course.title}
                </h1>
                <p className="mt-4 text-lg text-neutral-300">
                  {course.description}
                </p>

                {/* Stats */}
                <div className="mt-6 flex flex-wrap items-center gap-6 text-sm text-neutral-300">
                  <span className="flex items-center gap-1.5">
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                    <span className="font-semibold text-white">
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
                <div className="mt-8 flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="bg-neutral-700 text-sm font-medium text-white">
                      {course.instructor.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold">{course.instructor.name}</p>
                    <p className="text-sm text-neutral-400">
                      {course.instructor.title}
                    </p>
                  </div>
                </div>
              </div>

              {/* Enrollment Card */}
              <div className="lg:row-start-1 lg:col-start-3">
                <Card className="sticky top-24 overflow-hidden border-0 bg-white text-neutral-900">
                  <div className="aspect-video bg-gradient-to-br from-neutral-100 to-neutral-200">
                    <div className="flex h-full items-center justify-center">
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/90 shadow-lg">
                        <Play className="h-6 w-6 text-neutral-900" fill="currentColor" />
                      </div>
                    </div>
                  </div>
                  <div className="p-6">
                    <p className="text-sm text-neutral-500">
                      {isLocked ? "Activate your licence to access" : "Included in your subscription"}
                    </p>
                    {isLocked ? (
                      <Button
                        className="mt-4 h-12 w-full gap-2 text-base"
                        onClick={openLicenceModal}
                      >
                        <Lock className="h-4 w-4" />
                        Activate to Access
                      </Button>
                    ) : (
                      <Button className="mt-4 h-12 w-full text-base" render={<Link href={`/courses/${course.slug}/learn`} />}>
                        Start Learning
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      className="mt-3 h-12 w-full text-base"
                    >
                      Preview Course
                    </Button>

                    <Separator className="my-4" />

                    <ul className="space-y-3 text-sm">
                      <li className="flex items-center gap-2 text-neutral-600">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        {course.duration} of content
                      </li>
                      <li className="flex items-center gap-2 text-neutral-600">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        {totalLessons} lessons
                      </li>
                      <li className="flex items-center gap-2 text-neutral-600">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        Certificate of completion
                      </li>
                      <li className="flex items-center gap-2 text-neutral-600">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        Lifetime access
                      </li>
                    </ul>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        </div>

        {/* Curriculum */}
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="lg:max-w-2xl">
            <h2 className="text-2xl font-bold text-neutral-900">
              Course Curriculum
            </h2>
            <p className="mt-2 text-neutral-500">
              {course.curriculum.length} modules &middot; {totalLessons} lessons
              &middot; {course.duration}
            </p>

            <Accordion
              className="mt-8"
              defaultValue={[course.curriculum[0]?.id]}
            >
              {course.curriculum.map((module, idx) => (
                <AccordionItem key={module.id} value={module.id}>
                  <AccordionTrigger className="text-left hover:no-underline">
                    <div className="flex-1">
                      <span className="font-semibold">
                        Module {idx + 1}: {module.title}
                      </span>
                      <p className="mt-0.5 text-sm text-neutral-500">
                        {module.lessons.length} lessons
                      </p>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <ul className="space-y-1">
                      {module.lessons.map((lesson) => (
                        <li
                          key={lesson.id}
                          className="flex items-center justify-between rounded-lg px-3 py-2.5 hover:bg-neutral-50"
                        >
                          <div className="flex items-center gap-3">
                            {lessonIcon(lesson.type)}
                            <span className="text-sm text-neutral-700">
                              {lesson.title}
                            </span>
                            {lesson.isFree && (
                              <Badge variant="secondary" className="text-xs">
                                Free
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-neutral-400">
                            <span>{lesson.duration}</span>
                            {!lesson.isFree && <Lock className="h-3.5 w-3.5" />}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>

          {/* Tags */}
          <div className="mt-12 lg:max-w-2xl">
            <h3 className="text-lg font-semibold text-neutral-900">
              Skills you&apos;ll learn
            </h3>
            <div className="mt-4 flex flex-wrap gap-2">
              {course.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="px-3 py-1">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </main>
      <Footer />
      <LicenceModal />
    </>
  );
}

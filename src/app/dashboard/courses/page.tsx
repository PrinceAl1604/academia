"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, Clock, Play } from "lucide-react";
import { courses, currentUser } from "@/data/mock";
import { useLanguage } from "@/lib/i18n/language-context";

export default function MyCoursesPage() {
  const { t } = useLanguage();
  const enrolledCourses = courses.filter((c) =>
    currentUser.enrolledCourses.includes(c.id)
  );

  const getProgress = (courseId: string) => {
    const course = courses.find((c) => c.id === courseId);
    if (!course) return 0;
    const totalLessons = course.curriculum.reduce(
      (acc, mod) => acc + mod.lessons.length,
      0
    );
    const completedInCourse = course.curriculum.reduce(
      (acc, mod) =>
        acc +
        mod.lessons.filter((l) => currentUser.completedLessons.includes(l.id))
          .length,
      0
    );
    return Math.round((completedInCourse / totalLessons) * 100);
  };

  const inProgressCourses = enrolledCourses.filter(
    (c) => getProgress(c.id) > 0 && getProgress(c.id) < 100
  );
  const completedCourses = enrolledCourses.filter(
    (c) => getProgress(c.id) === 100
  );
  const notStartedCourses = enrolledCourses.filter(
    (c) => getProgress(c.id) === 0
  );

  const CourseRow = ({ course }: { course: (typeof courses)[0] }) => {
    const progress = getProgress(course.id);
    return (
      <Card className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
        <div className="flex h-16 w-24 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-neutral-100 to-neutral-200">
          <BookOpen className="h-6 w-6 text-neutral-300" />
        </div>
        <div className="flex-1">
          <Badge variant="secondary" className="mb-1 text-xs">
            {course.category}
          </Badge>
          <h3 className="font-semibold text-neutral-900">{course.title}</h3>
          <p className="mt-0.5 text-sm text-neutral-500">
            {course.instructor.name}
          </p>
          <div className="mt-2 flex items-center gap-4 text-xs text-neutral-400">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" /> {course.duration}
            </span>
            <span>{course.lessonsCount} lessons</span>
          </div>
        </div>
        <div className="flex items-center gap-4 sm:flex-col sm:items-end">
          <div className="text-right">
            <span className="text-sm font-medium text-neutral-700">
              {progress}%
            </span>
            <Progress value={progress} className="mt-1 h-1.5 w-24" />
          </div>
          <Button size="sm" variant="outline" className="gap-1.5" render={<Link href={`/courses/${course.slug}/learn`} />}>
            <Play className="h-3 w-3" />
            {progress > 0 ? t.dashboard.continue : t.myCourses.start}
          </Button>
        </div>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">{t.myCourses.title}</h1>
        <p className="mt-1 text-neutral-500">
          {t.myCourses.enrolledIn} {enrolledCourses.length} {t.myCourses.coursesLabel}
        </p>
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">{t.myCourses.all} ({enrolledCourses.length})</TabsTrigger>
          <TabsTrigger value="in-progress">
            {t.myCourses.inProgress} ({inProgressCourses.length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            {t.myCourses.completed} ({completedCourses.length})
          </TabsTrigger>
          <TabsTrigger value="not-started">
            {t.myCourses.notStarted} ({notStartedCourses.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6 space-y-3">
          {enrolledCourses.map((c) => (
            <CourseRow key={c.id} course={c} />
          ))}
        </TabsContent>
        <TabsContent value="in-progress" className="mt-6 space-y-3">
          {inProgressCourses.length > 0 ? (
            inProgressCourses.map((c) => <CourseRow key={c.id} course={c} />)
          ) : (
            <p className="py-10 text-center text-neutral-500">
              {t.myCourses.noInProgress}
            </p>
          )}
        </TabsContent>
        <TabsContent value="completed" className="mt-6 space-y-3">
          {completedCourses.length > 0 ? (
            completedCourses.map((c) => <CourseRow key={c.id} course={c} />)
          ) : (
            <p className="py-10 text-center text-neutral-500">
              {t.myCourses.noCompleted}
            </p>
          )}
        </TabsContent>
        <TabsContent value="not-started" className="mt-6 space-y-3">
          {notStartedCourses.length > 0 ? (
            notStartedCourses.map((c) => <CourseRow key={c.id} course={c} />)
          ) : (
            <p className="py-10 text-center text-neutral-500">
              {t.myCourses.allStarted}
            </p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

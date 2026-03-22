"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  ArrowRight,
  BookOpen,
  Clock,
  Flame,
  Play,
  Trophy,
} from "lucide-react";
import { courses, currentUser } from "@/data/mock";
import { useLanguage } from "@/lib/i18n/language-context";

export default function DashboardPage() {
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

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">
          {t.dashboard.welcomeBack}, {currentUser.name.split(" ")[0]}!
        </h1>
        <p className="mt-1 text-neutral-500">
          {t.dashboard.continueSubtitle}
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
              <BookOpen className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-neutral-900">
                {enrolledCourses.length}
              </p>
              <p className="text-sm text-neutral-500">{t.dashboard.enrolledCourses}</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50">
              <Play className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-neutral-900">
                {currentUser.completedLessons.length}
              </p>
              <p className="text-sm text-neutral-500">{t.dashboard.lessonsCompleted}</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50">
              <Flame className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-neutral-900">7</p>
              <p className="text-sm text-neutral-500">{t.dashboard.dayStreak}</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50">
              <Trophy className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-neutral-900">1</p>
              <p className="text-sm text-neutral-500">{t.dashboard.certificatesLabel}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Continue Learning */}
      <div>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-neutral-900">
            {t.dashboard.continueLearning}
          </h2>
          <Button variant="ghost" size="sm" className="gap-1" render={<Link href="/dashboard/courses" />}>
            {t.dashboard.viewAll}
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {enrolledCourses.map((course) => {
            const progress = getProgress(course.id);
            return (
              <Card key={course.id} className="overflow-hidden">
                <div className="aspect-video bg-gradient-to-br from-neutral-100 to-neutral-200">
                  <div className="flex h-full items-center justify-center">
                    <BookOpen className="h-8 w-8 text-neutral-300" />
                  </div>
                </div>
                <div className="p-4">
                  <Badge variant="secondary" className="mb-2 text-xs">
                    {course.category}
                  </Badge>
                  <h3 className="font-semibold text-neutral-900 line-clamp-1">
                    {course.title}
                  </h3>
                  <div className="mt-2 flex items-center gap-2">
                    <Avatar className="h-5 w-5">
                      <AvatarFallback className="bg-neutral-200 text-[8px]">
                        {course.instructor.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs text-neutral-500">
                      {course.instructor.name}
                    </span>
                  </div>
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-neutral-500">
                        {progress}% {t.dashboard.complete}
                      </span>
                      <span className="flex items-center gap-1 text-neutral-400">
                        <Clock className="h-3 w-3" />
                        {course.duration}
                      </span>
                    </div>
                    <Progress value={progress} className="mt-2 h-1.5" />
                  </div>
                  <Button
                    className="mt-4 h-9 w-full gap-2"
                    variant="outline"
                    render={<Link href={`/courses/${course.slug}/learn`} />}
                  >
                    <Play className="h-3.5 w-3.5" />
                    {t.dashboard.continue}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}

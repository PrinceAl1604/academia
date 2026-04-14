"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
  BookOpen,
  Play,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/i18n/language-context";
import { supabase } from "@/lib/supabase";
import { getCompletedLessons } from "@/lib/api";

interface EnrolledCourse {
  id: string;
  title: string;
  slug: string;
  total_lessons: number;
  duration_hours: number;
  category_name: string;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [enrolledCourses, setEnrolledCourses] = useState<EnrolledCourse[]>([]);
  const [completedCount, setCompletedCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!user) { setLoading(false); return; }

      // Get enrollments
      const { data: enrollments } = await supabase
        .from("enrollments")
        .select("course_id")
        .eq("user_id", user.id);

      if (enrollments && enrollments.length > 0) {
        const courseIds = enrollments.map((e) => e.course_id);
        const { data: courses } = await supabase
          .from("courses")
          .select("id, title, slug, total_lessons, duration_hours, category:categories(name)")
          .in("id", courseIds);

        setEnrolledCourses(
          (courses ?? []).map((c: Record<string, unknown>) => ({
            ...c,
            category_name: (c.category as Record<string, string>)?.name ?? "",
          })) as EnrolledCourse[]
        );
      }

      // Get completed lessons count
      const completed = await getCompletedLessons(user.id);
      setCompletedCount(completed.length);

      setLoading(false);
    }
    load();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const firstName = (user?.user_metadata?.full_name || user?.email?.split("@")[0] || "").split(" ")[0];

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          {t.dashboard.welcomeBack}, {firstName}!
        </h1>
        <p className="mt-1 text-muted-foreground">{t.dashboard.continueSubtitle}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100/70 dark:bg-blue-900/30 ring-1 ring-blue-200/60 dark:ring-blue-700/40">
              <BookOpen className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground tabular-nums">{enrolledCourses.length}</p>
              <p className="text-sm text-muted-foreground">{t.dashboard.enrolledCourses}</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/15">
              <Play className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground tabular-nums">{completedCount}</p>
              <p className="text-sm text-muted-foreground">{t.dashboard.lessonsCompleted}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Enrolled Courses */}
      <div>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">{t.dashboard.continueLearning}</h2>
          <Button variant="ghost" size="sm" className="gap-1" render={<Link href="/dashboard/courses" />}>
            {t.dashboard.viewAll}
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>

        {enrolledCourses.length === 0 ? (
          <Card className="mt-4 p-8 text-center">
            <BookOpen className="mx-auto h-10 w-10 text-muted-foreground/60" />
            <p className="mt-3 text-sm text-muted-foreground">
              {t.dashboard.noCourses}
            </p>
            <Button variant="outline" className="mt-4 gap-2" render={<Link href="/" />}>
              <BookOpen className="h-4 w-4" />
              {t.dashboard.browse}
            </Button>
          </Card>
        ) : (
          <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {enrolledCourses.map((course) => (
              <Card key={course.id} className="overflow-hidden transition-all hover:border-primary/30">
                <div className="aspect-video bg-muted">
                  <div className="flex h-full items-center justify-center">
                    <BookOpen className="h-8 w-8 text-muted-foreground/60" />
                  </div>
                </div>
                <div className="p-4">
                  <Badge variant="secondary" className="mb-2 text-xs">{course.category_name}</Badge>
                  <h3 className="font-semibold text-foreground line-clamp-1">{course.title}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {course.total_lessons} {t.courseDetail.lessons} · {course.duration_hours}h
                  </p>
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
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

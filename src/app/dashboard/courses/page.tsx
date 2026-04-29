"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Play, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/i18n/language-context";
import { supabase } from "@/lib/supabase";

interface EnrolledCourse {
  id: string;
  title: string;
  slug: string;
  total_lessons: number;
  duration_hours: number;
  category_name: string;
  level: string;
}

/**
 * My Courses — Cook-OS-flavored refresh.
 *
 * Same hero pattern as the rest of Phase 4: mono "/ My Courses"
 * preheader + tight headline + mono-tabular subtitle. Course cards
 * use the same outlined-mono category chip and mono-tabular metadata
 * row as the home/dashboard surfaces, so My Courses reads as part of
 * one design family rather than a sub-page with its own tone.
 */
export default function MyCoursesPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [courses, setCourses] = useState<EnrolledCourse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!user) { setLoading(false); return; }

      const { data: enrollments } = await supabase
        .from("enrollments")
        .select("course_id")
        .eq("user_id", user.id);

      if (enrollments && enrollments.length > 0) {
        const courseIds = enrollments.map((e) => e.course_id);
        const { data } = await supabase
          .from("courses")
          .select("id, title, slug, total_lessons, duration_hours, level, category:categories(name), modules(id, lessons(id, duration_minutes))")
          .in("id", courseIds);

        setCourses(
          (data ?? []).map((c: Record<string, unknown>) => {
            const modules = (c.modules as { lessons: { id: string; duration_minutes: number }[] }[]) ?? [];
            const allLessons = modules.flatMap((m) => m.lessons ?? []);
            const totalMinutes = allLessons.reduce((sum, l) => sum + (l.duration_minutes || 0), 0);
            return {
              ...c,
              total_lessons: allLessons.length,
              duration_hours: Math.round((totalMinutes / 60) * 10) / 10,
              category_name: (c.category as Record<string, string>)?.name ?? "",
            };
          }) as EnrolledCourse[]
        );
      }
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

  return (
    <div className="px-4 py-8 lg:px-8 lg:py-12 max-w-6xl mx-auto space-y-8">
      <header className="space-y-2">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          / My Courses
        </p>
        <h1 className="text-3xl sm:text-4xl font-medium tracking-tight text-foreground">
          {t.myCourses.title}
        </h1>
        <p className="font-mono text-[11px] text-muted-foreground tabular-nums">
          {t.myCourses.enrolledIn} {courses.length} {t.myCourses.coursesLabel}
        </p>
      </header>

      {courses.length === 0 ? (
        <Card className="p-12 text-center border-dashed">
          <BookOpen className="mx-auto h-8 w-8 text-muted-foreground/60" />
          <p className="mt-3 text-sm text-muted-foreground">
            {t.nav.signIn === "Sign In"
              ? "You haven't started any courses yet."
              : "Vous n'avez pas encore commencé de cours."}
          </p>
          <Button variant="outline" className="mt-5 gap-2" render={<Link href="/" />}>
            <BookOpen className="h-4 w-4" />
            {t.dashboard.browse}
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <Card key={course.id} className="overflow-hidden hover:border-border transition-colors">
              <div className="aspect-video bg-gradient-to-br from-muted to-muted/40 -mx-px -mt-px">
                <div className="flex h-full items-center justify-center">
                  <BookOpen className="h-7 w-7 text-muted-foreground/40" />
                </div>
              </div>
              <div className="px-4">
                <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                  <Badge variant="mono">{course.category_name || "General"}</Badge>
                  <Badge variant="mono">{course.level}</Badge>
                </div>
                <h3 className="font-medium text-foreground line-clamp-1 tracking-tight">
                  {course.title}
                </h3>
                <p className="mt-1 font-mono text-[11px] text-muted-foreground tabular-nums">
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
  );
}

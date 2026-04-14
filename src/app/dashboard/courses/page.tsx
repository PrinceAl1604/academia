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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t.myCourses.title}</h1>
        <p className="mt-1 text-muted-foreground">
          {t.myCourses.enrolledIn} {courses.length} {t.myCourses.coursesLabel}
        </p>
      </div>

      {courses.length === 0 ? (
        <Card className="p-8 text-center">
          <BookOpen className="mx-auto h-10 w-10 text-muted-foreground/60" />
          <p className="mt-3 text-muted-foreground">
            {t.nav.signIn === "Sign In"
              ? "You haven't started any courses yet."
              : "Vous n'avez pas encore commencé de cours."}
          </p>
          <Button variant="outline" className="mt-4 gap-2" render={<Link href="/" />}>
            {t.dashboard.browse}
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <Card key={course.id} className="overflow-hidden transition-all hover:border-primary/30">
              <div className="aspect-video bg-muted">
                <div className="flex h-full items-center justify-center">
                  <BookOpen className="h-8 w-8 text-muted-foreground/60" />
                </div>
              </div>
              <div className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="secondary" className="text-xs">{course.category_name}</Badge>
                  <Badge variant="secondary" className="text-xs">{course.level}</Badge>
                </div>
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
  );
}

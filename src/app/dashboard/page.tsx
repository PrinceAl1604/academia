"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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

/**
 * Student dashboard — Cook-OS-flavored refresh.
 *
 * Type hierarchy:
 *   • Mono uppercase preheader ("DASHBOARD") sets the page context
 *   • Big, tight greeting (text-3xl/text-4xl) — single confident
 *     headline rather than the previous bold-2xl + grey subtitle pair
 *   • Section headings: text-base medium with their own mono preheader
 *   • Stat numbers: font-mono tabular-nums for figure alignment
 *
 * All hardcoded `bg-white / text-neutral-*` migrated to semantic tokens.
 */
export default function DashboardPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [enrolledCourses, setEnrolledCourses] = useState<EnrolledCourse[]>([]);
  const [completedCount, setCompletedCount] = useState(0);
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
    <div className="px-4 py-8 lg:px-8 lg:py-12 max-w-6xl mx-auto space-y-10">
      {/* ── Hero greeting ─────────────────────────────────────── */}
      <header className="space-y-2">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          {/* Section preheader — matches sidebar group-label aesthetic */}
          {/* Falls back to "DASHBOARD" if no localization key exists */}
          / Dashboard
        </p>
        <h1 className="text-3xl sm:text-4xl font-medium tracking-tight text-foreground">
          {t.dashboard.welcomeBack}, {firstName}.
        </h1>
        <p className="text-muted-foreground text-base max-w-prose">
          {t.dashboard.continueSubtitle}
        </p>
      </header>

      {/* ── Stats row ─────────────────────────────────────────── */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard
          label={t.dashboard.enrolledCourses}
          value={enrolledCourses.length}
          icon={<BookOpen className="h-4 w-4" />}
        />
        <StatCard
          label={t.dashboard.lessonsCompleted}
          value={completedCount}
          icon={<Play className="h-4 w-4" />}
        />
      </section>

      {/* ── Enrolled courses ──────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-end justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-1">
              / In progress
            </p>
            <h2 className="text-xl font-medium tracking-tight text-foreground">
              {t.dashboard.continueLearning}
            </h2>
          </div>
          <Button variant="ghost" size="sm" className="gap-1" render={<Link href="/dashboard/courses" />}>
            {t.dashboard.viewAll}
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>

        {enrolledCourses.length === 0 ? (
          <Card className="p-12 text-center border-dashed">
            <BookOpen className="mx-auto h-8 w-8 text-muted-foreground/60" />
            <p className="mt-3 text-sm text-muted-foreground">
              {t.dashboard.noCourses}
            </p>
            <Button variant="outline" className="mt-5 gap-2" render={<Link href="/" />}>
              <BookOpen className="h-4 w-4" />
              {t.dashboard.browse}
            </Button>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {enrolledCourses.map((course) => (
              <Card key={course.id} className="overflow-hidden hover:border-border transition-colors">
                <div className="aspect-video bg-gradient-to-br from-muted to-muted/40 -mx-px -mt-px">
                  <div className="flex h-full items-center justify-center">
                    <BookOpen className="h-7 w-7 text-muted-foreground/40" />
                  </div>
                </div>
                <div className="px-4">
                  <Badge variant="mono" className="mb-2">{course.category_name || "General"}</Badge>
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
      </section>
    </div>
  );
}

/**
 * StatCard — Cook-OS-flavored stat readout.
 *
 * Anatomy: small mono-uppercase label up top, big tabular-nums figure
 * beneath, an icon tucked into the corner. The icon container is
 * `bg-muted` (not the previous tinted blue/green) so all stat cards
 * read as one visual family. Color-coded icon containers were creating
 * an unintentional "category" hierarchy that didn't actually mean
 * anything.
 */
function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <Card className="p-5 hover:border-border transition-colors">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            {label}
          </p>
          <p className="font-mono text-3xl font-medium text-foreground tabular-nums tracking-tight">
            {value}
          </p>
        </div>
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted text-muted-foreground">
          {icon}
        </div>
      </div>
    </Card>
  );
}

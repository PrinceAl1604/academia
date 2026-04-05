"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n/language-context";
import { supabase } from "@/lib/supabase";
import { syncAllCourseTotals } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Users,
  BookOpen,
  Crown,
  ArrowRight,
  Plus,
  BarChart3,
  Loader2,
  TrendingUp,
} from "lucide-react";

interface Stats {
  totalStudents: number;
  proStudents: number;
  totalCourses: number;
  publishedCourses: number;
  totalEnrollments: number;
  recentSignups: number;
}

export default function AdminDashboardPage() {
  const { t } = useLanguage();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      const [
        { count: totalStudents },
        { count: proStudents },
        { count: totalCourses },
        { count: publishedCourses },
        { count: totalEnrollments },
        { count: recentSignups },
      ] = await Promise.all([
        supabase.from("users").select("*", { count: "exact", head: true }).eq("role", "student"),
        supabase.from("users").select("*", { count: "exact", head: true }).eq("subscription_tier", "pro"),
        supabase.from("courses").select("*", { count: "exact", head: true }),
        supabase.from("courses").select("*", { count: "exact", head: true }).eq("is_published", true),
        supabase.from("enrollments").select("*", { count: "exact", head: true }),
        supabase.from("users").select("*", { count: "exact", head: true })
          .gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
      ]);

      setStats({
        totalStudents: totalStudents ?? 0,
        proStudents: proStudents ?? 0,
        totalCourses: totalCourses ?? 0,
        publishedCourses: publishedCourses ?? 0,
        totalEnrollments: totalEnrollments ?? 0,
        recentSignups: recentSignups ?? 0,
      });
      setLoading(false);

      // Sync all course totals in the background (fixes stale 0 values)
      syncAllCourseTotals();
    }
    loadStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
      </div>
    );
  }

  const statCards = [
    {
      label: t.admin.totalStudents,
      value: stats?.totalStudents ?? 0,
      icon: Users,
      color: "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400",
    },
    {
      label: t.admin.proSubscribers,
      value: stats?.proStudents ?? 0,
      icon: Crown,
      color: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
    },
    {
      label: t.admin.totalCourses,
      value: `${stats?.publishedCourses ?? 0} / ${stats?.totalCourses ?? 0}`,
      icon: BookOpen,
      color: "bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400",
      subtitle: t.admin.publishedSlashTotal,
    },
    {
      label: t.admin.newSignups30d,
      value: stats?.recentSignups ?? 0,
      icon: TrendingUp,
      color: "bg-green-50 text-green-600 dark:bg-green-500/10 dark:text-green-400",
    },
  ];

  const quickActions = [
    {
      label: t.admin.addCourse,
      description: t.admin.createNewCourse,
      href: "/admin/courses/new",
      icon: Plus,
      color: "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400",
    },
    {
      label: t.admin.manageCourses,
      description: t.admin.editOrDeleteCourses,
      href: "/admin/courses",
      icon: BookOpen,
      color: "bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400",
    },
    {
      label: t.admin.viewAnalytics,
      description: t.admin.detailedAnalytics,
      href: "/admin/analytics",
      icon: BarChart3,
      color: "bg-green-50 text-green-600 dark:bg-green-500/10 dark:text-green-400",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
          {t.admin.dashboard}
        </h1>
        <p className="mt-1 text-neutral-500">{t.admin.overview}</p>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="flex items-center gap-4">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-lg ${stat.color}`}
              >
                <stat.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-neutral-500">{stat.label}</p>
                <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                  {typeof stat.value === "number"
                    ? stat.value.toLocaleString()
                    : stat.value}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-neutral-900 dark:text-white">
          {t.admin.quickActions}
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {quickActions.map((action) => (
            <Card
              key={action.href}
              className="transition-shadow hover:shadow-md"
            >
              <CardContent className="flex flex-col gap-3">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-lg ${action.color}`}
                >
                  <action.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium text-neutral-900 dark:text-white">{action.label}</p>
                  <p className="mt-0.5 text-sm text-neutral-500">
                    {action.description}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  render={<Link href={action.href} />}
                  className="mt-auto w-fit gap-1.5"
                >
                  {action.label}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

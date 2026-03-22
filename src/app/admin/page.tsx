"use client";

import Link from "next/link";
import { useLanguage } from "@/lib/i18n/language-context";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { adminStats, activityFeed } from "@/data/admin-mock";
import {
  Users,
  BookOpen,
  KeyRound,
  DollarSign,
  ArrowRight,
  Plus,
  BarChart3,
  GraduationCap,
  CheckCircle,
  Key,
} from "lucide-react";

function formatTimestamp(timestamp: string) {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

  if (diffHours < 1) return "Just now";
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "Yesterday";
  return `${diffDays}d ago`;
}

const activityIcons = {
  enrollment: GraduationCap,
  completion: CheckCircle,
  licence_activated: Key,
  new_course: BookOpen,
};

export default function AdminDashboardPage() {
  const { t } = useLanguage();

  const stats = [
    {
      label: t.admin.totalStudents,
      value: adminStats.totalStudents.toLocaleString(),
      icon: Users,
      color: "bg-blue-50 text-blue-600",
    },
    {
      label: t.admin.totalCourses,
      value: adminStats.totalCourses,
      icon: BookOpen,
      color: "bg-purple-50 text-purple-600",
    },
    {
      label: t.admin.activeLicences,
      value: adminStats.activeLicences.toLocaleString(),
      icon: KeyRound,
      color: "bg-green-50 text-green-600",
    },
    {
      label: t.admin.revenue,
      value: `$${adminStats.revenue.toLocaleString()}`,
      icon: DollarSign,
      color: "bg-amber-50 text-amber-600",
    },
  ];

  const quickActions = [
    {
      label: t.admin.addCourse,
      description: "Create a new course for your students",
      href: "/admin/courses/new",
      icon: Plus,
      color: "bg-blue-50 text-blue-600",
    },
    {
      label: t.admin.generateKey,
      description: "Generate a new licence key",
      href: "/admin/licences",
      icon: KeyRound,
      color: "bg-green-50 text-green-600",
    },
    {
      label: t.admin.viewAnalytics,
      description: "View detailed platform analytics",
      href: "/admin/analytics",
      icon: BarChart3,
      color: "bg-purple-50 text-purple-600",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">
          {t.admin.dashboard}
        </h1>
        <p className="mt-1 text-neutral-500">{t.admin.overview}</p>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="flex items-center gap-4">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-lg ${stat.color}`}
              >
                <stat.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-neutral-500">{stat.label}</p>
                <p className="text-2xl font-bold text-neutral-900">
                  {stat.value}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-neutral-900">
          {t.admin.quickActions}
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {quickActions.map((action) => (
            <Card key={action.href} className="transition-shadow hover:shadow-md">
              <CardContent className="flex flex-col gap-3">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-lg ${action.color}`}
                >
                  <action.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium text-neutral-900">{action.label}</p>
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

      {/* Recent Activity */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-neutral-900">
          {t.admin.recentActivity}
        </h2>
        <Card>
          <CardContent className="divide-y">
            {activityFeed.map((entry) => {
              const Icon = activityIcons[entry.type];
              return (
                <div
                  key={entry.id}
                  className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-100">
                    <Icon className="h-4 w-4 text-neutral-600" />
                  </div>
                  <p className="flex-1 text-sm text-neutral-700">
                    {entry.message}
                  </p>
                  <span className="shrink-0 text-xs text-neutral-400">
                    {formatTimestamp(entry.timestamp)}
                  </span>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

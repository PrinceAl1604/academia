"use client";

import { useLanguage } from "@/lib/i18n/language-context";
import { adminStats, students } from "@/data/admin-mock";
import { courses } from "@/data/mock";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  TrendingUp,
  Clock,
  Users,
  CheckCircle,
  Star,
  BookOpen,
} from "lucide-react";

export default function AdminAnalyticsPage() {
  const { t } = useLanguage();

  const topStats = [
    {
      label: t.admin.completionRate,
      value: `${adminStats.completionRate}%`,
      icon: TrendingUp,
      color: "bg-green-50 text-green-600",
    },
    {
      label: t.admin.avgTime,
      value: adminStats.avgTimePerCourse,
      icon: Clock,
      color: "bg-blue-50 text-blue-600",
    },
    {
      label: t.admin.enrollments,
      value: adminStats.totalEnrollments.toLocaleString(),
      icon: Users,
      color: "bg-purple-50 text-purple-600",
    },
    {
      label: t.admin.completions,
      value: adminStats.totalCompletions.toLocaleString(),
      icon: CheckCircle,
      color: "bg-amber-50 text-amber-600",
    },
  ];

  const popularCourses = [...courses].sort(
    (a, b) => b.studentsCount - a.studentsCount
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">
          {t.admin.analyticsTitle}
        </h1>
      </div>

      {/* Top Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {topStats.map((stat) => (
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

      {/* Popular Courses */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-neutral-900">
          {t.admin.popularCourses}
        </h2>
        <Card>
          <CardContent className="divide-y">
            {popularCourses.map((course, index) => (
              <div
                key={course.id}
                className="flex items-center gap-4 py-3 first:pt-0 last:pb-0"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-sm font-medium text-neutral-600">
                  {index + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-neutral-900 truncate">
                    {course.title}
                  </p>
                  <div className="mt-0.5 flex items-center gap-3 text-sm text-neutral-500">
                    <span className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      {course.studentsCount.toLocaleString()} {t.admin.students}
                    </span>
                    <span className="flex items-center gap-1">
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                      {course.rating}
                    </span>
                  </div>
                </div>
                <Badge variant="secondary">{course.category}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Student Progress */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-neutral-900">
          {t.admin.studentProgress}
        </h2>
        <Card>
          <CardContent className="divide-y">
            {students.map((student) => {
              const completionPercent =
                student.enrolledCourses > 0
                  ? Math.round(
                      (student.completedCourses / student.enrolledCourses) * 100
                    )
                  : 0;

              return (
                <div
                  key={student.id}
                  className="flex items-center gap-4 py-3 first:pt-0 last:pb-0"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-200 text-sm font-medium">
                    {student.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-neutral-900">
                      {student.name}
                    </p>
                    <div className="mt-1 flex items-center gap-3 text-xs text-neutral-500">
                      <span>
                        <BookOpen className="mr-0.5 inline h-3 w-3" />
                        {student.enrolledCourses} enrolled
                      </span>
                      <span>
                        <CheckCircle className="mr-0.5 inline h-3 w-3" />
                        {student.completedCourses} completed
                      </span>
                      <span>Last active: {student.lastActive}</span>
                    </div>
                    <div className="mt-1.5 flex items-center gap-2">
                      <Progress value={completionPercent} className="h-1.5 flex-1" />
                      <span className="text-xs font-medium text-neutral-600">
                        {completionPercent}%
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

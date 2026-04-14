"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import {
  Users,
  Crown,
  TrendingUp,
  Loader2,
  Star,
  BookOpen,
} from "lucide-react";

interface CourseStats {
  id: string;
  title: string;
  students_count: number;
  rating: number;
  is_free: boolean;
  level: string;
  category_name: string;
  total_lessons: number;
}

interface UserStats {
  id: string;
  name: string;
  email: string;
  subscription_tier: string;
  created_at: string;
}

export default function AnalyticsPage() {
  const [courses, setCourses] = useState<CourseStats[]>([]);
  const [users, setUsers] = useState<UserStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"students" | "courses">("students");

  useEffect(() => {
    async function load() {
      const [{ data: coursesData }, { data: usersData }] = await Promise.all([
        supabase
          .from("courses")
          .select("id, title, students_count, rating, is_free, level, total_lessons, category:categories(name)")
          .order("students_count", { ascending: false }),
        supabase
          .from("users")
          .select("id, name, email, subscription_tier, created_at")
          .order("created_at", { ascending: false })
          .limit(50),
      ]);

      setCourses(
        (coursesData ?? []).map((c: Record<string, unknown>) => ({
          ...c,
          category_name: (c.category as Record<string, string>)?.name ?? "N/A",
        })) as CourseStats[]
      );
      setUsers((usersData ?? []) as UserStats[]);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const totalStudents = users.filter((u) => u.subscription_tier !== undefined).length;
  const proStudents = users.filter((u) => u.subscription_tier === "pro").length;
  const freeStudents = totalStudents - proStudents;
  const conversionRate = totalStudents > 0 ? Math.round((proStudents / totalStudents) * 100) : 0;
  const estimatedMRR = proStudents * 15000;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
        <p className="mt-1 text-muted-foreground">Platform performance and insights</p>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/15">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground/70">Est. MRR</p>
              <p className="text-2xl font-bold text-foreground tabular-nums">
                {estimatedMRR.toLocaleString()} <span className="text-sm font-normal text-muted-foreground">FCFA</span>
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100/70 dark:bg-amber-900/30 ring-1 ring-amber-200/60 dark:ring-amber-700/40">
              <Crown className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground/70">Pro Subscribers</p>
              <p className="text-2xl font-bold text-foreground tabular-nums">{proStudents}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100/70 dark:bg-blue-900/30 ring-1 ring-blue-200/60 dark:ring-blue-700/40">
              <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground/70">Total Students</p>
              <p className="text-2xl font-bold text-foreground tabular-nums">{totalStudents}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100/70 dark:bg-purple-900/30 ring-1 ring-purple-200/60 dark:ring-purple-700/40">
              <TrendingUp className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground/70">Conversion Rate</p>
              <p className="text-2xl font-bold text-foreground tabular-nums">{conversionRate}%</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-muted p-1 w-full sm:w-fit">
        <button
          onClick={() => setActiveTab("students")}
          className={`flex flex-1 sm:flex-none items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs sm:text-sm sm:px-4 font-medium transition-colors ${
            activeTab === "students"
              ? "bg-card text-foreground shadow-sm ring-1 ring-border"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Users className="h-4 w-4" />
          <span className="hidden sm:inline">Students Registered</span>
          <span className="sm:hidden">Students</span>
        </button>
        <button
          onClick={() => setActiveTab("courses")}
          className={`flex flex-1 sm:flex-none items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs sm:text-sm sm:px-4 font-medium transition-colors ${
            activeTab === "courses"
              ? "bg-card text-foreground shadow-sm ring-1 ring-border"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <BookOpen className="h-4 w-4" />
          <span className="hidden sm:inline">Course Performance</span>
          <span className="sm:hidden">Courses</span>
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "students" ? (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <div className="min-w-[600px]">
            {/* Header */}
            <div className="grid grid-cols-12 gap-4 border-b border-border px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground/70">
              <div className="col-span-4">Student</div>
              <div className="col-span-3">Email</div>
              <div className="col-span-2">Plan</div>
              <div className="col-span-3">Joined</div>
            </div>
            <div className="divide-y divide-border">
              {users.length === 0 ? (
                <p className="p-8 text-center text-muted-foreground">No students yet</p>
              ) : (
                users.map((user) => (
                  <div key={user.id} className="grid grid-cols-12 gap-4 px-4 py-3 items-center hover:bg-muted/40 transition-colors">
                    <div className="col-span-4 flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold">
                        {(user.name || "U").charAt(0).toUpperCase()}
                      </div>
                      <p className="text-sm font-medium text-foreground truncate">
                        {user.name || "Unknown"}
                      </p>
                    </div>
                    <div className="col-span-3">
                      <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                    </div>
                    <div className="col-span-2">
                      <Badge
                        variant="secondary"
                        className={user.subscription_tier === "pro" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" : "bg-muted text-muted-foreground"}
                      >
                        {user.subscription_tier === "pro" ? "Pro" : "Free"}
                      </Badge>
                    </div>
                    <div className="col-span-3 text-sm text-muted-foreground">
                      {new Date(user.created_at).toLocaleDateString()}
                    </div>
                  </div>
                ))
              )}
            </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <div className="min-w-[700px]">
            <div className="grid grid-cols-12 gap-4 border-b border-border px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground/70">
              <div className="col-span-1">#</div>
              <div className="col-span-4">Course</div>
              <div className="col-span-2">Category</div>
              <div className="col-span-1">Level</div>
              <div className="col-span-1">Lessons</div>
              <div className="col-span-1">Students</div>
              <div className="col-span-1">Rating</div>
              <div className="col-span-1">Type</div>
            </div>
            <div className="divide-y divide-border">
              {courses.map((course, idx) => (
                <div key={course.id} className="grid grid-cols-12 gap-4 px-4 py-3 items-center hover:bg-muted/40 transition-colors">
                  <div className="col-span-1">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
                      {idx + 1}
                    </span>
                  </div>
                  <div className="col-span-4">
                    <p className="text-sm font-medium text-foreground truncate">{course.title}</p>
                  </div>
                  <div className="col-span-2 text-sm text-muted-foreground">{course.category_name}</div>
                  <div className="col-span-1 text-xs text-muted-foreground">{course.level}</div>
                  <div className="col-span-1 text-sm text-muted-foreground">{course.total_lessons}</div>
                  <div className="col-span-1 flex items-center gap-1 text-sm text-muted-foreground">
                    <Users className="h-3 w-3" />
                    {course.students_count}
                  </div>
                  <div className="col-span-1">
                    {course.rating > 0 ? (
                      <div className="flex items-center gap-1 text-sm text-foreground">
                        <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                        {course.rating}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground/60">—</span>
                    )}
                  </div>
                  <div className="col-span-1">
                    <Badge variant="secondary" className={course.is_free ? "bg-blue-100 text-blue-700 text-xs dark:bg-blue-900/30 dark:text-blue-400" : "bg-amber-100 text-amber-700 text-xs dark:bg-amber-900/30 dark:text-amber-400"}>
                      {course.is_free ? "Free" : "Pro"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

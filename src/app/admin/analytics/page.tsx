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
} from "lucide-react";

interface CourseStats {
  id: string;
  title: string;
  students_count: number;
  rating: number;
  is_free: boolean;
  level: string;
  category_name: string;
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

  useEffect(() => {
    async function load() {
      const [{ data: coursesData }, { data: usersData }] = await Promise.all([
        supabase
          .from("courses")
          .select("id, title, students_count, rating, is_free, level, category:categories(name)")
          .order("students_count", { ascending: false }),
        supabase
          .from("users")
          .select("id, name, email, subscription_tier, created_at")
          .eq("role", "student")
          .order("created_at", { ascending: false })
          .limit(20),
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
        <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
      </div>
    );
  }

  const totalStudents = users.length;
  const proStudents = users.filter((u) => u.subscription_tier === "pro").length;
  const conversionRate = totalStudents > 0 ? Math.round((proStudents / totalStudents) * 100) : 0;
  const estimatedMRR = proStudents * 15000;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Analytics</h1>
        <p className="mt-1 text-neutral-500">Platform performance and insights</p>
      </div>

      {/* Revenue & Conversion */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50">
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-neutral-500">Est. MRR</p>
              <p className="text-2xl font-bold text-neutral-900">
                {estimatedMRR.toLocaleString()} <span className="text-sm font-normal text-neutral-400">FCFA</span>
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50">
              <Crown className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-neutral-500">Pro Subscribers</p>
              <p className="text-2xl font-bold text-neutral-900">{proStudents}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-neutral-500">Total Students</p>
              <p className="text-2xl font-bold text-neutral-900">{totalStudents}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50">
              <TrendingUp className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-neutral-500">Conversion Rate</p>
              <p className="text-2xl font-bold text-neutral-900">{conversionRate}%</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Courses by Popularity */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-neutral-900">Courses by Popularity</h2>
        <Card>
          <CardContent className="divide-y p-0">
            {courses.map((course, idx) => (
              <div key={course.id} className="flex items-center gap-4 px-4 py-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-neutral-100 text-xs font-bold text-neutral-600">
                  {idx + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-neutral-900 truncate">{course.title}</p>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-neutral-500">
                    <span>{course.category_name}</span>
                    <span>{course.level}</span>
                  </div>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  {course.is_free && (
                    <Badge variant="secondary" className="bg-blue-100 text-blue-700 text-xs">Free</Badge>
                  )}
                  <div className="flex items-center gap-1 text-sm text-neutral-500">
                    <Users className="h-3.5 w-3.5" />
                    {course.students_count.toLocaleString()}
                  </div>
                  {course.rating > 0 && (
                    <div className="flex items-center gap-1 text-sm text-neutral-500">
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                      {course.rating}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Recent Students */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-neutral-900">Recent Students</h2>
        <Card>
          <CardContent className="divide-y p-0">
            {users.length === 0 ? (
              <p className="p-4 text-sm text-neutral-500">No students yet</p>
            ) : (
              users.map((user) => (
                <div key={user.id} className="flex items-center gap-4 px-4 py-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-200 text-xs font-medium">
                    {(user.name || "U").charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-neutral-900 truncate">{user.name || "Unknown"}</p>
                    <p className="text-xs text-neutral-500 truncate">{user.email}</p>
                  </div>
                  <Badge variant="secondary" className={user.subscription_tier === "pro" ? "bg-amber-100 text-amber-700" : "bg-neutral-100 text-neutral-500"}>
                    {user.subscription_tier === "pro" ? "Pro" : "Free"}
                  </Badge>
                  <span className="text-xs text-neutral-400 shrink-0">
                    {new Date(user.created_at).toLocaleDateString()}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

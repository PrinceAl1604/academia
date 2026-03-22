"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n/language-context";
import { getAllCourses, deleteCourse, type CourseRow } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Star,
  Users,
  Loader2,
  Eye,
  EyeOff,
} from "lucide-react";

export default function AdminCoursesPage() {
  const { t } = useLanguage();
  const [search, setSearch] = useState("");
  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  const loadCourses = useCallback(async () => {
    const data = await getAllCourses();
    setCourses(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"? This cannot be undone.`)) {
      return;
    }
    setDeleting(id);
    try {
      await deleteCourse(id);
      setCourses((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      alert("Failed to delete course. It may have modules or enrollments linked to it.");
    }
    setDeleting(null);
  };

  const filteredCourses = courses.filter(
    (course) =>
      course.title.toLowerCase().includes(search.toLowerCase()) ||
      (course.category?.name ?? "").toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">
            {t.admin.manageCourses}
          </h1>
          <p className="mt-1 text-neutral-500">
            {courses.length} {t.admin.courses}
          </p>
        </div>
        <Button
          render={<Link href="/admin/courses/new" />}
          className="gap-1.5"
        >
          <Plus className="h-4 w-4" />
          {t.admin.addCourse}
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
        <Input
          placeholder={t.admin.searchCourses}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Course List */}
      <div className="space-y-3">
        {filteredCourses.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-neutral-500">
              {t.admin.noResults}
            </CardContent>
          </Card>
        ) : (
          filteredCourses.map((course) => (
            <Card key={course.id}>
              <CardContent className="flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-neutral-900 truncate">
                      {course.title}
                    </h3>
                    {course.is_published ? (
                      <Badge
                        variant="secondary"
                        className="shrink-0 bg-green-100 text-green-700"
                      >
                        <Eye className="mr-1 h-3 w-3" />
                        {t.admin.published}
                      </Badge>
                    ) : (
                      <Badge
                        variant="secondary"
                        className="shrink-0 bg-neutral-100 text-neutral-500"
                      >
                        <EyeOff className="mr-1 h-3 w-3" />
                        Draft
                      </Badge>
                    )}
                    {course.is_free && (
                      <Badge
                        variant="secondary"
                        className="shrink-0 bg-blue-100 text-blue-700"
                      >
                        Free
                      </Badge>
                    )}
                  </div>
                  <div className="mt-1.5 flex items-center gap-4 text-sm text-neutral-500">
                    <span>{course.category?.name ?? "No category"}</span>
                    <span>{course.level}</span>
                    <span className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      {course.students_count.toLocaleString()}
                    </span>
                    {course.rating > 0 && (
                      <span className="flex items-center gap-1">
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                        {course.rating}
                      </span>
                    )}
                    <span>{course.duration_hours}h · {course.total_lessons} lessons</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    render={<Link href={`/admin/courses/${course.id}/edit`} />}
                    className="gap-1.5"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    {t.admin.edit}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="gap-1.5"
                    disabled={deleting === course.id}
                    onClick={() => handleDelete(course.id, course.title)}
                  >
                    {deleting === course.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                    {t.admin.delete}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

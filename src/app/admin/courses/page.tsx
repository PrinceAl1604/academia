"use client";

import { useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n/language-context";
import { courses } from "@/data/mock";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Pencil, Trash2, Star, Users } from "lucide-react";

export default function AdminCoursesPage() {
  const { t } = useLanguage();
  const [search, setSearch] = useState("");

  const filteredCourses = courses.filter(
    (course) =>
      course.title.toLowerCase().includes(search.toLowerCase()) ||
      course.category.toLowerCase().includes(search.toLowerCase())
  );

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
        <Button render={<Link href="/admin/courses/new" />} className="gap-1.5">
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
                    <Badge variant="secondary" className="shrink-0 bg-green-100 text-green-700">
                      {t.admin.published}
                    </Badge>
                  </div>
                  <div className="mt-1.5 flex items-center gap-4 text-sm text-neutral-500">
                    <span>{course.category}</span>
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
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    render={<Link href={`/admin/courses/new?edit=${course.id}`} />}
                    className="gap-1.5"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    {t.admin.edit}
                  </Button>
                  <Button variant="destructive" size="sm" className="gap-1.5">
                    <Trash2 className="h-3.5 w-3.5" />
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

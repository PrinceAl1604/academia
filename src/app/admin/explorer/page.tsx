"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Eye,
  EyeOff,
  Pencil,
  Clock,
  BookOpen,
  Lock,
  Loader2,
  ExternalLink,
  GripVertical,
  ChevronUp,
  ChevronDown,
  Star,
  StarOff,
  Save,
  Check,
  RotateCcw,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/lib/i18n/language-context";
import { cn } from "@/lib/utils";

interface Course {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  cover_url: string | null;
  level: string;
  duration_hours: number;
  total_lessons: number;
  is_free: boolean;
  is_published: boolean;
  is_featured: boolean;
  sort_order: number;
  category_id: string | null;
  category: { name: string } | null;
}

interface Category {
  id: string;
  name: string;
  sort_order: number;
}

export default function AdminExplorerPage() {
  const { t } = useLanguage();
  const isEn = t.nav.signIn === "Sign In";
  const [courses, setCourses] = useState<Course[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [{ data: coursesData }, { data: categoriesData }] = await Promise.all([
      supabase
        .from("courses")
        .select("id, title, slug, description, cover_url, level, duration_hours, total_lessons, is_free, is_published, is_featured, sort_order, category_id, category:categories(name)")
        .order("sort_order"),
      supabase.from("categories").select("id, name, sort_order").order("sort_order"),
    ]);
    setCourses((coursesData as unknown as Course[]) || []);
    setCategories(categoriesData || []);
    setLoading(false);
  };

  // ─── Category reordering ─────────────────────────────────────────
  const moveCategoryUp = (index: number) => {
    if (index === 0) return;
    const updated = [...categories];
    [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
    updated.forEach((cat, i) => (cat.sort_order = i));
    setCategories(updated);
    setHasChanges(true);
  };

  const moveCategoryDown = (index: number) => {
    if (index === categories.length - 1) return;
    const updated = [...categories];
    [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
    updated.forEach((cat, i) => (cat.sort_order = i));
    setCategories(updated);
    setHasChanges(true);
  };

  // ─── Course reordering within category ────────────────────────────
  const getCoursesForCategory = (categoryName: string | null) => {
    return courses
      .filter((c) =>
        categoryName === null
          ? !c.category?.name
          : c.category?.name === categoryName
      )
      .sort((a, b) => a.sort_order - b.sort_order);
  };

  const moveCourseUp = (courseId: string, categoryName: string | null) => {
    const catCourses = getCoursesForCategory(categoryName);
    const idx = catCourses.findIndex((c) => c.id === courseId);
    if (idx <= 0) return;

    const updated = [...courses];
    const courseA = updated.find((c) => c.id === catCourses[idx].id)!;
    const courseB = updated.find((c) => c.id === catCourses[idx - 1].id)!;
    const tempOrder = courseA.sort_order;
    courseA.sort_order = courseB.sort_order;
    courseB.sort_order = tempOrder;

    setCourses(updated);
    setHasChanges(true);
  };

  const moveCourseDown = (courseId: string, categoryName: string | null) => {
    const catCourses = getCoursesForCategory(categoryName);
    const idx = catCourses.findIndex((c) => c.id === courseId);
    if (idx >= catCourses.length - 1) return;

    const updated = [...courses];
    const courseA = updated.find((c) => c.id === catCourses[idx].id)!;
    const courseB = updated.find((c) => c.id === catCourses[idx + 1].id)!;
    const tempOrder = courseA.sort_order;
    courseA.sort_order = courseB.sort_order;
    courseB.sort_order = tempOrder;

    setCourses(updated);
    setHasChanges(true);
  };

  // ─── Toggle featured ──────────────────────────────────────────────
  const toggleFeatured = (courseId: string) => {
    setCourses((prev) =>
      prev.map((c) =>
        c.id === courseId ? { ...c, is_featured: !c.is_featured } : c
      )
    );
    setHasChanges(true);
  };

  // ─── Toggle published ─────────────────────────────────────────────
  const togglePublished = (courseId: string) => {
    setCourses((prev) =>
      prev.map((c) =>
        c.id === courseId ? { ...c, is_published: !c.is_published } : c
      )
    );
    setHasChanges(true);
  };

  // ─── Save all changes ─────────────────────────────────────────────
  const saveLayout = async () => {
    setSaving(true);

    // Save category order
    for (const cat of categories) {
      await supabase
        .from("categories")
        .update({ sort_order: cat.sort_order })
        .eq("id", cat.id);
    }

    // Save course order + featured + published
    for (const course of courses) {
      await supabase
        .from("courses")
        .update({
          sort_order: course.sort_order,
          is_featured: course.is_featured,
          is_published: course.is_published,
        })
        .eq("id", course.id);
    }

    setSaving(false);
    setSaved(true);
    setHasChanges(false);
    setTimeout(() => setSaved(false), 3000);
  };

  // ─── Reset changes ────────────────────────────────────────────────
  const resetChanges = () => {
    setLoading(true);
    setHasChanges(false);
    loadData();
  };

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
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
            {isEn ? "Explorer — Layout Editor" : "Explorateur — Éditeur de mise en page"}
          </h1>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            {isEn
              ? "Arrange courses and categories. Changes apply to the student Browse page."
              : "Arrangez les cours et catégories. Les modifications s'appliquent à la page Parcourir des étudiants."}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {hasChanges && (
            <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={resetChanges}>
              <RotateCcw className="h-3 w-3" />
              {isEn ? "Reset" : "Réinitialiser"}
            </Button>
          )}
          <Button
            size="sm"
            className="gap-1.5"
            onClick={saveLayout}
            disabled={saving || !hasChanges}
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : saved ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            {saved ? (isEn ? "Saved!" : "Enregistré !") : (isEn ? "Save Layout" : "Enregistrer")}
          </Button>
        </div>
      </div>

      {/* Unsaved changes banner */}
      {hasChanges && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
          {isEn
            ? "You have unsaved changes. Click \"Save Layout\" to apply them to the student site."
            : "Vous avez des modifications non enregistrées. Cliquez sur \"Enregistrer\" pour les appliquer."}
        </div>
      )}

      {/* Categories + Courses */}
      <div className="space-y-8">
        {categories.map((category, catIdx) => {
          const catCourses = getCoursesForCategory(category.name);

          return (
            <div key={category.id} className="space-y-3">
              {/* Category header with reorder controls */}
              <div className="flex items-center gap-3 group">
                <div className="flex flex-col">
                  <button
                    onClick={() => moveCategoryUp(catIdx)}
                    disabled={catIdx === 0}
                    className="p-0.5 text-neutral-300 hover:text-neutral-600 disabled:opacity-30 dark:text-neutral-600 dark:hover:text-neutral-300"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => moveCategoryDown(catIdx)}
                    disabled={catIdx === categories.length - 1}
                    className="p-0.5 text-neutral-300 hover:text-neutral-600 disabled:opacity-30 dark:text-neutral-600 dark:hover:text-neutral-300"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                </div>
                <GripVertical className="h-4 w-4 text-neutral-300 dark:text-neutral-600" />
                <div className="flex-1">
                  <h2 className="text-lg font-bold text-neutral-900 dark:text-white">
                    {category.name}
                  </h2>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    {catCourses.length} {catCourses.length === 1 ? (isEn ? "course" : "cours") : (isEn ? "courses" : "cours")}
                    {" · "}{isEn ? "Position" : "Position"} {catIdx + 1}
                  </p>
                </div>
              </div>

              {/* Course cards in this category */}
              {catCourses.length === 0 ? (
                <div className="rounded-lg border-2 border-dashed border-neutral-200 dark:border-neutral-700 py-8 text-center">
                  <p className="text-sm text-neutral-400">
                    {isEn ? "No courses in this category" : "Aucun cours dans cette catégorie"}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {catCourses.map((course, courseIdx) => (
                    <Card
                      key={course.id}
                      className={cn(
                        "flex items-center gap-4 p-3 transition-all dark:bg-neutral-900 dark:border-neutral-800",
                        !course.is_published && "opacity-50 border-dashed",
                        course.is_featured && "ring-1 ring-amber-400 dark:ring-amber-500"
                      )}
                    >
                      {/* Reorder */}
                      <div className="flex flex-col shrink-0">
                        <button
                          onClick={() => moveCourseUp(course.id, category.name)}
                          disabled={courseIdx === 0}
                          className="p-0.5 text-neutral-300 hover:text-neutral-600 disabled:opacity-30 dark:text-neutral-600 dark:hover:text-neutral-300"
                        >
                          <ChevronUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => moveCourseDown(course.id, category.name)}
                          disabled={courseIdx === catCourses.length - 1}
                          className="p-0.5 text-neutral-300 hover:text-neutral-600 disabled:opacity-30 dark:text-neutral-600 dark:hover:text-neutral-300"
                        >
                          <ChevronDown className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {/* Thumbnail */}
                      <div className="h-14 w-24 rounded-lg overflow-hidden bg-neutral-100 dark:bg-neutral-800 shrink-0">
                        {course.cover_url ? (
                          <img src={course.cover_url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full items-center justify-center">
                            <BookOpen className="h-4 w-4 text-neutral-300 dark:text-neutral-600" />
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-neutral-900 dark:text-white truncate">
                            {course.title}
                          </p>
                          {course.is_featured && (
                            <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500 shrink-0" />
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-neutral-400">{course.level}</span>
                          <span className="text-xs text-neutral-300 dark:text-neutral-600">·</span>
                          <span className="text-xs text-neutral-400 flex items-center gap-1">
                            <Clock className="h-2.5 w-2.5" />{course.duration_hours}h
                          </span>
                          <span className="text-xs text-neutral-300 dark:text-neutral-600">·</span>
                          <span className="text-xs text-neutral-400 flex items-center gap-1">
                            <BookOpen className="h-2.5 w-2.5" />{course.total_lessons}
                          </span>
                          {course.is_free && (
                            <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-[10px] h-4">
                              Free
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => toggleFeatured(course.id)}
                          className={cn(
                            "p-1.5 rounded-md transition-colors",
                            course.is_featured
                              ? "text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                              : "text-neutral-300 hover:text-amber-500 hover:bg-neutral-50 dark:text-neutral-600 dark:hover:bg-neutral-800"
                          )}
                          title={isEn ? "Toggle featured" : "Mettre en avant"}
                        >
                          {course.is_featured ? (
                            <Star className="h-4 w-4 fill-current" />
                          ) : (
                            <StarOff className="h-4 w-4" />
                          )}
                        </button>
                        <button
                          onClick={() => togglePublished(course.id)}
                          className={cn(
                            "p-1.5 rounded-md transition-colors",
                            course.is_published
                              ? "text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20"
                              : "text-neutral-300 hover:text-green-500 hover:bg-neutral-50 dark:text-neutral-600 dark:hover:bg-neutral-800"
                          )}
                          title={course.is_published ? (isEn ? "Unpublish" : "Dépublier") : (isEn ? "Publish" : "Publier")}
                        >
                          {course.is_published ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                        </button>
                        <Link
                          href={`/admin/courses/${course.id}/edit`}
                          className="p-1.5 rounded-md text-neutral-400 hover:text-neutral-600 hover:bg-neutral-50 dark:hover:bg-neutral-800 dark:hover:text-neutral-300"
                        >
                          <Pencil className="h-4 w-4" />
                        </Link>
                        <Link
                          href={`/courses/${course.slug}`}
                          className="p-1.5 rounded-md text-neutral-400 hover:text-neutral-600 hover:bg-neutral-50 dark:hover:bg-neutral-800 dark:hover:text-neutral-300"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Link>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* Uncategorized courses */}
        {(() => {
          const uncategorized = courses.filter((c) => !c.category?.name);
          if (uncategorized.length === 0) return null;
          return (
            <div className="space-y-3">
              <h2 className="text-lg font-bold text-neutral-500 dark:text-neutral-400">
                {isEn ? "Uncategorized" : "Sans catégorie"}
              </h2>
              <div className="space-y-2">
                {uncategorized.map((course) => (
                  <Card key={course.id} className="flex items-center gap-4 p-3 border-dashed dark:bg-neutral-900 dark:border-neutral-700">
                    <div className="h-14 w-24 rounded-lg overflow-hidden bg-neutral-100 dark:bg-neutral-800 shrink-0">
                      {course.cover_url ? (
                        <img src={course.cover_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <BookOpen className="h-4 w-4 text-neutral-300" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-neutral-900 dark:text-white truncate">{course.title}</p>
                      <p className="text-xs text-amber-500">{isEn ? "Assign a category" : "Assigner une catégorie"}</p>
                    </div>
                    <Link
                      href={`/admin/courses/${course.id}/edit`}
                      className="p-1.5 rounded-md text-neutral-400 hover:text-neutral-600 hover:bg-neutral-50 dark:hover:bg-neutral-800"
                    >
                      <Pencil className="h-4 w-4" />
                    </Link>
                  </Card>
                ))}
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}

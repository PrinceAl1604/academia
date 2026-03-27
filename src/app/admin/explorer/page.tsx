"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Eye,
  EyeOff,
  Pencil,
  Clock,
  BookOpen,
  Lock,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/lib/i18n/language-context";

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
  created_at: string;
  category: { name: string } | null;
}

interface Category {
  id: string;
  name: string;
}

export default function AdminExplorerPage() {
  const { t } = useLanguage();
  const isEn = t.nav.signIn === "Sign In";
  const [courses, setCourses] = useState<Course[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [showUnpublished, setShowUnpublished] = useState(true);

  useEffect(() => {
    async function load() {
      const [{ data: coursesData }, { data: categoriesData }] = await Promise.all([
        supabase
          .from("courses")
          .select("id, title, slug, description, cover_url, level, duration_hours, total_lessons, is_free, is_published, created_at, category:categories(name)")
          .order("created_at", { ascending: false }),
        supabase.from("categories").select("id, name").order("name"),
      ]);
      setCourses((coursesData as unknown as Course[]) || []);
      setCategories(categoriesData || []);
      setLoading(false);
    }
    load();
  }, []);

  const filtered = useMemo(() => {
    let result = courses;
    if (!showUnpublished) {
      result = result.filter((c) => c.is_published);
    }
    if (selectedCategory !== "All") {
      result = result.filter((c) => c.category?.name === selectedCategory);
    }
    return result;
  }, [courses, selectedCategory, showUnpublished]);

  const coursesByCategory = useMemo(() => {
    const grouped: Record<string, Course[]> = {};
    const catNames = categories.map((c) => c.name);

    for (const cat of catNames) {
      const catCourses = filtered.filter((c) => c.category?.name === cat);
      if (catCourses.length > 0) grouped[cat] = catCourses;
    }

    const uncategorized = filtered.filter((c) => !c.category?.name);
    if (uncategorized.length > 0) {
      grouped[isEn ? "Uncategorized" : "Sans catégorie"] = uncategorized;
    }

    return grouped;
  }, [filtered, categories, isEn]);

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
            {isEn ? "Explorer" : "Explorateur"}
          </h1>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            {isEn
              ? "Preview how students see your courses"
              : "Prévisualisez comment les étudiants voient vos cours"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={showUnpublished ? "default" : "outline"}
            size="sm"
            className="gap-1.5 text-xs"
            onClick={() => setShowUnpublished(!showUnpublished)}
          >
            {showUnpublished ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
            {isEn
              ? showUnpublished ? "Showing all" : "Published only"
              : showUnpublished ? "Tout afficher" : "Publiés uniquement"}
          </Button>
        </div>
      </div>

      {/* Category filter pills */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedCategory("All")}
          className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
            selectedCategory === "All"
              ? "border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900"
              : "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
          }`}
        >
          {isEn ? "All" : "Tous"} ({courses.length})
        </button>
        {categories.map((cat) => {
          const count = courses.filter((c) => c.category?.name === cat.name).length;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.name)}
              className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                selectedCategory === cat.name
                  ? "border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900"
                  : "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
              }`}
            >
              {cat.name} ({count})
            </button>
          );
        })}
      </div>

      {/* Courses by category */}
      {Object.entries(coursesByCategory).length === 0 ? (
        <div className="py-20 text-center">
          <BookOpen className="mx-auto h-10 w-10 text-neutral-300 dark:text-neutral-600" />
          <p className="mt-3 text-neutral-500 dark:text-neutral-400">
            {isEn ? "No courses found" : "Aucun cours trouvé"}
          </p>
        </div>
      ) : (
        Object.entries(coursesByCategory).map(([category, categoryCourses]) => (
          <div key={category} className="space-y-4">
            <div>
              <h2 className="text-xl font-bold text-neutral-900 dark:text-white">
                {category}
              </h2>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                {categoryCourses.length} {categoryCourses.length === 1 ? (isEn ? "course" : "cours") : (isEn ? "courses" : "cours")}
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {categoryCourses.map((course) => (
                <div
                  key={course.id}
                  className={`group relative rounded-xl border overflow-hidden transition-all hover:shadow-md ${
                    !course.is_published
                      ? "border-dashed border-neutral-300 dark:border-neutral-600 opacity-70"
                      : "border-neutral-200 dark:border-neutral-700"
                  } bg-white dark:bg-neutral-900`}
                >
                  {/* Cover */}
                  <div className="aspect-video relative bg-gradient-to-br from-neutral-100 to-neutral-200 dark:from-neutral-800 dark:to-neutral-700">
                    {course.cover_url ? (
                      <img
                        src={course.cover_url}
                        alt={course.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <BookOpen className="h-8 w-8 text-neutral-300 dark:text-neutral-600" />
                      </div>
                    )}

                    {/* Status badges overlay */}
                    <div className="absolute top-2 left-2 flex gap-1.5">
                      {!course.is_published && (
                        <Badge className="bg-amber-500 text-white text-[10px]">
                          <EyeOff className="mr-1 h-2.5 w-2.5" />
                          {isEn ? "Draft" : "Brouillon"}
                        </Badge>
                      )}
                      {course.is_free && (
                        <Badge className="bg-green-500 text-white text-[10px]">
                          {isEn ? "Free" : "Gratuit"}
                        </Badge>
                      )}
                      {!course.is_free && (
                        <Badge className="bg-neutral-900/70 text-white text-[10px]">
                          <Lock className="mr-1 h-2.5 w-2.5" />
                          Pro
                        </Badge>
                      )}
                    </div>

                    {/* Admin actions overlay */}
                    <div className="absolute top-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Link
                        href={`/admin/courses/${course.id}/edit`}
                        className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/90 text-neutral-700 hover:bg-white shadow-sm"
                      >
                        <Pencil className="h-3 w-3" />
                      </Link>
                      <Link
                        href={`/courses/${course.slug}`}
                        className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/90 text-neutral-700 hover:bg-white shadow-sm"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="text-[10px] dark:border-neutral-700 dark:text-neutral-400">
                        {course.level}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] dark:border-neutral-700 dark:text-neutral-400">
                        {course.category?.name || (isEn ? "No category" : "Sans catégorie")}
                      </Badge>
                    </div>

                    <h3 className="text-sm font-semibold text-neutral-900 dark:text-white line-clamp-2">
                      {course.title}
                    </h3>

                    {course.description && (
                      <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400 line-clamp-2">
                        {course.description}
                      </p>
                    )}

                    <div className="mt-3 flex items-center gap-3 text-xs text-neutral-400">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {course.duration_hours}h
                      </span>
                      <span className="flex items-center gap-1">
                        <BookOpen className="h-3 w-3" />
                        {course.total_lessons} {isEn ? "lessons" : "leçons"}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

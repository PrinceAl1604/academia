"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Eye,
  EyeOff,
  Pencil,
  Clock,
  BookOpen,
  Loader2,
  ExternalLink,
  GripVertical,
  ChevronUp,
  ChevronDown,
  Star,
  Save,
  Check,
  RotateCcw,
  ChevronRight,
  Plus,
  FolderOpen,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/lib/i18n/language-context";
import { cn } from "@/lib/utils";

interface Course {
  id: string;
  title: string;
  slug: string;
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
  const [collapsedCats, setCollapsedCats] = useState<Set<string>>(new Set());

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const [{ data: c }, { data: cat }] = await Promise.all([
      supabase.from("courses").select("id, title, slug, cover_url, level, duration_hours, total_lessons, is_free, is_published, is_featured, sort_order, category_id, category:categories(name)").order("sort_order"),
      supabase.from("categories").select("id, name, sort_order").order("sort_order"),
    ]);
    setCourses((c as unknown as Course[]) || []);
    setCategories(cat || []);
    setLoading(false);
  };

  const toggleCollapse = (catId: string) => {
    setCollapsedCats((prev) => {
      const next = new Set(prev);
      next.has(catId) ? next.delete(catId) : next.add(catId);
      return next;
    });
  };

  // ─── Reorder helpers ───────────────────────────────────────────────
  const moveCatUp = (i: number) => {
    if (i === 0) return;
    const u = [...categories];
    [u[i - 1], u[i]] = [u[i], u[i - 1]];
    u.forEach((c, idx) => (c.sort_order = idx));
    setCategories(u);
    setHasChanges(true);
  };

  const moveCatDown = (i: number) => {
    if (i === categories.length - 1) return;
    const u = [...categories];
    [u[i], u[i + 1]] = [u[i + 1], u[i]];
    u.forEach((c, idx) => (c.sort_order = idx));
    setCategories(u);
    setHasChanges(true);
  };

  const getCatCourses = (catName: string | null) =>
    courses
      .filter((c) => (catName === null ? !c.category?.name : c.category?.name === catName))
      .sort((a, b) => a.sort_order - b.sort_order);

  const moveCourseUp = (id: string, catName: string | null) => {
    const cc = getCatCourses(catName);
    const idx = cc.findIndex((c) => c.id === id);
    if (idx <= 0) return;
    const u = [...courses];
    const a = u.find((c) => c.id === cc[idx].id)!;
    const b = u.find((c) => c.id === cc[idx - 1].id)!;
    [a.sort_order, b.sort_order] = [b.sort_order, a.sort_order];
    setCourses(u);
    setHasChanges(true);
  };

  const moveCourseDown = (id: string, catName: string | null) => {
    const cc = getCatCourses(catName);
    const idx = cc.findIndex((c) => c.id === id);
    if (idx >= cc.length - 1) return;
    const u = [...courses];
    const a = u.find((c) => c.id === cc[idx].id)!;
    const b = u.find((c) => c.id === cc[idx + 1].id)!;
    [a.sort_order, b.sort_order] = [b.sort_order, a.sort_order];
    setCourses(u);
    setHasChanges(true);
  };

  const toggleFeatured = (id: string) => {
    setCourses((p) => p.map((c) => (c.id === id ? { ...c, is_featured: !c.is_featured } : c)));
    setHasChanges(true);
  };

  const togglePublished = (id: string) => {
    setCourses((p) => p.map((c) => (c.id === id ? { ...c, is_published: !c.is_published } : c)));
    setHasChanges(true);
  };

  const saveLayout = async () => {
    setSaving(true);
    const catUpdates = categories.map((c) => supabase.from("categories").update({ sort_order: c.sort_order }).eq("id", c.id));
    const courseUpdates = courses.map((c) => supabase.from("courses").update({ sort_order: c.sort_order, is_featured: c.is_featured, is_published: c.is_published }).eq("id", c.id));
    await Promise.all([...catUpdates, ...courseUpdates]);
    setSaving(false);
    setSaved(true);
    setHasChanges(false);
    setTimeout(() => setSaved(false), 3000);
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-neutral-400" /></div>;
  }

  const CourseRow = ({ course, idx, total, catName }: { course: Course; idx: number; total: number; catName: string | null }) => (
    <div
      className={cn(
        "group flex items-center gap-3 px-3 py-2 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors",
        !course.is_published && "opacity-50",
        course.is_featured && "bg-amber-50/50 dark:bg-amber-900/10"
      )}
    >
      {/* Reorder */}
      <div className="flex flex-col opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
        <button onClick={() => moveCourseUp(course.id, catName)} disabled={idx === 0} className="p-0.5 text-neutral-300 hover:text-neutral-600 disabled:invisible dark:text-neutral-600 dark:hover:text-neutral-300">
          <ChevronUp className="h-3.5 w-3.5 sm:h-3 sm:w-3" />
        </button>
        <button onClick={() => moveCourseDown(course.id, catName)} disabled={idx === total - 1} className="p-0.5 text-neutral-300 hover:text-neutral-600 disabled:invisible dark:text-neutral-600 dark:hover:text-neutral-300">
          <ChevronDown className="h-3.5 w-3.5 sm:h-3 sm:w-3" />
        </button>
      </div>

      {/* Thumbnail */}
      <div className="relative h-9 w-14 rounded-md overflow-hidden bg-neutral-100 dark:bg-neutral-800 shrink-0">
        {course.cover_url ? (
          <Image src={course.cover_url} alt="" fill className="object-cover" sizes="56px" />
        ) : (
          <div className="flex h-full items-center justify-center"><BookOpen className="h-3 w-3 text-neutral-300 dark:text-neutral-600" /></div>
        )}
      </div>

      {/* Title + meta */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium text-neutral-900 dark:text-white truncate">{course.title}</span>
          {course.is_featured && <Star className="h-3 w-3 text-amber-500 fill-amber-500 shrink-0" />}
        </div>
        <div className="flex items-center gap-2 text-[11px] text-neutral-400">
          <span>{course.level}</span>
          <span>·</span>
          <span>{course.duration_hours}h</span>
          <span>·</span>
          <span>{course.total_lessons} {isEn ? "lessons" : "leçons"}</span>
        </div>
      </div>

      {/* Badges */}
      <div className="flex items-center gap-1.5 shrink-0">
        {course.is_free && (
          <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-[10px] h-5 px-1.5">Free</Badge>
        )}
        {!course.is_published && (
          <Badge variant="outline" className="text-[10px] h-5 px-1.5 text-neutral-400 dark:border-neutral-700">
            {isEn ? "Draft" : "Brouillon"}
          </Badge>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-0.5 shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
        <button onClick={() => toggleFeatured(course.id)} className={cn("p-1.5 rounded-md transition-colors", course.is_featured ? "text-amber-500" : "text-neutral-300 hover:text-amber-500 dark:text-neutral-600")} title={isEn ? "Feature" : "Mettre en avant"}>
          <Star className={cn("h-3.5 w-3.5", course.is_featured && "fill-current")} />
        </button>
        <button onClick={() => togglePublished(course.id)} className={cn("p-1.5 rounded-md transition-colors", course.is_published ? "text-green-500" : "text-neutral-300 hover:text-green-500 dark:text-neutral-600")} title={course.is_published ? "Unpublish" : "Publish"}>
          {course.is_published ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
        </button>
        <Link href={`/admin/courses/${course.id}/edit`} className="p-1.5 rounded-md text-neutral-300 hover:text-neutral-600 dark:text-neutral-600 dark:hover:text-neutral-300">
          <Pencil className="h-3.5 w-3.5" />
        </Link>
        <Link href={`/courses/${course.slug}`} className="p-1.5 rounded-md text-neutral-300 hover:text-neutral-600 dark:text-neutral-600 dark:hover:text-neutral-300">
          <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
            {isEn ? "Explorer" : "Explorateur"}
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            {isEn ? "Arrange your courses — changes apply to the student site" : "Arrangez vos cours — les modifications s'appliquent au site étudiant"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasChanges && (
            <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-neutral-500" onClick={() => { setLoading(true); setHasChanges(false); loadData(); }}>
              <RotateCcw className="h-3 w-3" />
              {isEn ? "Reset" : "Annuler"}
            </Button>
          )}
          <Button size="sm" className="gap-1.5" onClick={saveLayout} disabled={saving || !hasChanges}>
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : saved ? <Check className="h-3.5 w-3.5" /> : <Save className="h-3.5 w-3.5" />}
            {saved ? (isEn ? "Saved!" : "Enregistré !") : (isEn ? "Save" : "Enregistrer")}
          </Button>
        </div>
      </div>

      {/* Unsaved banner */}
      {hasChanges && (
        <div className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-300">
          <div className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
          {isEn ? "Unsaved changes" : "Modifications non enregistrées"}
        </div>
      )}

      {/* Category sections */}
      <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden bg-white dark:bg-neutral-900">
        {categories.map((cat, catIdx) => {
          const catCourses = getCatCourses(cat.name);
          const isCollapsed = collapsedCats.has(cat.id);

          return (
            <div key={cat.id} className={catIdx > 0 ? "border-t border-neutral-100 dark:border-neutral-800" : ""}>
              {/* Category header */}
              <div className="group flex items-center gap-2 px-3 py-2.5 bg-neutral-50/80 dark:bg-neutral-800/50 hover:bg-neutral-100/80 dark:hover:bg-neutral-800 transition-colors">
                {/* Reorder arrows */}
                <div className="flex flex-col opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                  <button onClick={() => moveCatUp(catIdx)} disabled={catIdx === 0} className="p-0.5 text-neutral-300 hover:text-neutral-600 disabled:invisible dark:text-neutral-600 dark:hover:text-neutral-300">
                    <ChevronUp className="h-3.5 w-3.5 sm:h-3 sm:w-3" />
                  </button>
                  <button onClick={() => moveCatDown(catIdx)} disabled={catIdx === categories.length - 1} className="p-0.5 text-neutral-300 hover:text-neutral-600 disabled:invisible dark:text-neutral-600 dark:hover:text-neutral-300">
                    <ChevronDown className="h-3.5 w-3.5 sm:h-3 sm:w-3" />
                  </button>
                </div>

                <button onClick={() => toggleCollapse(cat.id)} className="flex items-center gap-2 flex-1 min-w-0 text-left">
                  <ChevronRight className={cn("h-3.5 w-3.5 text-neutral-400 transition-transform", !isCollapsed && "rotate-90")} />
                  <FolderOpen className="h-3.5 w-3.5 text-neutral-400" />
                  <span className="text-sm font-semibold text-neutral-900 dark:text-white truncate">{cat.name}</span>
                  <span className="text-[11px] text-neutral-400 shrink-0">{catCourses.length}</span>
                </button>
              </div>

              {/* Courses */}
              {!isCollapsed && (
                <div className="divide-y divide-neutral-100 dark:divide-neutral-800/50">
                  {catCourses.length === 0 ? (
                    <div className="px-3 py-4 text-center">
                      <p className="text-xs text-neutral-400">{isEn ? "No courses" : "Aucun cours"}</p>
                    </div>
                  ) : (
                    catCourses.map((course, idx) => (
                      <CourseRow key={course.id} course={course} idx={idx} total={catCourses.length} catName={cat.name} />
                    ))
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Uncategorized */}
        {(() => {
          const uncat = getCatCourses(null);
          if (uncat.length === 0) return null;
          return (
            <div className="border-t border-neutral-100 dark:border-neutral-800">
              <div className="flex items-center gap-2 px-3 py-2.5 bg-neutral-50/80 dark:bg-neutral-800/50">
                <FolderOpen className="h-3.5 w-3.5 text-amber-500 ml-7" />
                <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">{isEn ? "Uncategorized" : "Sans catégorie"}</span>
                <span className="text-[11px] text-neutral-400">{uncat.length}</span>
              </div>
              <div className="divide-y divide-neutral-100 dark:divide-neutral-800/50">
                {uncat.map((course, idx) => (
                  <CourseRow key={course.id} course={course} idx={idx} total={uncat.length} catName={null} />
                ))}
              </div>
            </div>
          );
        })()}
      </div>

      {/* Summary */}
      <div className="flex items-center justify-between text-xs text-neutral-400 px-1">
        <span>{courses.length} {isEn ? "courses" : "cours"} · {categories.length} {isEn ? "categories" : "catégories"}</span>
        <span>{courses.filter((c) => c.is_published).length} {isEn ? "published" : "publiés"} · {courses.filter((c) => c.is_featured).length} {isEn ? "featured" : "en avant"}</span>
      </div>
    </div>
  );
}

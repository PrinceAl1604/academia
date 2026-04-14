"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Eye,
  EyeOff,
  Pencil,
  BookOpen,
  Loader2,
  ExternalLink,
  GripVertical,
  Star,
  Save,
  Check,
  RotateCcw,
  ChevronRight,
  FolderOpen,
  Users,
  TrendingUp,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/lib/i18n/language-context";
import { cn } from "@/lib/utils";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

/* ─── Types ────────────────────────────────────────────────── */

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

interface CourseStats {
  enrollments: number;
  completions: number;
  avgProgress: number;
  recent7d: number;
}

/* ─── Sortable Category Header ─────────────────────────────── */

function SortableCategoryHeader({
  cat,
  count,
  isCollapsed,
  onToggle,
}: {
  cat: Category;
  count: number;
  isCollapsed: boolean;
  onToggle: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: cat.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group flex items-center gap-2 px-3 py-2.5 bg-muted/50 transition-colors",
        isDragging && "z-50 shadow-lg bg-card ring-2 ring-primary/15 rounded-lg"
      )}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-0.5 text-muted-foreground/60 hover:text-foreground transition-colors touch-none"
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <button
        onClick={onToggle}
        className="flex items-center gap-2 flex-1 min-w-0 text-left"
      >
        <ChevronRight
          className={cn(
            "h-3.5 w-3.5 text-muted-foreground transition-transform",
            !isCollapsed && "rotate-90"
          )}
        />
        <FolderOpen className="h-3.5 w-3.5 text-primary/70" />
        <span className="text-sm font-semibold text-foreground truncate">
          {cat.name}
        </span>
        <span className="text-[11px] text-muted-foreground shrink-0">{count}</span>
      </button>
    </div>
  );
}

/* ─── Sortable Course Row ──────────────────────────────────── */

function SortableCourseRow({
  course,
  isEn,
  stats,
  selected,
  onToggleSelect,
  onToggleFeatured,
  onTogglePublished,
}: {
  course: Course;
  isEn: boolean;
  stats?: CourseStats;
  selected: boolean;
  onToggleSelect: (id: string) => void;
  onToggleFeatured: (id: string) => void;
  onTogglePublished: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: course.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group flex items-center gap-3 px-3 py-2 hover:bg-muted/40 transition-colors",
        !course.is_published && !selected && "opacity-50",
        selected && "bg-primary/5",
        course.is_featured && !selected && "bg-amber-50/50 dark:bg-amber-900/10",
        isDragging && "z-50 shadow-lg bg-card ring-2 ring-primary/15 rounded-lg opacity-100"
      )}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-0.5 text-muted-foreground/60 hover:text-foreground transition-colors touch-none"
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>

      {/* Checkbox */}
      <input
        type="checkbox"
        checked={selected}
        onChange={() => onToggleSelect(course.id)}
        className="h-3.5 w-3.5 rounded border-border text-primary focus:ring-primary shrink-0 cursor-pointer"
      />

      {/* Thumbnail */}
      <div className="relative h-9 w-14 rounded-md overflow-hidden bg-muted shrink-0">
        {course.cover_url ? (
          <Image src={course.cover_url} alt="" fill className="object-cover" sizes="56px" />
        ) : (
          <div className="flex h-full items-center justify-center">
            <BookOpen className="h-3 w-3 text-muted-foreground/60" />
          </div>
        )}
      </div>

      {/* Title + meta */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium text-foreground truncate">
            {course.title}
          </span>
          {course.is_featured && (
            <Star className="h-3 w-3 text-amber-500 fill-amber-500 shrink-0" />
          )}
        </div>
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <span>{course.level}</span>
          <span>·</span>
          <span>{course.duration_hours}h</span>
          <span>·</span>
          <span>
            {course.total_lessons} {isEn ? "lessons" : "leçons"}
          </span>
        </div>
      </div>

      {/* Stats */}
      {stats && stats.enrollments > 0 && (
        <div className="hidden md:flex items-center gap-3 shrink-0 text-[11px]">
          <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400" title={isEn ? "Enrolled students" : "Étudiants inscrits"}>
            <Users className="h-3 w-3" />
            {stats.enrollments}
          </span>
          {stats.completions > 0 && (
            <span className="flex items-center gap-1 text-primary" title={isEn ? "Completions" : "Complétions"}>
              <Check className="h-3 w-3" />
              {stats.completions}
            </span>
          )}
          {stats.avgProgress > 0 && (
            <div className="flex items-center gap-1.5" title={`${isEn ? "Avg progress" : "Progrès moyen"}: ${stats.avgProgress}%`}>
              <div className="h-1 w-10 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${Math.min(stats.avgProgress, 100)}%` }}
                />
              </div>
              <span className="text-muted-foreground">{stats.avgProgress}%</span>
            </div>
          )}
          {stats.recent7d > 0 && (
            <span className="flex items-center gap-0.5 text-amber-600 dark:text-amber-400" title={isEn ? "New this week" : "Nouveaux cette semaine"}>
              <TrendingUp className="h-3 w-3" />
              +{stats.recent7d}
            </span>
          )}
        </div>
      )}

      {/* Badges */}
      <div className="flex items-center gap-1.5 shrink-0">
        {course.is_free && (
          <Badge className="bg-primary/15 text-primary text-[10px] h-5 px-1.5">
            Free
          </Badge>
        )}
        {!course.is_published && (
          <Badge
            variant="outline"
            className="text-[10px] h-5 px-1.5 text-muted-foreground"
          >
            {isEn ? "Draft" : "Brouillon"}
          </Badge>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-0.5 shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => onToggleFeatured(course.id)}
          className={cn(
            "p-1.5 rounded-md transition-colors",
            course.is_featured
              ? "text-amber-500"
              : "text-muted-foreground/60 hover:text-amber-500"
          )}
          title={isEn ? "Feature" : "Mettre en avant"}
        >
          <Star className={cn("h-3.5 w-3.5", course.is_featured && "fill-current")} />
        </button>
        <button
          onClick={() => onTogglePublished(course.id)}
          className={cn(
            "p-1.5 rounded-md transition-colors",
            course.is_published
              ? "text-primary"
              : "text-muted-foreground/60 hover:text-primary"
          )}
          title={course.is_published ? "Unpublish" : "Publish"}
        >
          {course.is_published ? (
            <Eye className="h-3.5 w-3.5" />
          ) : (
            <EyeOff className="h-3.5 w-3.5" />
          )}
        </button>
        <Link
          href={`/admin/courses/${course.id}/edit`}
          className="p-1.5 rounded-md text-muted-foreground/60 hover:text-foreground transition-colors"
        >
          <Pencil className="h-3.5 w-3.5" />
        </Link>
        <Link
          href={`/courses/${course.slug}`}
          className="p-1.5 rounded-md text-muted-foreground/60 hover:text-foreground transition-colors"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}

/* ─── Sortable Course List (per category) ──────────────────── */

function SortableCourseList({
  courses,
  isEn,
  statsMap,
  selectedIds,
  onToggleSelect,
  onReorder,
  onToggleFeatured,
  onTogglePublished,
}: {
  courses: Course[];
  isEn: boolean;
  statsMap: Record<string, CourseStats>;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onReorder: (courseIds: string[]) => void;
  onToggleFeatured: (id: string) => void;
  onTogglePublished: (id: string) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor)
  );

  const courseIds = courses.map((c) => c.id);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = courseIds.indexOf(active.id as string);
    const newIndex = courseIds.indexOf(over.id as string);
    const newOrder = arrayMove(courseIds, oldIndex, newIndex);
    onReorder(newOrder);
  };

  if (courses.length === 0) {
    return (
      <div className="px-3 py-4 text-center">
        <p className="text-xs text-muted-foreground">
          {isEn ? "No courses" : "Aucun cours"}
        </p>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={courseIds} strategy={verticalListSortingStrategy}>
        <div className="divide-y divide-border/50">
          {courses.map((course) => (
            <SortableCourseRow
              key={course.id}
              course={course}
              isEn={isEn}
              stats={statsMap[course.id]}
              selected={selectedIds.has(course.id)}
              onToggleSelect={onToggleSelect}
              onToggleFeatured={onToggleFeatured}
              onTogglePublished={onTogglePublished}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

/* ─── Main Component ───────────────────────────────────────── */

export default function AdminExplorerPage() {
  const { t } = useLanguage();
  const isEn = t.nav.signIn === "Sign In";
  const [courses, setCourses] = useState<Course[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [statsMap, setStatsMap] = useState<Record<string, CourseStats>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [collapsedCats, setCollapsedCats] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const initialPublishState = useRef<Record<string, boolean>>({});

  // Sensors for category drag
  const catSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor)
  );

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [{ data: c }, { data: cat }] = await Promise.all([
      supabase
        .from("courses")
        .select(
          "id, title, slug, cover_url, level, duration_hours, total_lessons, is_free, is_published, is_featured, sort_order, category_id, category:categories(name)"
        )
        .order("sort_order"),
      supabase.from("categories").select("id, name, sort_order").order("sort_order"),
    ]);
    const courseList = (c as unknown as Course[]) || [];
    setCourses(courseList);
    setCategories(cat || []);
    // Snapshot initial publish state to detect newly published courses on save
    initialPublishState.current = Object.fromEntries(
      courseList.map((course) => [course.id, course.is_published])
    );
    setLoading(false);

    // Fetch enrollment stats (non-blocking)
    fetch("/api/admin/course-stats")
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => { if (json?.stats) setStatsMap(json.stats); })
      .catch(() => {});
  };

  const toggleCollapse = (catId: string) => {
    setCollapsedCats((prev) => {
      const next = new Set(prev);
      next.has(catId) ? next.delete(catId) : next.add(catId);
      return next;
    });
  };

  /* ─── Category drag end ──────────────────────────────────── */
  const handleCategoryDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = categories.findIndex((c) => c.id === active.id);
    const newIndex = categories.findIndex((c) => c.id === over.id);
    const reordered = arrayMove(categories, oldIndex, newIndex);
    reordered.forEach((c, idx) => (c.sort_order = idx));
    setCategories(reordered);
    setHasChanges(true);
  };

  /* ─── Course reorder within category ─────────────────────── */
  const getCatCourses = (catName: string | null) =>
    courses
      .filter((c) =>
        catName === null ? !c.category?.name : c.category?.name === catName
      )
      .sort((a, b) => a.sort_order - b.sort_order);

  const handleCourseReorder = (catName: string | null, newOrder: string[]) => {
    const updated = [...courses];
    newOrder.forEach((id, idx) => {
      const course = updated.find((c) => c.id === id);
      if (course) course.sort_order = idx;
    });
    setCourses(updated);
    setHasChanges(true);
  };

  /* ─── Toggles ────────────────────────────────────────────── */
  const toggleFeatured = (id: string) => {
    setCourses((p) =>
      p.map((c) => (c.id === id ? { ...c, is_featured: !c.is_featured } : c))
    );
    setHasChanges(true);
  };

  const togglePublished = (id: string) => {
    setCourses((p) =>
      p.map((c) => (c.id === id ? { ...c, is_published: !c.is_published } : c))
    );
    setHasChanges(true);
  };

  /* ─── Save ───────────────────────────────────────────────── */
  const saveLayout = async () => {
    setSaving(true);
    const catUpdates = categories.map((c) =>
      supabase.from("categories").update({ sort_order: c.sort_order }).eq("id", c.id)
    );
    const courseUpdates = courses.map((c) =>
      supabase
        .from("courses")
        .update({
          sort_order: c.sort_order,
          is_featured: c.is_featured,
          is_published: c.is_published,
        })
        .eq("id", c.id)
    );
    await Promise.all([...catUpdates, ...courseUpdates]);

    // Detect courses that were just published (false → true) and send announcement emails
    const newlyPublished = courses.filter(
      (c) => c.is_published && initialPublishState.current[c.id] === false
    );
    for (const course of newlyPublished) {
      fetch("/api/email/new-course", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId: course.id }),
      }).catch(() => {});
    }

    // Update snapshot so re-saving doesn't re-trigger
    initialPublishState.current = Object.fromEntries(
      courses.map((c) => [c.id, c.is_published])
    );

    setSaving(false);
    setSaved(true);
    setHasChanges(false);
    setTimeout(() => setSaved(false), 3000);
  };

  /* ─── Selection + Bulk Actions ─────────────────────────────── */
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const bulkPublish = () => {
    setCourses((p) => p.map((c) => selectedIds.has(c.id) ? { ...c, is_published: true } : c));
    setHasChanges(true);
    clearSelection();
  };

  const bulkUnpublish = () => {
    setCourses((p) => p.map((c) => selectedIds.has(c.id) ? { ...c, is_published: false } : c));
    setHasChanges(true);
    clearSelection();
  };

  const bulkFeature = () => {
    setCourses((p) => p.map((c) => selectedIds.has(c.id) ? { ...c, is_featured: true } : c));
    setHasChanges(true);
    clearSelection();
  };

  const bulkUnfeature = () => {
    setCourses((p) => p.map((c) => selectedIds.has(c.id) ? { ...c, is_featured: false } : c));
    setHasChanges(true);
    clearSelection();
  };

  /* ─── Render ─────────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const categoryIds = categories.map((c) => c.id);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {isEn ? "Explorer" : "Explorateur"}
          </h1>
          <p className="mt-1 text-muted-foreground">
            {isEn
              ? "Drag to reorder — changes apply to the student site"
              : "Glissez pour réorganiser — les modifications s'appliquent au site étudiant"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasChanges && (
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-xs text-muted-foreground"
              onClick={() => {
                setLoading(true);
                setHasChanges(false);
                loadData();
              }}
            >
              <RotateCcw className="h-3 w-3" />
              {isEn ? "Reset" : "Annuler"}
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
            {saved
              ? isEn
                ? "Saved!"
                : "Enregistré !"
              : isEn
                ? "Save"
                : "Enregistrer"}
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

      {/* Category sections with drag & drop */}
      <div className="rounded-xl border border-border overflow-hidden bg-card">
        <DndContext
          sensors={catSensors}
          collisionDetection={closestCenter}
          onDragEnd={handleCategoryDragEnd}
        >
          <SortableContext
            items={categoryIds}
            strategy={verticalListSortingStrategy}
          >
            {categories.map((cat, catIdx) => {
              const catCourses = getCatCourses(cat.name);
              const isCollapsed = collapsedCats.has(cat.id);

              return (
                <div
                  key={cat.id}
                  className={catIdx > 0 ? "border-t border-border" : ""}
                >
                  <SortableCategoryHeader
                    cat={cat}
                    count={catCourses.length}
                    isCollapsed={isCollapsed}
                    onToggle={() => toggleCollapse(cat.id)}
                  />

                  {!isCollapsed && (
                    <SortableCourseList
                      courses={catCourses}
                      isEn={isEn}
                      statsMap={statsMap}
                      selectedIds={selectedIds}
                      onToggleSelect={toggleSelect}
                      onReorder={(ids) => handleCourseReorder(cat.name, ids)}
                      onToggleFeatured={toggleFeatured}
                      onTogglePublished={togglePublished}
                    />
                  )}
                </div>
              );
            })}
          </SortableContext>
        </DndContext>

        {/* Uncategorized */}
        {(() => {
          const uncat = getCatCourses(null);
          if (uncat.length === 0) return null;
          return (
            <div className="border-t border-border">
              <div className="flex items-center gap-2 px-3 py-2.5 bg-muted/50">
                <div className="w-5" />
                <FolderOpen className="h-3.5 w-3.5 text-amber-500" />
                <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">
                  {isEn ? "Uncategorized" : "Sans catégorie"}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {uncat.length}
                </span>
              </div>
              <SortableCourseList
                courses={uncat}
                isEn={isEn}
                statsMap={statsMap}
                selectedIds={selectedIds}
                onToggleSelect={toggleSelect}
                onReorder={(ids) => handleCourseReorder(null, ids)}
                onToggleFeatured={toggleFeatured}
                onTogglePublished={togglePublished}
              />
            </div>
          );
        })()}
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="sticky bottom-4 z-40 mx-auto w-fit animate-in slide-in-from-bottom-4 fade-in duration-200">
          <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 shadow-lg">
            <span className="text-sm font-medium text-foreground mr-1">
              {selectedIds.size} {isEn ? "selected" : "sélectionné(s)"}
            </span>

            <div className="h-4 w-px bg-border" />

            <Button variant="ghost" size="sm" className="gap-1.5 text-xs" onClick={bulkPublish}>
              <Eye className="h-3.5 w-3.5 text-primary" />
              {isEn ? "Publish" : "Publier"}
            </Button>
            <Button variant="ghost" size="sm" className="gap-1.5 text-xs" onClick={bulkUnpublish}>
              <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
              {isEn ? "Unpublish" : "Dépublier"}
            </Button>

            <div className="h-4 w-px bg-border" />

            <Button variant="ghost" size="sm" className="gap-1.5 text-xs" onClick={bulkFeature}>
              <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
              {isEn ? "Feature" : "En avant"}
            </Button>
            <Button variant="ghost" size="sm" className="gap-1.5 text-xs" onClick={bulkUnfeature}>
              <Star className="h-3.5 w-3.5 text-muted-foreground" />
              {isEn ? "Unfeature" : "Retirer"}
            </Button>

            <div className="h-4 w-px bg-border" />

            <button
              onClick={clearSelection}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground transition-colors"
              title={isEn ? "Clear selection" : "Désélectionner"}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
        <span>
          {courses.length} {isEn ? "courses" : "cours"} · {categories.length}{" "}
          {isEn ? "categories" : "catégories"}
          {Object.keys(statsMap).length > 0 && (
            <> · {Object.values(statsMap).reduce((s, v) => s + v.enrollments, 0)}{" "}
            {isEn ? "enrollments" : "inscriptions"}</>
          )}
        </span>
        <span>
          {courses.filter((c) => c.is_published).length}{" "}
          {isEn ? "published" : "publiés"} ·{" "}
          {courses.filter((c) => c.is_featured).length}{" "}
          {isEn ? "featured" : "en avant"}
        </span>
      </div>
    </div>
  );
}

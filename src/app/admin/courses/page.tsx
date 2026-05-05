"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { useLanguage } from "@/lib/i18n/language-context";
import { getAllCourses, deleteCourse, type CourseRow } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Illustration } from "@/components/shared/illustration";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
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
  BookOpen,
  Clock,
  ImageIcon,
} from "lucide-react";

/**
 * Admin — manage courses list (refactored for Refactoring UI 10/10).
 *
 * Was: full-width list rows that hid each course's cover image and
 * surfaced a screaming-red Delete button on every row. Native
 * confirm() for deletion broke consistency with the Sessions feature
 * (which uses shadcn Dialog).
 *
 * Now: responsive card grid (1/2/3 columns by breakpoint) with cover
 * thumbnail as the visual anchor, status badge overlay, and a
 * subtle ghost-trash that opens a proper Dialog confirmation. Header
 * matches the admin design language used by /admin and
 * /admin/sessions (mono preheader + medium-weight title).
 *
 * New affordances: status filter chips (All / Published / Draft) so
 * admin can scan their published vs work-in-progress courses without
 * eyeballing badges.
 */

type StatusFilter = "all" | "published" | "draft";

export default function AdminCoursesPage() {
  const { t } = useLanguage();
  const isEn = t.nav.signIn === "Sign In";
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [loading, setLoading] = useState(true);
  // Delete-confirmation dialog state. deleteTarget holds the course
  // we're about to delete; null = closed. Replaces the native
  // confirm() call (consistent with the Sessions cancel flow).
  const [deleteTarget, setDeleteTarget] = useState<CourseRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const loadCourses = useCallback(async () => {
    const data = await getAllCourses();
    setCourses(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteCourse(deleteTarget.id);
      setCourses((prev) => prev.filter((c) => c.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch {
      setDeleteError(
        isEn
          ? "Couldn't delete this course. It may have chapters or enrollments linked to it."
          : "Impossible de supprimer ce cours. Des chapitres ou inscriptions y sont peut-être liés."
      );
    }
    setDeleting(false);
  };

  // Filter + search applied in a single memoized pass.
  const filteredCourses = useMemo(() => {
    const q = search.trim().toLowerCase();
    return courses.filter((course) => {
      // Status filter
      if (statusFilter === "published" && !course.is_published) return false;
      if (statusFilter === "draft" && course.is_published) return false;
      // Search filter
      if (!q) return true;
      return (
        course.title.toLowerCase().includes(q) ||
        (course.category?.name ?? "").toLowerCase().includes(q)
      );
    });
  }, [courses, statusFilter, search]);

  // Counts for the filter pills — gives admin a glanceable read of
  // their workshop ("I have 3 published, 2 still drafts").
  const counts = useMemo(
    () => ({
      all: courses.length,
      published: courses.filter((c) => c.is_published).length,
      draft: courses.filter((c) => !c.is_published).length,
    }),
    [courses]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/70" />
      </div>
    );
  }

  // Pluralisation helper — "1 cours" vs "5 cours" in FR (no S),
  // "1 course" vs "5 courses" in EN.
  const courseCountLabel = (n: number) =>
    isEn ? `${n} ${n === 1 ? "course" : "courses"}` : `${n} cours`;

  return (
    <div className="px-4 py-8 lg:px-8 lg:py-12 max-w-7xl mx-auto space-y-8">
      {/* ── Hero ────────────────────────────────────────────── */}
      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div className="space-y-2">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            / Courses
          </p>
          <h1 className="text-3xl sm:text-4xl font-medium tracking-tight text-foreground">
            {t.admin.manageCourses}
          </h1>
          {/* Subtitle uses mono + tabular-nums + lower contrast — same
              visual language as the section preheader above it, so the
              page header reads as one cohesive block instead of
              "title + competing body paragraph". */}
          <p className="font-mono text-xs text-muted-foreground/70 tabular-nums">
            {courseCountLabel(courses.length)}
          </p>
        </div>
        <Button
          render={<Link href="/admin/courses/new" />}
          className="gap-1.5 shrink-0 shadow-sm shadow-primary/20"
        >
          <Plus className="h-4 w-4" />
          {t.admin.addCourse}
        </Button>
      </header>

      {/* ── Filter + search ─────────────────────────────────── */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Status filter chips — counts inline so admin sees their
             distribution at a glance. */}
        <div className="inline-flex items-center gap-1 rounded-lg border border-border/60 bg-card p-1">
          {(
            [
              { key: "all", label: isEn ? "All" : "Tous" },
              { key: "published", label: t.admin.published },
              { key: "draft", label: isEn ? "Draft" : "Brouillon" },
            ] as { key: StatusFilter; label: string }[]
          ).map((opt) => {
            const active = statusFilter === opt.key;
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => setStatusFilter(opt.key)}
                className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  active
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {opt.label}
                <span
                  className={`font-mono text-[10px] tabular-nums ${
                    active ? "text-primary/70" : "text-muted-foreground/70"
                  }`}
                >
                  {counts[opt.key]}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/70" />
          <Input
            placeholder={t.admin.searchCourses}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>
      </div>

      {/* ── Course grid ─────────────────────────────────────── */}
      {filteredCourses.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 flex flex-col items-center text-center gap-4">
            <Illustration name="admin-empty" alt="" size="md" />
            <div className="space-y-1">
              <p className="text-base font-medium text-foreground">
                {courses.length === 0
                  ? isEn
                    ? "No courses yet"
                    : "Aucun cours pour l'instant"
                  : t.admin.noResults}
              </p>
              {courses.length === 0 && (
                <p className="text-sm text-muted-foreground max-w-prose">
                  {isEn
                    ? "Create your first course to start filling your catalog."
                    : "Créez votre premier cours pour commencer à remplir votre catalogue."}
                </p>
              )}
            </div>
            {courses.length === 0 && (
              <Button
                render={<Link href="/admin/courses/new" />}
                className="gap-1.5"
                size="sm"
              >
                <Plus className="h-3.5 w-3.5" />
                {t.admin.addCourse}
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredCourses.map((course) => (
            <CourseAdminCard
              key={course.id}
              course={course}
              isEn={isEn}
              t={t}
              onDelete={() => setDeleteTarget(course)}
            />
          ))}
        </div>
      )}

      {/* ── Delete confirmation dialog ───────────────────────── */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(o) => {
          if (!o) {
            setDeleteTarget(null);
            setDeleteError(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {isEn
                ? "Delete this course?"
                : "Supprimer ce cours ?"}
            </DialogTitle>
            <DialogDescription>
              {deleteTarget
                ? isEn
                  ? `"${deleteTarget.title}" will be permanently removed along with its chapters and lessons. Existing enrollments will lose access. This can't be undone.`
                  : `« ${deleteTarget.title} » sera définitivement supprimé avec ses chapitres et leçons. Les inscriptions existantes perdront l'accès. Cette action est irréversible.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          {deleteError && (
            <p className="text-sm text-destructive">{deleteError}</p>
          )}
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
            >
              {isEn ? "Keep it" : "Garder"}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  {isEn ? "Deleting…" : "Suppression…"}
                </>
              ) : (
                <>
                  <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                  {isEn ? "Yes, delete" : "Oui, supprimer"}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ─── Per-course card ─────────────────────────────────────────
 * Cover-up-front design: the image dominates the card, status badge
 * floats over the top-right, free badge over the top-left when
 * applicable. Body uses the established admin typography:
 *   - mono uppercase preheader for category + level
 *   - medium-weight title with line-clamp-2 to keep card heights even
 *   - mono tabular metadata row
 *   - subtle action buttons (no screaming destructive on every card)
 */
function CourseAdminCard({
  course,
  isEn,
  t,
  onDelete,
}: {
  course: CourseRow;
  isEn: boolean;
  t: ReturnType<typeof useLanguage>["t"];
  onDelete: () => void;
}) {
  const cover = course.cover_url || course.thumbnail_url;

  return (
    <Card className="overflow-hidden flex flex-col h-full transition-all duration-200 group hover:border-border hover:shadow-md hover:-translate-y-0.5">
      {/* Cover image with overlay badges. The image gets a subtle
          group-hover scale to telegraph "this card is interactive" —
          same affordance Figma/Linear/Vercel use on card grids. */}
      <div className="relative aspect-video bg-gradient-to-br from-muted to-muted/40 overflow-hidden">
        {cover ? (
          <Image
            src={cover}
            alt={course.title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <ImageIcon className="h-8 w-8 text-muted-foreground/40" />
          </div>
        )}

        {/* Status badge overlay — top-right. Drop-shadow keeps it
             legible on bright cover photos. */}
        <div className="absolute top-2 right-2">
          {course.is_published ? (
            <Badge className="bg-primary/90 text-primary-foreground backdrop-blur-sm shadow-sm">
              <Eye className="mr-1 h-3 w-3" />
              {t.admin.published}
            </Badge>
          ) : (
            <Badge className="bg-background/85 text-foreground backdrop-blur-sm shadow-sm border border-border/60">
              <EyeOff className="mr-1 h-3 w-3" />
              {isEn ? "Draft" : "Brouillon"}
            </Badge>
          )}
        </div>

        {/* Free badge overlay — top-left, only when applicable */}
        {course.is_free && (
          <div className="absolute top-2 left-2">
            <Badge className="bg-amber-500/90 text-amber-950 backdrop-blur-sm shadow-sm font-medium">
              {isEn ? "Free" : "Gratuit"}
            </Badge>
          </div>
        )}
      </div>

      <CardContent className="p-4 flex flex-col flex-1 gap-2.5">
        {/* Category + level preheader */}
        <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
          {course.category?.name ?? (isEn ? "Uncategorized" : "Sans catégorie")}
          {" · "}
          {course.level}
        </p>

        {/* Title — line-clamp-2 keeps card heights consistent */}
        <h3 className="text-base font-medium tracking-tight text-foreground leading-tight line-clamp-2 min-h-[2.5rem]">
          {course.title}
        </h3>

        {/* Metadata row. Each cell hides when the value is zero —
            empty cells (0 students, 0 rating) are noise that competes
            with the duration + lesson-count signals that always
            matter. Time + lesson count anchor the row regardless. */}
        <div className="flex items-center gap-3 font-mono text-xs text-muted-foreground tabular-nums">
          {course.students_count > 0 && (
            <span className="inline-flex items-center gap-1">
              <Users className="h-3 w-3" />
              {course.students_count.toLocaleString()}
            </span>
          )}
          {course.rating > 0 && (
            <span className="inline-flex items-center gap-1">
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
              {course.rating}
            </span>
          )}
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {course.duration_hours}h
          </span>
          <span className="inline-flex items-center gap-1">
            <BookOpen className="h-3 w-3" />
            {course.total_lessons}
          </span>
        </div>

        {/* Actions row — pushed to bottom via mt-auto so cards align
             across the row regardless of title length. Edit is the
             primary action; delete is intentionally a subtle ghost
             that turns destructive on hover. */}
        <div className="flex items-center gap-2 pt-3 mt-auto border-t border-border/60">
          <Button
            variant="outline"
            size="sm"
            render={<Link href={`/admin/courses/${course.id}/edit`} />}
            className="gap-1.5 flex-1"
          >
            <Pencil className="h-3.5 w-3.5" />
            {t.admin.edit}
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onDelete}
            title={t.admin.delete}
            aria-label={t.admin.delete}
            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

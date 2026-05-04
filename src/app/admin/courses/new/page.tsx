"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n/language-context";
import {
  getCategories,
  createCourse,
  createModule,
  createLesson,
  type CategoryRow,
} from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Loader2,
  Plus,
  FolderOpen,
  Trash2,
  GripVertical,
  Video,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { CoverUpload } from "@/components/admin/cover-upload";

/**
 * Admin — create course form (refactored for Refactoring UI 10/10).
 *
 * Hierarchy moves: page H1 dropped from `text-2xl font-bold` to the
 * admin-pattern `text-3xl sm:text-4xl font-medium tracking-tight`.
 * Form labels lost weight to stop competing with their values; section
 * preheaders use the mono uppercase pattern that runs through the
 * rest of admin pages (matches `/admin`, `/admin/sessions` headers).
 *
 * Layout moves: form left column constrained to max-w-xl (was full-
 * width — way past the 45-75 character readability sweet spot). Save
 * action moved from the bottom of a long scroll to a sticky header
 * bar so users can publish from any scroll position. Replaces the
 * "Published" toggle with explicit "Save as draft" vs "Publish" CTAs
 * (industry pattern from Notion/Linear/Webflow — communicates the
 * workflow choice instead of hiding it in form state).
 *
 * Sections separate concerns: Basics / Media / Categorization /
 * Settings. Each gets its own mono preheader so the user can scan
 * "I'm in the categorization section now" without reading every
 * label.
 */

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

interface Chapter {
  id: string;
  title: string;
  description: string;
  expanded: boolean;
  lessons: ChapterLesson[];
}

interface ChapterLesson {
  id: string;
  title: string;
  description: string;
  youtubeUrl: string;
  durationMinutes: string;
  isFree: boolean;
}

let tempId = 0;
function newId() {
  return `temp-${++tempId}`;
}

export default function AdminCourseNewPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const isEn = t.nav.signIn === "Sign In";

  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [savingMode, setSavingMode] = useState<"draft" | "publish" | null>(null);
  const [newCatName, setNewCatName] = useState("");
  const [creatingCat, setCreatingCat] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Course fields
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [level, setLevel] = useState("Beginner");
  const [tags, setTags] = useState("");
  const [isFree, setIsFree] = useState(false);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);

  // Chapters (modules + lessons)
  const [chapters, setChapters] = useState<Chapter[]>([]);

  useEffect(() => {
    getCategories().then(setCategories);
  }, []);

  useEffect(() => {
    setSlug(slugify(title));
  }, [title]);

  // ─── Chapter management ────────────────────────────────────

  const addChapter = () => {
    setChapters((prev) => [
      ...prev,
      {
        id: newId(),
        title: "",
        description: "",
        expanded: true,
        lessons: [],
      },
    ]);
  };

  const updateChapter = (
    id: string,
    field: string,
    value: string | boolean
  ) => {
    setChapters((prev) =>
      prev.map((ch) => (ch.id === id ? { ...ch, [field]: value } : ch))
    );
  };

  const removeChapter = (id: string) => {
    setChapters((prev) => prev.filter((ch) => ch.id !== id));
  };

  const toggleChapter = (id: string) => {
    setChapters((prev) =>
      prev.map((ch) =>
        ch.id === id ? { ...ch, expanded: !ch.expanded } : ch
      )
    );
  };

  // ─── Lesson management ─────────────────────────────────────

  const addLesson = (chapterId: string) => {
    setChapters((prev) =>
      prev.map((ch) =>
        ch.id === chapterId
          ? {
              ...ch,
              lessons: [
                ...ch.lessons,
                {
                  id: newId(),
                  title: "",
                  description: "",
                  youtubeUrl: "",
                  durationMinutes: "",
                  isFree: false,
                },
              ],
            }
          : ch
      )
    );
  };

  const updateLesson = (
    chapterId: string,
    lessonId: string,
    field: string,
    value: string | boolean
  ) => {
    setChapters((prev) =>
      prev.map((ch) =>
        ch.id === chapterId
          ? {
              ...ch,
              lessons: ch.lessons.map((l) =>
                l.id === lessonId ? { ...l, [field]: value } : l
              ),
            }
          : ch
      )
    );
  };

  const removeLesson = (chapterId: string, lessonId: string) => {
    setChapters((prev) =>
      prev.map((ch) =>
        ch.id === chapterId
          ? { ...ch, lessons: ch.lessons.filter((l) => l.id !== lessonId) }
          : ch
      )
    );
  };

  const createCategoryInline = async () => {
    if (!newCatName.trim()) return;
    const { data } = await supabase
      .from("categories")
      .insert({ name: newCatName.trim(), slug: slugify(newCatName) })
      .select()
      .single();
    if (data) {
      setCategories((prev) => [...prev, data]);
      setCategoryId(data.id);
      setNewCatName("");
      setCreatingCat(false);
    }
  };

  // ─── Save ──────────────────────────────────────────────────

  const handleSave = async (publish: boolean) => {
    if (!title.trim()) {
      setError(isEn ? "Title is required" : "Le titre est requis");
      return;
    }

    setSaving(true);
    setSavingMode(publish ? "publish" : "draft");
    setError(null);

    try {
      const totalLessons = chapters.reduce(
        (sum, ch) => sum + ch.lessons.length,
        0
      );
      const totalDuration = chapters.reduce(
        (sum, ch) =>
          sum +
          ch.lessons.reduce(
            (s, l) => s + (parseInt(l.durationMinutes) || 0),
            0
          ),
        0
      );

      const course = await createCourse({
        title: title.trim(),
        slug: slug || slugify(title),
        description: description.trim() || undefined,
        category_id: categoryId || undefined,
        instructor_id: "9febd714-0bea-4710-acea-90d8d14b32db",
        level,
        duration_hours: Math.ceil(totalDuration / 60) || 0,
        total_lessons: totalLessons,
        is_free: isFree,
        is_published: publish,
        cover_url: coverUrl || undefined,
        tags: tags.split(",").map((tag) => tag.trim()).filter(Boolean),
      });

      for (let i = 0; i < chapters.length; i++) {
        const ch = chapters[i];
        if (!ch.title.trim()) continue;

        const mod = await createModule({
          course_id: course.id,
          title: ch.title.trim(),
          sort_order: i,
        });

        if (ch.description.trim()) {
          await supabase
            .from("modules")
            .update({ description: ch.description.trim() })
            .eq("id", mod.id);
        }

        for (let j = 0; j < ch.lessons.length; j++) {
          const lesson = ch.lessons[j];
          if (!lesson.title.trim()) continue;

          await createLesson({
            module_id: mod.id,
            title: lesson.title.trim(),
            type: "video",
            youtube_url: lesson.youtubeUrl.trim() || undefined,
            duration_minutes: parseInt(lesson.durationMinutes) || 0,
            content: lesson.description.trim() || undefined,
            is_free: lesson.isFree,
            sort_order: j,
          });
        }
      }

      router.push("/admin/courses");
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to create course"
      );
      setSaving(false);
      setSavingMode(null);
    }
  };

  const totalLessonsCount = chapters.reduce(
    (s, c) => s + c.lessons.length,
    0
  );

  return (
    <div className="max-w-7xl mx-auto">
      {/* ─── Sticky header bar ──────────────────────────────────
           Save actions live at the top so they're reachable from
           any scroll position — long forms shouldn't make you scroll
           to find Save. Splits "Save as draft" (low-commit) from
           "Publish" (final action) instead of hiding the workflow
           inside a body toggle. */}
      <header className="sticky top-0 z-20 -mx-4 lg:-mx-8 px-4 lg:px-8 py-4 bg-background/85 backdrop-blur-md border-b border-border/60">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div className="space-y-1.5 min-w-0">
            <Link
              href="/admin/courses"
              className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-3 w-3" />
              / Courses / New
            </Link>
            <h1 className="text-2xl sm:text-3xl font-medium tracking-tight text-foreground">
              {t.admin.createCourse}
            </h1>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              variant="ghost"
              onClick={() => router.push("/admin/courses")}
              disabled={saving}
            >
              {isEn ? "Cancel" : "Annuler"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleSave(false)}
              disabled={saving}
            >
              {saving && savingMode === "draft" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              {isEn ? "Save as draft" : "Enregistrer brouillon"}
            </Button>
            <Button
              type="button"
              onClick={() => handleSave(true)}
              disabled={saving}
            >
              {saving && savingMode === "publish" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              {isEn ? "Publish" : "Publier"}
            </Button>
          </div>
        </div>
        {error && (
          <p className="mt-3 text-sm text-destructive">{error}</p>
        )}
      </header>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] py-8">
        {/* ─── LEFT: Course details ───────────────────────────── */}
        <div className="space-y-8 max-w-xl">
          {/* ─── Section 1: BASICS ─────────────────────────── */}
          <section className="space-y-4">
            <SectionHeader
              preheader={isEn ? "Basics" : "Informations"}
              title={isEn ? "What is the course?" : "Quel est le cours ?"}
              hint={
                isEn
                  ? "Title and description students see in the catalog."
                  : "Titre et description vus dans le catalogue."
              }
            />

            <Field
              label={t.admin.courseTitle}
              required
              htmlFor="title"
            >
              <Input
                id="title"
                placeholder="e.g. Complete UI/UX Design Masterclass"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </Field>

            <Field label="URL" htmlFor="slug">
              <div className="flex items-center rounded-md border border-input bg-input/30 focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/50 transition-colors">
                <span className="px-3 py-2 font-mono text-xs text-muted-foreground/70 border-r border-border/60 select-none">
                  /courses/
                </span>
                <Input
                  id="slug"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="font-mono text-sm border-0 bg-transparent rounded-l-none focus-visible:ring-0 focus-visible:border-transparent"
                />
              </div>
            </Field>

            <Field
              label={t.admin.courseDescription}
              htmlFor="description"
            >
              <Textarea
                id="description"
                placeholder={
                  isEn
                    ? "Describe what students will learn..."
                    : "Décrivez ce que les étudiants apprendront..."
                }
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </Field>
          </section>

          {/* ─── Section 2: MEDIA ──────────────────────────── */}
          <section className="space-y-4">
            <SectionHeader
              preheader={isEn ? "Media" : "Média"}
              title={isEn ? "Cover image" : "Image de couverture"}
              hint={
                isEn
                  ? "16:9 ratio works best. Used in cards and the course detail hero."
                  : "Format 16:9 recommandé. Utilisé sur les cartes et la page du cours."
              }
            />
            <CoverUpload
              value={coverUrl}
              onChange={setCoverUrl}
              courseSlug={slug}
            />
          </section>

          {/* ─── Section 3: CATEGORIZATION ─────────────────── */}
          <section className="space-y-4">
            <SectionHeader
              preheader={isEn ? "Categorization" : "Catégorisation"}
              title={isEn ? "Help students find it" : "Aidez à le trouver"}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t.admin.category}>
                {categories.length > 0 ? (
                  <div className="space-y-2">
                    <Select
                      value={categoryId}
                      onValueChange={(v) => setCategoryId(v ?? "")}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t.admin.selectCategory}>
                          {categories.find((c) => c.id === categoryId)?.name ||
                            t.admin.selectCategory}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {!creatingCat ? (
                      <button
                        type="button"
                        onClick={() => setCreatingCat(true)}
                        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Plus className="h-3 w-3" />
                        {isEn ? "Add new" : "Ajouter"}
                      </button>
                    ) : (
                      <div className="flex gap-2">
                        <Input
                          placeholder={isEn ? "Category name" : "Nom"}
                          value={newCatName}
                          onChange={(e) => setNewCatName(e.target.value)}
                          className="h-8 text-xs"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              createCategoryInline();
                            }
                            if (e.key === "Escape") {
                              setCreatingCat(false);
                              setNewCatName("");
                            }
                          }}
                        />
                        <Button
                          type="button"
                          size="sm"
                          className="h-8 text-xs"
                          onClick={createCategoryInline}
                        >
                          {isEn ? "Add" : "Ajouter"}
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-border/60 p-3 text-center">
                    <FolderOpen className="mx-auto h-5 w-5 text-muted-foreground/70" />
                    <p className="mt-1 text-xs text-muted-foreground">
                      {isEn ? "No categories yet" : "Aucune catégorie"}
                    </p>
                    <div className="mt-2 flex gap-2 justify-center">
                      <Input
                        placeholder={isEn ? "e.g. UI/UX Design" : "ex. UI/UX"}
                        value={newCatName}
                        onChange={(e) => setNewCatName(e.target.value)}
                        className="h-8 max-w-[180px] text-xs"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            createCategoryInline();
                          }
                        }}
                      />
                      <Button
                        type="button"
                        size="sm"
                        className="h-8 gap-1 text-xs"
                        onClick={createCategoryInline}
                      >
                        <Plus className="h-3 w-3" />
                        {isEn ? "Create" : "Créer"}
                      </Button>
                    </div>
                  </div>
                )}
              </Field>

              <Field label={t.admin.selectLevel}>
                <Select
                  value={level}
                  onValueChange={(v) => setLevel(v ?? "Beginner")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Beginner">Beginner</SelectItem>
                    <SelectItem value="Intermediate">Intermediate</SelectItem>
                    <SelectItem value="Advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <Field
              label={t.admin.tags}
              htmlFor="tags"
              hint={
                isEn
                  ? "Comma-separated, e.g. design, figma, prototyping"
                  : "Séparés par des virgules, ex : design, figma"
              }
            >
              <Input
                id="tags"
                placeholder={t.admin.tagsPlaceholder}
                value={tags}
                onChange={(e) => setTags(e.target.value)}
              />
            </Field>
          </section>

          {/* ─── Section 4: SETTINGS ───────────────────────── */}
          <section className="space-y-4">
            <SectionHeader
              preheader={isEn ? "Settings" : "Paramètres"}
              title={isEn ? "Access" : "Accès"}
            />

            <div className="rounded-lg border border-border/60 bg-card">
              <label className="flex items-center justify-between gap-4 px-4 py-3 cursor-pointer">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">
                    {isEn ? "Free course" : "Cours gratuit"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {isEn
                      ? "Available without a Pro subscription."
                      : "Disponible sans abonnement Pro."}
                  </p>
                </div>
                <Switch checked={isFree} onCheckedChange={setIsFree} />
              </label>
            </div>
          </section>
        </div>
        {/* end LEFT */}

        {/* ─── RIGHT: Curriculum ──────────────────────────────── */}
        <aside className="space-y-4 lg:sticky lg:top-32 lg:self-start lg:max-h-[calc(100vh-12rem)] lg:overflow-y-auto lg:pr-1">
          <SectionHeader
            preheader={isEn ? "Curriculum" : "Programme"}
            title={isEn ? "Chapters" : "Chapitres"}
            hint={
              chapters.length === 0
                ? isEn
                  ? "Build the course content. You can publish without chapters and add them later."
                  : "Construisez le contenu. Vous pouvez publier sans chapitres et les ajouter plus tard."
                : `${chapters.length} ${isEn ? "chapters" : "chapitres"} · ${totalLessonsCount} ${isEn ? "lessons" : "leçons"}`
            }
          />

          {chapters.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center text-center py-10 gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <Plus className="h-5 w-5" />
                </div>
                <p className="text-sm text-muted-foreground max-w-prose">
                  {isEn
                    ? "Start adding chapters to organize your lessons."
                    : "Ajoutez des chapitres pour organiser vos leçons."}
                </p>
                <Button
                  type="button"
                  onClick={addChapter}
                  className="gap-1.5 mt-1"
                  size="sm"
                >
                  <Plus className="h-3.5 w-3.5" />
                  {isEn ? "Add first chapter" : "Premier chapitre"}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {chapters.map((chapter, chIdx) => (
                <Card key={chapter.id}>
                  <CardContent className="p-0">
                    {/* Chapter header */}
                    <div
                      className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/40 transition-colors"
                      onClick={() => toggleChapter(chapter.id)}
                    >
                      <GripVertical className="h-4 w-4 text-muted-foreground/70 shrink-0" />
                      {chapter.expanded ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground/70 shrink-0" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground/70 shrink-0" />
                      )}
                      <span className="flex h-6 w-6 items-center justify-center rounded bg-muted font-mono text-[10px] tabular-nums text-muted-foreground shrink-0">
                        {chIdx + 1}
                      </span>
                      <span className="flex-1 text-sm font-medium text-foreground truncate">
                        {chapter.title ||
                          (isEn ? "Untitled chapter" : "Sans titre")}
                      </span>
                      <span className="font-mono text-[10px] text-muted-foreground/70 tabular-nums shrink-0">
                        {chapter.lessons.length}{" "}
                        {isEn ? "lessons" : "leçons"}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeChapter(chapter.id);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>

                    {/* Chapter expanded content */}
                    {chapter.expanded && (
                      <div className="border-t border-border/60 px-4 py-4 space-y-4">
                        <div className="grid gap-3 sm:grid-cols-2">
                          <Field
                            label={
                              isEn ? "Chapter title" : "Titre du chapitre"
                            }
                            required
                          >
                            <Input
                              placeholder={
                                isEn
                                  ? "e.g. Getting started"
                                  : "ex. Introduction"
                              }
                              value={chapter.title}
                              onChange={(e) =>
                                updateChapter(
                                  chapter.id,
                                  "title",
                                  e.target.value
                                )
                              }
                            />
                          </Field>
                          <Field
                            label={
                              isEn ? "Description" : "Description"
                            }
                          >
                            <Input
                              placeholder={
                                isEn
                                  ? "Brief description..."
                                  : "Brève description..."
                              }
                              value={chapter.description}
                              onChange={(e) =>
                                updateChapter(
                                  chapter.id,
                                  "description",
                                  e.target.value
                                )
                              }
                            />
                          </Field>
                        </div>

                        <Separator />

                        {/* Lessons */}
                        <div className="space-y-3">
                          {chapter.lessons.map((lesson, lIdx) => (
                            <div
                              key={lesson.id}
                              className="rounded-lg border border-border/60 bg-muted/20 p-3 space-y-3"
                            >
                              <div className="flex items-center gap-2">
                                <Video className="h-3.5 w-3.5 text-muted-foreground/70 shrink-0" />
                                <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                                  {isEn ? "Lesson" : "Leçon"} {lIdx + 1}
                                </span>
                                <div className="flex-1" />
                                <div className="inline-flex items-center gap-1.5">
                                  <Label className="text-[11px] text-muted-foreground/70">
                                    {isEn ? "Free" : "Gratuit"}
                                  </Label>
                                  <Switch
                                    checked={lesson.isFree}
                                    onCheckedChange={(v) =>
                                      updateLesson(
                                        chapter.id,
                                        lesson.id,
                                        "isFree",
                                        v
                                      )
                                    }
                                    className="scale-75"
                                  />
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon-xs"
                                  className="text-muted-foreground hover:text-destructive"
                                  onClick={() =>
                                    removeLesson(chapter.id, lesson.id)
                                  }
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>

                              <Input
                                placeholder={
                                  isEn
                                    ? "Lesson title *"
                                    : "Titre de la leçon *"
                                }
                                value={lesson.title}
                                onChange={(e) =>
                                  updateLesson(
                                    chapter.id,
                                    lesson.id,
                                    "title",
                                    e.target.value
                                  )
                                }
                                className="text-sm"
                              />

                              <Textarea
                                placeholder={
                                  isEn
                                    ? "Description (optional)"
                                    : "Description (optionnel)"
                                }
                                value={lesson.description}
                                onChange={(e) =>
                                  updateLesson(
                                    chapter.id,
                                    lesson.id,
                                    "description",
                                    e.target.value
                                  )
                                }
                                rows={2}
                                className="text-sm"
                              />

                              <div className="space-y-2">
                                <div className="flex items-center justify-between gap-2">
                                  <Label className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                                    {isEn
                                      ? "Video embed"
                                      : "Code d'intégration"}
                                  </Label>
                                  <div className="inline-flex items-center gap-1">
                                    <Label className="text-[11px] text-muted-foreground/70">
                                      {isEn ? "Duration" : "Durée"}
                                    </Label>
                                    <Input
                                      type="number"
                                      min="0"
                                      placeholder="0"
                                      value={lesson.durationMinutes}
                                      onChange={(e) =>
                                        updateLesson(
                                          chapter.id,
                                          lesson.id,
                                          "durationMinutes",
                                          e.target.value
                                        )
                                      }
                                      className="h-7 w-16 text-xs"
                                    />
                                    <span className="text-[11px] text-muted-foreground/70">
                                      min
                                    </span>
                                  </div>
                                </div>
                                <Textarea
                                  placeholder={
                                    isEn
                                      ? 'Paste YouTube embed — e.g. <iframe src="https://www.youtube.com/embed/...">'
                                      : 'Collez le code YouTube — ex. <iframe src="https://www.youtube.com/embed/...">'
                                  }
                                  value={lesson.youtubeUrl}
                                  onChange={(e) =>
                                    updateLesson(
                                      chapter.id,
                                      lesson.id,
                                      "youtubeUrl",
                                      e.target.value
                                    )
                                  }
                                  rows={2}
                                  className="text-xs font-mono"
                                />
                                {/* Live video preview */}
                                {lesson.youtubeUrl &&
                                  (() => {
                                    const idMatch = lesson.youtubeUrl.match(
                                      /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
                                    );
                                    const videoId = idMatch?.[1];
                                    return videoId ? (
                                      <div className="aspect-video w-full overflow-hidden rounded-lg border border-border/60 bg-black">
                                        <iframe
                                          src={`https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1&showinfo=0&iv_load_policy=3&color=white`}
                                          className="h-full w-full"
                                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                          allowFullScreen
                                          title={lesson.title || "Preview"}
                                        />
                                      </div>
                                    ) : null;
                                  })()}
                              </div>
                            </div>
                          ))}

                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="gap-1.5 w-full border border-dashed border-border/60 hover:border-border"
                            onClick={() => addLesson(chapter.id)}
                          >
                            <Plus className="h-3.5 w-3.5" />
                            {isEn ? "Add lesson" : "Ajouter une leçon"}
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}

              {/* Add chapter button — present once at least one
                   chapter exists. The empty state above takes care of
                   the zero-chapter case with its own CTA. */}
              <Button
                type="button"
                variant="outline"
                className="gap-2 w-full"
                onClick={addChapter}
              >
                <Plus className="h-4 w-4" />
                {isEn ? "Add chapter" : "Ajouter un chapitre"}
              </Button>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

/* ─── Reusable form primitives ──────────────────────────────── */
/**
 * Mono uppercase preheader + tight title pattern used across all
 * admin pages. Adding it here too keeps the "I'm in section X" signal
 * consistent across the entire admin surface.
 */
function SectionHeader({
  preheader,
  title,
  hint,
}: {
  preheader: string;
  title: string;
  hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        / {preheader}
      </p>
      <h2 className="text-base font-medium tracking-tight text-foreground">
        {title}
      </h2>
      {hint && (
        <p className="text-xs text-muted-foreground/70 max-w-prose">{hint}</p>
      )}
    </div>
  );
}

/**
 * Field — label + input wrapper. Label uses smaller weight than the
 * default <Label> so it doesn't compete with the field's value for
 * attention. Required fields get a destructive-toned star instead of
 * a hard red splash.
 */
function Field({
  label,
  htmlFor,
  required,
  hint,
  children,
}: {
  label: string;
  htmlFor?: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label
        htmlFor={htmlFor}
        className="text-[13px] font-normal text-muted-foreground"
      >
        {label}
        {required && (
          <span className="ml-1 text-destructive/80">*</span>
        )}
      </Label>
      {children}
      {hint && (
        <p className="text-[11px] text-muted-foreground/70 leading-relaxed">
          {hint}
        </p>
      )}
    </div>
  );
}

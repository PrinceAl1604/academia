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
  Save,
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
function newId() { return `temp-${++tempId}`; }

export default function AdminCourseNewPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const isEn = t.nav.signIn === "Sign In";

  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [saving, setSaving] = useState(false);
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
  const [isPublished, setIsPublished] = useState(false);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);

  // Chapters (modules + lessons)
  const [chapters, setChapters] = useState<Chapter[]>([]);

  useEffect(() => {
    getCategories().then(setCategories);
  }, []);

  useEffect(() => {
    setSlug(slugify(title));
  }, [title]);

  // ─── Chapter management ────────────────────────────────────────────

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

  const updateChapter = (id: string, field: string, value: string | boolean) => {
    setChapters((prev) =>
      prev.map((ch) => (ch.id === id ? { ...ch, [field]: value } : ch))
    );
  };

  const removeChapter = (id: string) => {
    setChapters((prev) => prev.filter((ch) => ch.id !== id));
  };

  const toggleChapter = (id: string) => {
    setChapters((prev) =>
      prev.map((ch) => (ch.id === id ? { ...ch, expanded: !ch.expanded } : ch))
    );
  };

  // ─── Lesson management ─────────────────────────────────────────────

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

  // ─── Save ──────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { setError("Title is required"); return; }

    setSaving(true);
    setError(null);

    try {
      // Calculate totals from chapters
      const totalLessons = chapters.reduce((sum, ch) => sum + ch.lessons.length, 0);
      const totalDuration = chapters.reduce(
        (sum, ch) => sum + ch.lessons.reduce((s, l) => s + (parseInt(l.durationMinutes) || 0), 0),
        0
      );

      // 1. Create the course
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
        is_published: isPublished,
        cover_url: coverUrl || undefined,
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      });

      // 2. Create chapters (modules) and lessons
      for (let i = 0; i < chapters.length; i++) {
        const ch = chapters[i];
        if (!ch.title.trim()) continue;

        const mod = await createModule({
          course_id: course.id,
          title: ch.title.trim(),
          sort_order: i,
        });

        // Update module description
        if (ch.description.trim()) {
          await supabase
            .from("modules")
            .update({ description: ch.description.trim() })
            .eq("id", mod.id);
        }

        // Create lessons
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
      setError(err instanceof Error ? err.message : "Failed to create course");
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/admin/courses"
          className="flex h-9 w-9 items-center justify-center rounded-lg border hover:bg-muted/40"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-2xl font-bold text-foreground">
          {t.admin.createCourse}
        </h1>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 lg:grid-cols-2">
        {/* ─── LEFT: Course Details ───────────────────────────── */}
        <div className="space-y-6">
        <Card>
          <CardContent className="space-y-6 pt-6">
            {/* Cover Image */}
            <div className="space-y-2">
              <Label>{isEn ? "Cover Image" : "Image de couverture"}</Label>
              <CoverUpload value={coverUrl} onChange={setCoverUrl} courseSlug={slug} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">{t.admin.courseTitle} *</Label>
              <Input
                id="title"
                placeholder="e.g. Complete UI/UX Design Masterclass"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">URL Slug</Label>
              <Input
                id="slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground/70">/courses/{slug || "..."}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">{t.admin.courseDescription}</Label>
              <Textarea
                id="description"
                placeholder={isEn ? "Describe what students will learn..." : "Décrivez ce que les étudiants apprendront..."}
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {/* Category */}
              <div className="space-y-2">
                <Label>{t.admin.category}</Label>
                {categories.length > 0 ? (
                  <div className="space-y-2">
                    <Select value={categoryId} onValueChange={(v) => setCategoryId(v ?? "")}>
                      <SelectTrigger>
                        <SelectValue placeholder={t.admin.selectCategory}>
                          {categories.find((c) => c.id === categoryId)?.name || t.admin.selectCategory}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {!creatingCat ? (
                      <button type="button" onClick={() => setCreatingCat(true)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground/90">
                        <Plus className="h-3 w-3" /> {isEn ? "Add new" : "Ajouter"}
                      </button>
                    ) : (
                      <div className="flex gap-2">
                        <Input placeholder={isEn ? "Category name" : "Nom"} value={newCatName} onChange={(e) => setNewCatName(e.target.value)} className="h-8 text-xs" autoFocus
                          onKeyDown={async (e) => {
                            if (e.key === "Enter" && newCatName.trim()) {
                              e.preventDefault();
                              const { data } = await supabase.from("categories").insert({ name: newCatName.trim(), slug: slugify(newCatName) }).select().single();
                              if (data) { setCategories((prev) => [...prev, data]); setCategoryId(data.id); setNewCatName(""); setCreatingCat(false); }
                            }
                            if (e.key === "Escape") { setCreatingCat(false); setNewCatName(""); }
                          }}
                        />
                        <Button type="button" size="sm" className="h-8 text-xs"
                          onClick={async () => {
                            if (!newCatName.trim()) return;
                            const { data } = await supabase.from("categories").insert({ name: newCatName.trim(), slug: slugify(newCatName) }).select().single();
                            if (data) { setCategories((prev) => [...prev, data]); setCategoryId(data.id); setNewCatName(""); setCreatingCat(false); }
                          }}>Add</Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-border p-3 text-center">
                    <FolderOpen className="mx-auto h-5 w-5 text-muted-foreground/70" />
                    <p className="mt-1 text-xs text-muted-foreground">{isEn ? "No categories yet" : "Aucune catégorie"}</p>
                    <div className="mt-2 flex gap-2 justify-center">
                      <Input placeholder={isEn ? "e.g. UI/UX Design" : "ex. UI/UX Design"} value={newCatName} onChange={(e) => setNewCatName(e.target.value)} className="h-8 max-w-[180px] text-xs"
                        onKeyDown={async (e) => {
                          if (e.key === "Enter" && newCatName.trim()) {
                            e.preventDefault();
                            const { data } = await supabase.from("categories").insert({ name: newCatName.trim(), slug: slugify(newCatName) }).select().single();
                            if (data) { setCategories((prev) => [...prev, data]); setCategoryId(data.id); setNewCatName(""); }
                          }
                        }}
                      />
                      <Button type="button" size="sm" className="h-8 gap-1 text-xs"
                        onClick={async () => {
                          if (!newCatName.trim()) return;
                          const { data } = await supabase.from("categories").insert({ name: newCatName.trim(), slug: slugify(newCatName) }).select().single();
                          if (data) { setCategories((prev) => [...prev, data]); setCategoryId(data.id); setNewCatName(""); }
                        }}>
                        <Plus className="h-3 w-3" /> {isEn ? "Create" : "Créer"}
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Level */}
              <div className="space-y-2">
                <Label>{t.admin.selectLevel}</Label>
                <Select value={level} onValueChange={(v) => setLevel(v ?? "Beginner")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Beginner">Beginner</SelectItem>
                    <SelectItem value="Intermediate">Intermediate</SelectItem>
                    <SelectItem value="Advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tags">{t.admin.tags}</Label>
              <Input id="tags" placeholder={t.admin.tagsPlaceholder} value={tags} onChange={(e) => setTags(e.target.value)} />
              <p className="text-xs text-muted-foreground/70">{isEn ? "Separate with commas: design, figma, prototyping" : "Séparez par des virgules"}</p>
            </div>

            {/* Toggles */}
            <div className="space-y-4 rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>{isEn ? "Free Course" : "Cours gratuit"}</Label>
                  <p className="text-xs text-muted-foreground">{isEn ? "Available without membership" : "Disponible sans abonnement"}</p>
                </div>
                <Switch checked={isFree} onCheckedChange={setIsFree} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>{isEn ? "Published" : "Publié"}</Label>
                  <p className="text-xs text-muted-foreground">{isEn ? "Visible to students" : "Visible par les étudiants"}</p>
                </div>
                <Switch checked={isPublished} onCheckedChange={setIsPublished} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Error + Actions under course details */}
        <div>
          {error && <p className="mb-4 text-sm text-red-500">{error}</p>}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button type="submit" className="gap-2 w-full sm:w-auto" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {t.admin.saveCourse}
            </Button>
            <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => router.push("/admin/courses")}>
              {isEn ? "Cancel" : "Annuler"}
            </Button>
          </div>
        </div>
        </div>{/* end left column */}

        {/* ─── RIGHT: Chapters & Lessons ──────────────────────── */}
        <div className="lg:sticky lg:top-20 lg:self-start space-y-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                {isEn ? "Chapters" : "Chapitres"}
              </h2>
              <p className="text-sm text-muted-foreground">
                {chapters.length} {isEn ? "chapters" : "chapitres"} · {chapters.reduce((s, c) => s + c.lessons.length, 0)} {isEn ? "lessons" : "leçons"}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {chapters.map((chapter, chIdx) => (
              <Card key={chapter.id}>
                <CardContent className="p-0">
                  {/* Chapter header */}
                  <div
                    className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/40"
                    onClick={() => toggleChapter(chapter.id)}
                  >
                    <GripVertical className="h-4 w-4 text-muted-foreground/70" />
                    {chapter.expanded ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground/70" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground/70" />
                    )}
                    <span className="flex h-6 w-6 items-center justify-center rounded bg-muted text-xs font-bold text-muted-foreground">
                      {chIdx + 1}
                    </span>
                    <span className="flex-1 text-sm font-semibold text-foreground">
                      {chapter.title || (isEn ? "Untitled Chapter" : "Chapitre sans titre")}
                    </span>
                    <span className="text-xs text-muted-foreground/70">
                      {chapter.lessons.length} {isEn ? "lessons" : "leçons"}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-red-400 hover:text-red-600"
                      onClick={(e) => { e.stopPropagation(); removeChapter(chapter.id); }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  {/* Chapter content (expanded) */}
                  {chapter.expanded && (
                    <div className="border-t px-4 py-4 space-y-4">
                      {/* Chapter title + description */}
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1">
                          <Label className="text-xs">{isEn ? "Chapter Title" : "Titre du chapitre"} *</Label>
                          <Input
                            placeholder={isEn ? "e.g. Getting Started" : "ex. Introduction"}
                            value={chapter.title}
                            onChange={(e) => updateChapter(chapter.id, "title", e.target.value)}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">{isEn ? "Description" : "Description"}</Label>
                          <Input
                            placeholder={isEn ? "Brief chapter description..." : "Brève description..."}
                            value={chapter.description}
                            onChange={(e) => updateChapter(chapter.id, "description", e.target.value)}
                          />
                        </div>
                      </div>

                      <Separator />

                      {/* Lessons */}
                      <div className="space-y-3">
                        {chapter.lessons.map((lesson, lIdx) => (
                          <div key={lesson.id} className="rounded-lg border p-3 space-y-3">
                            <div className="flex items-center gap-2">
                              <Video className="h-4 w-4 text-muted-foreground/70 shrink-0" />
                              <span className="text-xs font-medium text-muted-foreground/70">{isEn ? "Lesson" : "Leçon"} {lIdx + 1}</span>
                              <div className="flex-1" />
                              <div className="flex items-center gap-1.5">
                                <Label className="text-xs text-muted-foreground/70">{isEn ? "Free" : "Gratuit"}</Label>
                                <Switch
                                  checked={lesson.isFree}
                                  onCheckedChange={(v) => updateLesson(chapter.id, lesson.id, "isFree", v)}
                                  className="scale-75"
                                />
                              </div>
                              <Button
                                type="button" variant="ghost" size="icon" className="h-6 w-6 text-red-400"
                                onClick={() => removeLesson(chapter.id, lesson.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>

                            <Input
                              placeholder={isEn ? "Lesson title *" : "Titre de la leçon *"}
                              value={lesson.title}
                              onChange={(e) => updateLesson(chapter.id, lesson.id, "title", e.target.value)}
                              className="text-sm"
                            />

                            <Textarea
                              placeholder={isEn ? "Lesson description (optional)" : "Description de la leçon (optionnel)"}
                              value={lesson.description}
                              onChange={(e) => updateLesson(chapter.id, lesson.id, "description", e.target.value)}
                              rows={2}
                              className="text-sm"
                            />

                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <Label className="text-xs">{isEn ? "Video Embed Code" : "Code d'intégration vidéo"}</Label>
                                <div className="flex items-center gap-1">
                                  <Label className="text-xs text-muted-foreground/70">{isEn ? "Duration" : "Durée"}</Label>
                                  <Input
                                    type="number"
                                    min="0"
                                    placeholder="0"
                                    value={lesson.durationMinutes}
                                    onChange={(e) => updateLesson(chapter.id, lesson.id, "durationMinutes", e.target.value)}
                                    className="h-7 w-16 text-xs"
                                  />
                                  <span className="text-xs text-muted-foreground/70">min</span>
                                </div>
                              </div>
                              <Textarea
                                placeholder={isEn ? 'Paste YouTube embed code here — e.g. <iframe src="https://www.youtube.com/embed/...">' : 'Collez le code d\'intégration YouTube — ex. <iframe src="https://www.youtube.com/embed/...">'}
                                value={lesson.youtubeUrl}
                                onChange={(e) => updateLesson(chapter.id, lesson.id, "youtubeUrl", e.target.value)}
                                rows={2}
                                className="text-xs font-mono"
                              />
                              {/* Live video preview */}
                              {lesson.youtubeUrl && (() => {
                                const idMatch = lesson.youtubeUrl.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
                                const videoId = idMatch?.[1];
                                return videoId ? (
                                  <div className="aspect-video w-full overflow-hidden rounded-lg border bg-black">
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
                          variant="outline"
                          size="sm"
                          className="gap-1.5 w-full"
                          onClick={() => addLesson(chapter.id)}
                        >
                          <Plus className="h-3.5 w-3.5" />
                          {isEn ? "Add Lesson" : "Ajouter une leçon"}
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}

            {/* Add chapter button */}
            <Button
              type="button"
              variant="outline"
              className="gap-2 w-full h-12"
              onClick={addChapter}
            >
              <Plus className="h-4 w-4" />
              {isEn ? "Add Chapter" : "Ajouter un chapitre"}
            </Button>
          </div>
        </div>{/* end right column */}
        </div>{/* end grid */}
      </form>
    </div>
  );
}

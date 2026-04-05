"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n/language-context";
import {
  getCategories,
  updateCourse,
  type CategoryRow,
} from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Loader2, Save, Plus, FolderOpen } from "lucide-react";
import { CoverUpload } from "@/components/admin/cover-upload";

function slugify(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function AdminCourseEditPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const { t } = useLanguage();
  const isEn = t.nav.signIn === "Sign In";

  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [level, setLevel] = useState("Beginner");
  const [tags, setTags] = useState("");
  const [isFree, setIsFree] = useState(false);
  const [isPublished, setIsPublished] = useState(false);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);

  // Inline category creation
  const [creatingCat, setCreatingCat] = useState(false);
  const [newCatName, setNewCatName] = useState("");

  useEffect(() => {
    async function load() {
      const cats = await getCategories();
      setCategories(cats);

      const { data: course } = await supabase
        .from("courses")
        .select("*")
        .eq("id", id)
        .single();

      if (course) {
        setTitle(course.title || "");
        setSlug(course.slug || "");
        setDescription(course.description || "");
        setCategoryId(course.category_id || "");
        setLevel(course.level || "Beginner");
        setTags((course.tags || []).join(", "));
        setIsFree(course.is_free || false);
        setIsPublished(course.is_published || false);
        setCoverUrl(course.cover_url || null);
      }
      setLoading(false);
    }
    load();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError(isEn ? "Title is required" : "Le titre est requis");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await updateCourse(id, {
        title: title.trim(),
        slug,
        description: description.trim(),
        category_id: categoryId || undefined,
        level,
        is_free: isFree,
        is_published: isPublished,
        cover_url: coverUrl || undefined,
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      });

      router.push("/admin/courses");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update course");
      setSaving(false);
    }
  };

  const createCategory = async () => {
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
      <div className="flex items-center gap-4">
        <Link
          href="/admin/courses"
          className="flex h-9 w-9 items-center justify-center rounded-lg border hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
          {isEn ? "Edit Course" : "Modifier le cours"}
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

                {/* Title */}
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

                {/* Slug */}
                <div className="space-y-2">
                  <Label htmlFor="slug">URL Slug</Label>
                  <Input
                    id="slug"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-neutral-400">/courses/{slug || "..."}</p>
                </div>

                {/* Description */}
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

                {/* Category + Level */}
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
                          <button type="button" onClick={() => setCreatingCat(true)} className="flex items-center gap-1 text-xs text-neutral-500 hover:text-neutral-700">
                            <Plus className="h-3 w-3" /> {isEn ? "Add new" : "Ajouter"}
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
                                if (e.key === "Enter") { e.preventDefault(); createCategory(); }
                                if (e.key === "Escape") { setCreatingCat(false); setNewCatName(""); }
                              }}
                            />
                            <Button type="button" size="sm" className="h-8 text-xs" onClick={createCategory}>
                              {isEn ? "Add" : "Créer"}
                            </Button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="rounded-lg border border-dashed border-neutral-300 dark:border-neutral-700 p-3 text-center">
                        <FolderOpen className="mx-auto h-5 w-5 text-neutral-300" />
                        <p className="mt-1 text-xs text-neutral-500">{isEn ? "No categories yet" : "Aucune catégorie"}</p>
                        <div className="mt-2 flex gap-2 justify-center">
                          <Input
                            placeholder={isEn ? "e.g. UI/UX Design" : "ex. UI/UX Design"}
                            value={newCatName}
                            onChange={(e) => setNewCatName(e.target.value)}
                            className="h-8 max-w-[180px] text-xs"
                            onKeyDown={(e) => {
                              if (e.key === "Enter") { e.preventDefault(); createCategory(); }
                            }}
                          />
                          <Button type="button" size="sm" className="h-8 gap-1 text-xs" onClick={createCategory}>
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

                {/* Tags */}
                <div className="space-y-2">
                  <Label htmlFor="tags">{t.admin.tags}</Label>
                  <Input
                    id="tags"
                    placeholder={t.admin.tagsPlaceholder}
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                  />
                  <p className="text-xs text-neutral-400">{isEn ? "Separate with commas: design, figma, prototyping" : "Séparez par des virgules"}</p>
                </div>

                {/* Toggles */}
                <div className="space-y-4 rounded-lg border p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>{isEn ? "Free Course" : "Cours gratuit"}</Label>
                      <p className="text-xs text-neutral-500">{isEn ? "Available without membership" : "Disponible sans abonnement"}</p>
                    </div>
                    <Switch checked={isFree} onCheckedChange={setIsFree} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>{isEn ? "Published" : "Publié"}</Label>
                      <p className="text-xs text-neutral-500">{isEn ? "Visible to students" : "Visible par les étudiants"}</p>
                    </div>
                    <Switch checked={isPublished} onCheckedChange={setIsPublished} />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Error + Actions */}
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
          </div>

          {/* ─── RIGHT: Curriculum & Info ──────────────────────── */}
          <div className="lg:sticky lg:top-20 lg:self-start space-y-4">
            {/* Curriculum Editor Link */}
            <Card>
              <CardContent className="space-y-4 pt-6">
                <div>
                  <p className="font-semibold text-neutral-900 dark:text-white">
                    {t.courseDetail.curriculum}
                  </p>
                  <p className="text-sm text-neutral-500">
                    {isEn ? "Add chapters and lessons with video embeds" : "Ajoutez des chapitres et leçons avec des vidéos"}
                  </p>
                </div>
                <Button
                  variant="outline"
                  render={<Link href={`/admin/courses/${id}/curriculum`} />}
                  className="w-full gap-1.5"
                >
                  {isEn ? "Edit Curriculum" : "Modifier le programme"} →
                </Button>
              </CardContent>
            </Card>

            {/* Quick Info */}
            <Card>
              <CardContent className="space-y-3 pt-6">
                <p className="text-xs font-medium uppercase tracking-wider text-neutral-400">
                  {isEn ? "Quick Info" : "Aperçu"}
                </p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-neutral-500">{isEn ? "Status" : "Statut"}</span>
                    <span className={isPublished ? "text-green-600 font-medium" : "text-neutral-400"}>
                      {isPublished ? (isEn ? "Published" : "Publié") : (isEn ? "Draft" : "Brouillon")}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">{isEn ? "Access" : "Accès"}</span>
                    <span className="text-neutral-700 dark:text-neutral-300">{isFree ? (isEn ? "Free" : "Gratuit") : "Pro"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">{isEn ? "Level" : "Niveau"}</span>
                    <span className="text-neutral-700 dark:text-neutral-300">{level}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}

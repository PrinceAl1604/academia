"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n/language-context";
import {
  getCategories,
  createCourse,
  type CategoryRow,
} from "@/lib/api";
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
import { supabase } from "@/lib/supabase";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export default function AdminCourseNewPage() {
  const { t } = useLanguage();
  const router = useRouter();

  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [creatingCat, setCreatingCat] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [level, setLevel] = useState("Beginner");
  const [durationHours, setDurationHours] = useState("");
  const [totalLessons, setTotalLessons] = useState("");
  const [youtubePreviewUrl, setYoutubePreviewUrl] = useState("");
  const [tags, setTags] = useState("");
  const [isFree, setIsFree] = useState(false);
  const [isPublished, setIsPublished] = useState(false);

  useEffect(() => {
    getCategories().then(setCategories);
  }, []);

  // Auto-generate slug from title
  useEffect(() => {
    setSlug(slugify(title));
  }, [title]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Title is required");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await createCourse({
        title: title.trim(),
        slug: slug || slugify(title),
        description: description.trim() || undefined,
        category_id: categoryId || undefined,
        instructor_id: "9febd714-0bea-4710-acea-90d8d14b32db", // Auto-assign to Alex Landrin
        level,
        duration_hours: parseInt(durationHours) || 0,
        total_lessons: parseInt(totalLessons) || 0,
        is_free: isFree,
        is_published: isPublished,
        youtube_preview_url: youtubePreviewUrl.trim() || undefined,
        tags: tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      });

      router.push("/admin/courses");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to create course";
      setError(message);
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/admin/courses"
          className="flex h-9 w-9 items-center justify-center rounded-lg border hover:bg-neutral-50"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-2xl font-bold text-neutral-900">
          {t.admin.createCourse}
        </h1>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardContent className="space-y-6 pt-6">
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
                placeholder="auto-generated-from-title"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="font-mono text-sm"
              />
              <p className="text-xs text-neutral-400">
                /courses/{slug || "..."}
              </p>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">{t.admin.courseDescription}</Label>
              <Textarea
                id="description"
                placeholder="Describe what students will learn..."
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {/* Category + Level row */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{t.admin.category}</Label>
                {categories.length > 0 ? (
                  <div className="space-y-2">
                    <Select
                      value={categoryId}
                      onValueChange={(v) => setCategoryId(v ?? "")}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t.admin.selectCategory} />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {/* Quick add */}
                    {!creatingCat ? (
                      <button
                        type="button"
                        onClick={() => setCreatingCat(true)}
                        className="flex items-center gap-1 text-xs text-neutral-500 hover:text-neutral-700"
                      >
                        <Plus className="h-3 w-3" /> Add new category
                      </button>
                    ) : (
                      <div className="flex gap-2">
                        <Input
                          placeholder="Category name"
                          value={newCatName}
                          onChange={(e) => setNewCatName(e.target.value)}
                          className="h-8 text-xs"
                          autoFocus
                          onKeyDown={async (e) => {
                            if (e.key === "Enter" && newCatName.trim()) {
                              e.preventDefault();
                              const { data } = await supabase
                                .from("categories")
                                .insert({ name: newCatName.trim(), slug: newCatName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-") })
                                .select()
                                .single();
                              if (data) {
                                setCategories((prev) => [...prev, data]);
                                setCategoryId(data.id);
                                setNewCatName("");
                                setCreatingCat(false);
                              }
                            }
                            if (e.key === "Escape") { setCreatingCat(false); setNewCatName(""); }
                          }}
                        />
                        <Button
                          type="button"
                          size="sm"
                          className="h-8 text-xs"
                          onClick={async () => {
                            if (!newCatName.trim()) return;
                            const { data } = await supabase
                              .from("categories")
                              .insert({ name: newCatName.trim(), slug: newCatName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-") })
                              .select()
                              .single();
                            if (data) {
                              setCategories((prev) => [...prev, data]);
                              setCategoryId(data.id);
                              setNewCatName("");
                              setCreatingCat(false);
                            }
                          }}
                        >
                          Add
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Empty state — no categories exist */
                  <div className="rounded-lg border border-dashed border-neutral-300 p-4 text-center">
                    <FolderOpen className="mx-auto h-6 w-6 text-neutral-300" />
                    <p className="mt-2 text-sm text-neutral-500">
                      {t.nav.signIn === "Sign In" ? "No categories yet" : "Aucune catégorie"}
                    </p>
                    <div className="mt-3 flex gap-2 justify-center">
                      <Input
                        placeholder={t.nav.signIn === "Sign In" ? "e.g. UI/UX Design" : "ex. UI/UX Design"}
                        value={newCatName}
                        onChange={(e) => setNewCatName(e.target.value)}
                        className="h-9 max-w-[200px] text-sm"
                        onKeyDown={async (e) => {
                          if (e.key === "Enter" && newCatName.trim()) {
                            e.preventDefault();
                            const { data } = await supabase
                              .from("categories")
                              .insert({ name: newCatName.trim(), slug: newCatName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-") })
                              .select()
                              .single();
                            if (data) {
                              setCategories((prev) => [...prev, data]);
                              setCategoryId(data.id);
                              setNewCatName("");
                            }
                          }
                        }}
                      />
                      <Button
                        type="button"
                        size="sm"
                        className="h-9 gap-1"
                        onClick={async () => {
                          if (!newCatName.trim()) return;
                          const { data } = await supabase
                            .from("categories")
                            .insert({ name: newCatName.trim(), slug: newCatName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-") })
                            .select()
                            .single();
                          if (data) {
                            setCategories((prev) => [...prev, data]);
                            setCategoryId(data.id);
                            setNewCatName("");
                          }
                        }}
                      >
                        <Plus className="h-3.5 w-3.5" />
                        {t.nav.signIn === "Sign In" ? "Create" : "Créer"}
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>{t.admin.selectLevel}</Label>
                <Select value={level} onValueChange={(v) => setLevel(v ?? "Beginner")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Beginner">Beginner</SelectItem>
                    <SelectItem value="Intermediate">Intermediate</SelectItem>
                    <SelectItem value="Advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Duration + Lessons row */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="duration">Duration (hours)</Label>
                <Input
                  id="duration"
                  type="number"
                  min="0"
                  placeholder="42"
                  value={durationHours}
                  onChange={(e) => setDurationHours(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lessons">Total Lessons</Label>
                <Input
                  id="lessons"
                  type="number"
                  min="0"
                  placeholder="12"
                  value={totalLessons}
                  onChange={(e) => setTotalLessons(e.target.value)}
                />
              </div>
            </div>

            {/* YouTube Preview URL */}
            <div className="space-y-2">
              <Label htmlFor="youtube">YouTube Preview URL</Label>
              <Input
                id="youtube"
                placeholder="https://www.youtube.com/watch?v=..."
                value={youtubePreviewUrl}
                onChange={(e) => setYoutubePreviewUrl(e.target.value)}
              />
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
              <p className="text-xs text-neutral-400">
                Separate with commas: design, figma, prototyping
              </p>
            </div>

            {/* Toggles */}
            <div className="space-y-4 rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Free Course</Label>
                  <p className="text-xs text-neutral-500">
                    Available to all users without membership
                  </p>
                </div>
                <Switch checked={isFree} onCheckedChange={setIsFree} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Published</Label>
                  <p className="text-xs text-neutral-500">
                    Visible to students on the browse page
                  </p>
                </div>
                <Switch
                  checked={isPublished}
                  onCheckedChange={setIsPublished}
                />
              </div>
            </div>

            {/* Error */}
            {error && (
              <p className="text-sm text-red-500">{error}</p>
            )}

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
              <Button type="submit" className="gap-2" disabled={saving}>
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {t.admin.saveCourse}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/admin/courses")}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}

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
import { ArrowLeft, Loader2, Save } from "lucide-react";

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

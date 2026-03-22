"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  getCategories,
  getInstructors,
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
import { ArrowLeft, Loader2, Save } from "lucide-react";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function AdminCourseEditPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();

  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [instructors, setInstructors] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [instructorId, setInstructorId] = useState("");
  const [level, setLevel] = useState("Beginner");
  const [durationHours, setDurationHours] = useState("");
  const [totalLessons, setTotalLessons] = useState("");
  const [youtubePreviewUrl, setYoutubePreviewUrl] = useState("");
  const [tags, setTags] = useState("");
  const [isFree, setIsFree] = useState(false);
  const [isPublished, setIsPublished] = useState(false);

  useEffect(() => {
    async function load() {
      const [cats, insts] = await Promise.all([
        getCategories(),
        getInstructors(),
      ]);
      setCategories(cats);
      setInstructors(insts);

      // Load existing course
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
        setInstructorId(course.instructor_id || "");
        setLevel(course.level || "Beginner");
        setDurationHours(String(course.duration_hours || ""));
        setTotalLessons(String(course.total_lessons || ""));
        setYoutubePreviewUrl(course.youtube_preview_url || "");
        setTags((course.tags || []).join(", "));
        setIsFree(course.is_free || false);
        setIsPublished(course.is_published || false);
      }
      setLoading(false);
    }
    load();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Title is required");
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
        instructor_id: instructorId || undefined,
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
      const message = err instanceof Error ? err.message : "Failed to update course";
      setError(message);
      setSaving(false);
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
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/admin/courses"
          className="flex h-9 w-9 items-center justify-center rounded-lg border hover:bg-neutral-50"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-2xl font-bold text-neutral-900">Edit Course</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardContent className="space-y-6 pt-6">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Course Title *</Label>
              <Input
                id="title"
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
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {/* Category + Level */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={categoryId}
                  onValueChange={(v) => setCategoryId(v ?? "")}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
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
                <Label>Level</Label>
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

            {/* Instructor */}
            <div className="space-y-2">
              <Label>Instructor</Label>
              <Select
                value={instructorId}
                onValueChange={(v) => setInstructorId(v ?? "")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select instructor" />
                </SelectTrigger>
                <SelectContent>
                  {instructors.map((inst) => (
                    <SelectItem key={inst.id} value={inst.id}>
                      {inst.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Duration + Lessons */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="duration">Duration (hours)</Label>
                <Input
                  id="duration"
                  type="number"
                  min="0"
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
                  value={totalLessons}
                  onChange={(e) => setTotalLessons(e.target.value)}
                />
              </div>
            </div>

            {/* YouTube URL */}
            <div className="space-y-2">
              <Label htmlFor="youtube">YouTube Preview URL</Label>
              <Input
                id="youtube"
                value={youtubePreviewUrl}
                onChange={(e) => setYoutubePreviewUrl(e.target.value)}
              />
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <Label htmlFor="tags">Tags</Label>
              <Input
                id="tags"
                placeholder="design, figma, prototyping"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
              />
              <p className="text-xs text-neutral-400">Separate with commas</p>
            </div>

            {/* Toggles */}
            <div className="space-y-4 rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Free Course</Label>
                  <p className="text-xs text-neutral-500">
                    Available without membership
                  </p>
                </div>
                <Switch checked={isFree} onCheckedChange={setIsFree} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Published</Label>
                  <p className="text-xs text-neutral-500">
                    Visible to students
                  </p>
                </div>
                <Switch
                  checked={isPublished}
                  onCheckedChange={setIsPublished}
                />
              </div>
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
              <Button type="submit" className="gap-2" disabled={saving}>
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save Changes
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

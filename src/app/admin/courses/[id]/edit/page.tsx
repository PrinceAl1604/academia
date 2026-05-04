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
import {
  ArrowLeft,
  Loader2,
  Plus,
  FolderOpen,
  ArrowRight,
  Eye,
  EyeOff,
} from "lucide-react";
import { CoverUpload } from "@/components/admin/cover-upload";

/**
 * Admin — edit course form (refactored to match /new and the rest of
 * the admin design language). Same SectionHeader + Field primitives,
 * sticky save bar, sectioned body, restyled right sidebar.
 *
 * Edit-specific differences from /new:
 *   - Single "Save changes" button in header (no "Save as draft" /
 *     "Publish" split — that decision was made at creation time).
 *   - Right sidebar swaps the chapters scaffold for two compact info
 *     cards: a curriculum-editor link and an "Aperçu" status preview.
 *   - Cover upload renders with the current cover already loaded.
 */

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
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

  const handleSave = async () => {
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
        tags: tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
      });

      router.push("/admin/courses");
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to update course"
      );
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
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/70" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* ─── Sticky header bar ──────────────────────────────────
           Save action lives at the top so it's reachable from any
           scroll position — long forms shouldn't hide their primary
           action below the fold. */}
      <header className="sticky top-0 z-20 -mx-4 lg:-mx-8 px-4 lg:px-8 py-4 bg-background/85 backdrop-blur-md border-b border-border/60">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div className="space-y-1.5 min-w-0">
            <Link
              href="/admin/courses"
              className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-3 w-3" />
              / Courses / Edit
            </Link>
            <h1 className="text-2xl sm:text-3xl font-medium tracking-tight text-foreground truncate max-w-prose">
              {title || (isEn ? "Edit course" : "Modifier le cours")}
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
            <Button type="button" onClick={handleSave} disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              {isEn ? "Save changes" : "Enregistrer"}
            </Button>
          </div>
        </div>
        {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
      </header>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] py-8">
        {/* ─── LEFT: Course details ───────────────────────────── */}
        <div className="space-y-8 max-w-xl">
          {/* ─── Section 1: BASICS ─────────────────────────── */}
          <section className="space-y-4">
            <SectionHeader
              preheader={isEn ? "Basics" : "Informations"}
              title={isEn ? "Course details" : "Détails du cours"}
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
                              createCategory();
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
                          onClick={createCategory}
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
                            createCategory();
                          }
                        }}
                      />
                      <Button
                        type="button"
                        size="sm"
                        className="h-8 gap-1 text-xs"
                        onClick={createCategory}
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
              title={isEn ? "Access & visibility" : "Accès & visibilité"}
            />

            <div className="rounded-lg border border-border/60 bg-card divide-y divide-border/60">
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
              <label className="flex items-center justify-between gap-4 px-4 py-3 cursor-pointer">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">
                    {isEn ? "Published" : "Publié"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {isEn
                      ? "Visible to students in the catalog."
                      : "Visible par les étudiants dans le catalogue."}
                  </p>
                </div>
                <Switch
                  checked={isPublished}
                  onCheckedChange={setIsPublished}
                />
              </label>
            </div>
          </section>
        </div>
        {/* end LEFT */}

        {/* ─── RIGHT: Sidebar (curriculum link + Aperçu) ──────── */}
        <aside className="space-y-6 lg:sticky lg:top-32 lg:self-start">
          {/* Curriculum editor entrypoint */}
          <section className="space-y-3">
            <SectionHeader
              preheader={isEn ? "Curriculum" : "Programme"}
              title={isEn ? "Chapters & lessons" : "Chapitres & leçons"}
              hint={
                isEn
                  ? "Manage the structure and content separately."
                  : "Gérez la structure et le contenu séparément."
              }
            />
            <Card>
              <CardContent className="p-4">
                <Button
                  variant="outline"
                  render={
                    <Link href={`/admin/courses/${id}/curriculum`} />
                  }
                  className="w-full gap-1.5"
                >
                  {isEn ? "Edit curriculum" : "Modifier le programme"}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </CardContent>
            </Card>
          </section>

          {/* Live preview of saved settings — uses the same metadata
               typography as the rest of the admin pages. */}
          <section className="space-y-3">
            <SectionHeader
              preheader={isEn ? "Preview" : "Aperçu"}
              title={isEn ? "What students see" : "Ce que voient les étudiants"}
            />
            <Card>
              <CardContent className="p-4 divide-y divide-border/60">
                <PreviewRow
                  label={isEn ? "Status" : "Statut"}
                  value={
                    <span
                      className={
                        isPublished
                          ? "inline-flex items-center gap-1.5 text-primary"
                          : "inline-flex items-center gap-1.5 text-muted-foreground"
                      }
                    >
                      {isPublished ? (
                        <Eye className="h-3.5 w-3.5" />
                      ) : (
                        <EyeOff className="h-3.5 w-3.5" />
                      )}
                      {isPublished
                        ? isEn
                          ? "Published"
                          : "Publié"
                        : isEn
                        ? "Draft"
                        : "Brouillon"}
                    </span>
                  }
                />
                <PreviewRow
                  label={isEn ? "Access" : "Accès"}
                  value={
                    isFree ? (
                      <span className="text-amber-500 font-medium">
                        {isEn ? "Free" : "Gratuit"}
                      </span>
                    ) : (
                      <span className="text-foreground/90">Pro</span>
                    )
                  }
                />
                <PreviewRow
                  label={isEn ? "Level" : "Niveau"}
                  value={<span className="text-foreground/90">{level}</span>}
                />
                {categoryId && (
                  <PreviewRow
                    label={isEn ? "Category" : "Catégorie"}
                    value={
                      <span className="text-foreground/90 truncate max-w-[180px] block">
                        {categories.find((c) => c.id === categoryId)?.name ||
                          "—"}
                      </span>
                    }
                  />
                )}
              </CardContent>
            </Card>
          </section>
        </aside>
      </div>
    </div>
  );
}

/* ─── Reusable form primitives (mirror /admin/courses/new) ───
 * Duplicated locally for now — both /new and /edit use the same
 * shape. If we add a third course-form page (e.g. duplicate-course),
 * extract these to src/components/admin/form-primitives.tsx.
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
        {required && <span className="ml-1 text-destructive/80">*</span>}
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

/**
 * Label-value row used by the Aperçu sidebar card. De-emphasized
 * label + emphasized value — the inverse of the form's hierarchy.
 */
function PreviewRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium tabular-nums">{value}</span>
    </div>
  );
}

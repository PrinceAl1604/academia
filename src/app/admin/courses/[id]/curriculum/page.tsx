"use client";

import { useState, useEffect, use, useCallback } from "react";
import Link from "next/link";
import {
  getModulesForCourse,
  createModule,
  updateModule,
  deleteModule,
  createLesson,
  updateLesson,
  deleteLesson,
  syncCourseTotals,
  type ModuleRow,
  type LessonRow,
} from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
  Plus,
  Trash2,
  GripVertical,
  Video,
  FileText,
  HelpCircle,
  Loader2,
  Save,
  ChevronDown,
  ChevronRight,
  Youtube,
} from "lucide-react";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function CurriculumEditorPage({ params }: PageProps) {
  const { id: courseId } = use(params);
  const [courseTitle, setCourseTitle] = useState("");
  const [modules, setModules] = useState<ModuleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

  // New module form
  const [newModuleTitle, setNewModuleTitle] = useState("");
  const [addingModule, setAddingModule] = useState(false);

  const loadData = useCallback(async () => {
    const [modulesData, courseData] = await Promise.all([
      getModulesForCourse(courseId),
      supabase.from("courses").select("title").eq("id", courseId).single(),
    ]);
    setModules(modulesData);
    setCourseTitle(courseData.data?.title || "Course");
    setLoading(false);
    // Expand all by default
    setExpandedModules(new Set(modulesData.map((m) => m.id)));
    // Sync totals on load (fixes any stale 0 values)
    syncCourseTotals(courseId);
  }, [courseId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const toggleModule = (id: string) => {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // ─── Module Actions ─────────────────────────────────────────────────────

  const handleAddModule = async () => {
    if (!newModuleTitle.trim()) return;
    setAddingModule(true);
    try {
      const mod = await createModule({
        course_id: courseId,
        title: newModuleTitle.trim(),
        sort_order: modules.length,
      });
      setModules((prev) => [...prev, { ...mod, lessons: [] }]);
      setExpandedModules((prev) => new Set([...prev, mod.id]));
      setNewModuleTitle("");
      syncCourseTotals(courseId);
    } catch (err) {
      alert("Failed to create chapter");
    }
    setAddingModule(false);
  };

  const handleUpdateModuleTitle = async (moduleId: string, title: string) => {
    try {
      await updateModule(moduleId, { title });
      setModules((prev) =>
        prev.map((m) => (m.id === moduleId ? { ...m, title } : m))
      );
    } catch (err) {
      alert("Failed to update chapter");
    }
  };

  const handleDeleteModule = async (moduleId: string, title: string) => {
    if (!confirm(`Delete chapter "${title}" and all its lessons?`)) return;
    try {
      await deleteModule(moduleId);
      setModules((prev) => prev.filter((m) => m.id !== moduleId));
      syncCourseTotals(courseId);
    } catch (err) {
      alert("Failed to delete chapter");
    }
  };

  // ─── Lesson Actions ─────────────────────────────────────────────────────

  const handleAddLesson = async (moduleId: string) => {
    const module = modules.find((m) => m.id === moduleId);
    if (!module) return;
    try {
      const lesson = await createLesson({
        module_id: moduleId,
        title: "New Lesson",
        type: "video",
        sort_order: module.lessons.length,
      });
      setModules((prev) =>
        prev.map((m) =>
          m.id === moduleId
            ? { ...m, lessons: [...m.lessons, lesson] }
            : m
        )
      );
      syncCourseTotals(courseId);
    } catch (err) {
      alert("Failed to add lesson");
    }
  };

  const handleUpdateLesson = async (
    moduleId: string,
    lessonId: string,
    updates: Record<string, unknown>
  ) => {
    try {
      await updateLesson(lessonId, updates as Parameters<typeof updateLesson>[1]);
      setModules((prev) =>
        prev.map((m) =>
          m.id === moduleId
            ? {
                ...m,
                lessons: m.lessons.map((l) =>
                  l.id === lessonId ? { ...l, ...updates } : l
                ),
              }
            : m
        )
      );
      // Sync totals when duration changes
      if ("duration_minutes" in updates) syncCourseTotals(courseId);
    } catch (err) {
      alert("Failed to update lesson");
    }
  };

  const handleDeleteLesson = async (moduleId: string, lessonId: string) => {
    try {
      await deleteLesson(lessonId);
      setModules((prev) =>
        prev.map((m) =>
          m.id === moduleId
            ? { ...m, lessons: m.lessons.filter((l) => l.id !== lessonId) }
            : m
        )
      );
      syncCourseTotals(courseId);
    } catch (err) {
      alert("Failed to delete lesson");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
      </div>
    );
  }

  const totalLessons = modules.reduce((a, m) => a + m.lessons.length, 0);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href={`/admin/courses/${courseId}/edit`}
          className="flex h-9 w-9 items-center justify-center rounded-lg border hover:bg-neutral-50"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">
            Curriculum Editor
          </h1>
          <p className="text-sm text-neutral-500">
            {courseTitle} · {modules.length} chapters · {totalLessons} lessons
          </p>
        </div>
      </div>

      {/* Modules List */}
      <div className="space-y-4">
        {modules.map((module, moduleIdx) => (
          <Card key={module.id}>
            <CardContent className="p-0">
              {/* Module Header */}
              <div className="flex flex-wrap items-center gap-2 border-b px-3 py-3 sm:gap-3 sm:px-4">
                <button
                  onClick={() => toggleModule(module.id)}
                  className="text-neutral-400 hover:text-neutral-700 shrink-0"
                >
                  {expandedModules.has(module.id) ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </button>
                <GripVertical className="h-4 w-4 text-neutral-300 hidden sm:block shrink-0" />
                <span className="flex h-6 w-6 items-center justify-center rounded bg-neutral-100 text-xs font-semibold text-neutral-600 shrink-0">
                  {moduleIdx + 1}
                </span>
                <Input
                  className="flex-1 min-w-[100px] border-0 bg-transparent px-0 font-semibold shadow-none focus-visible:ring-0"
                  value={module.title}
                  onBlur={(e) =>
                    handleUpdateModuleTitle(module.id, e.target.value)
                  }
                  onChange={(e) =>
                    setModules((prev) =>
                      prev.map((m) =>
                        m.id === module.id
                          ? { ...m, title: e.target.value }
                          : m
                      )
                    )
                  }
                />
                <Badge variant="secondary" className="text-xs shrink-0">
                  {module.lessons.length} lessons
                </Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-red-400 hover:text-red-600 shrink-0"
                  onClick={() => handleDeleteModule(module.id, module.title)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>

              {/* Lessons */}
              {expandedModules.has(module.id) && (
                <div className="divide-y">
                  {module.lessons.map((lesson, lessonIdx) => (
                    <LessonEditor
                      key={lesson.id}
                      lesson={lesson}
                      index={lessonIdx}
                      onUpdate={(updates) =>
                        handleUpdateLesson(module.id, lesson.id, updates)
                      }
                      onDelete={() =>
                        handleDeleteLesson(module.id, lesson.id)
                      }
                    />
                  ))}

                  {/* Add Lesson Button */}
                  <div className="px-4 py-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1.5 text-neutral-500"
                      onClick={() => handleAddLesson(module.id)}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add Lesson
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add Module */}
      <Card>
        <CardContent className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center">
          <Input
            placeholder="New chapter title..."
            value={newModuleTitle}
            onChange={(e) => setNewModuleTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddModule()}
            className="flex-1"
          />
          <Button
            onClick={handleAddModule}
            disabled={addingModule || !newModuleTitle.trim()}
            className="gap-1.5 w-full sm:w-auto"
          >
            {addingModule ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Add Chapter
          </Button>
        </CardContent>
      </Card>

      {/* Back link */}
      <div className="flex justify-between">
        <Link
          href={`/admin/courses/${courseId}/edit`}
          className="text-sm text-neutral-500 hover:text-neutral-900"
        >
          ← Back to course settings
        </Link>
        <Link
          href="/admin/courses"
          className="text-sm text-neutral-500 hover:text-neutral-900"
        >
          All courses →
        </Link>
      </div>
    </div>
  );
}

// ─── Lesson Row Component ─────────────────────────────────────────────────

function LessonEditor({
  lesson,
  index,
  onUpdate,
  onDelete,
}: {
  lesson: LessonRow;
  index: number;
  onUpdate: (updates: Record<string, unknown>) => void;
  onDelete: () => void;
}) {
  const [title, setTitle] = useState(lesson.title);
  const [youtubeUrl, setYoutubeUrl] = useState(lesson.youtube_url || "");
  const [duration, setDuration] = useState(String(lesson.duration_minutes || ""));

  const typeIcon = {
    video: <Video className="h-3.5 w-3.5" />,
    article: <FileText className="h-3.5 w-3.5" />,
    quiz: <HelpCircle className="h-3.5 w-3.5" />,
  };

  return (
    <div className="space-y-2 px-4 py-3 hover:bg-neutral-50/50">
      {/* Row 1: Title + Type + Free + Delete */}
      <div className="flex flex-wrap items-center gap-2">
        <GripVertical className="h-3.5 w-3.5 text-neutral-200 shrink-0" />
        <span className="text-xs font-medium text-neutral-400 w-5 shrink-0">
          {index + 1}
        </span>
        <Input
          className="flex-1 min-w-[120px] h-8 text-sm"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => title !== lesson.title && onUpdate({ title })}
        />
        <Select
          value={lesson.type}
          onValueChange={(v) => onUpdate({ type: v as LessonRow["type"] })}
        >
          <SelectTrigger className="h-8 w-28 text-xs">
            <div className="flex items-center gap-1.5">
              {typeIcon[lesson.type]}
              <SelectValue />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="video">Video</SelectItem>
            <SelectItem value="article">Article</SelectItem>
            <SelectItem value="quiz">Quiz</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center gap-1.5 shrink-0">
          <Label className="text-xs text-neutral-400">Free</Label>
          <Switch
            checked={lesson.is_free}
            onCheckedChange={(checked) => onUpdate({ is_free: checked })}
            className="scale-75"
          />
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-red-400 hover:text-red-600 shrink-0"
          onClick={onDelete}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>

      {/* Row 2: Video Embed + Duration */}
      {lesson.type === "video" && (
        <div className="space-y-2 pl-0 sm:pl-9">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Youtube className="absolute left-2.5 top-2 h-3.5 w-3.5 text-red-400" />
              <textarea
                className="w-full rounded-md border border-neutral-200 bg-white py-1.5 pl-8 pr-3 text-xs font-mono placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-400 resize-none"
                placeholder='Paste embed code — <iframe src="https://www.youtube.com/embed/...">'
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                onBlur={() =>
                  youtubeUrl !== (lesson.youtube_url || "") &&
                  onUpdate({ youtube_url: youtubeUrl || undefined })
                }
                rows={2}
              />
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Input
                className="h-8 w-16 text-xs text-center"
                type="number"
                min="0"
                placeholder="0"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                onBlur={() =>
                  onUpdate({ duration_minutes: parseInt(duration) || 0 })
                }
              />
              <span className="text-xs text-neutral-400">min</span>
            </div>
          </div>
          {/* Live preview */}
          {youtubeUrl && (() => {
            const idMatch = youtubeUrl.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
            const videoId = idMatch?.[1];
            return videoId ? (
              <div className="aspect-video w-full max-w-md overflow-hidden rounded-lg border bg-black">
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1&showinfo=0&iv_load_policy=3&color=white`}
                  className="h-full w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title={lesson.title}
                />
              </div>
            ) : null;
          })()}
        </div>
      )}
    </div>
  );
}

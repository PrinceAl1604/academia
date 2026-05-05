/**
 * lib/api — back-compat shim over the new repository layer.
 *
 * Earlier this file was a thin wrapper around raw supabase calls
 * scattered across the codebase. The Clean Architecture refactor
 * moved every read/write behind a repository port; this file now
 * re-exports the same legacy function shapes so existing imports
 * keep compiling while we migrate consumers page-by-page.
 *
 * NEW code should import the repositories directly (or, even
 * better, the use cases in lib/domain/usecases/):
 *
 *   import { courseRepository } from "@/lib/infra/supabase/supabase-course-repository";
 */
import { supabase } from "./supabase";
import { courseRepository } from "@/lib/infra/supabase/supabase-course-repository";
import type {
  Course,
  CourseDetail,
  CourseModule,
  Lesson,
} from "@/lib/domain/entities/course";

// Legacy aliases — new code should import from lib/domain/entities.
export type {
  Course as CourseRow,
  Category as CategoryRow,
  CourseModule as ModuleRow,
  Lesson as LessonRow,
} from "@/lib/domain/entities/course";

// ─── Course reads (delegated) ─────────────────────────────────

export async function getCourses(): Promise<Course[]> {
  return courseRepository.listPublished();
}

export async function getAllCourses(): Promise<Course[]> {
  return courseRepository.listAll();
}

export async function getCourseBySlug(
  slug: string
): Promise<CourseDetail | null> {
  return courseRepository.bySlug(slug);
}

export async function getCategories() {
  return courseRepository.listCategories();
}

// ─── Admin CRUD (small, low-traffic admin paths still inline) ──

export async function createCourse(course: {
  title: string;
  slug: string;
  description?: string;
  category_id?: string;
  instructor_id?: string;
  level?: string;
  duration_hours?: number;
  total_lessons?: number;
  is_free?: boolean;
  is_published?: boolean;
  youtube_preview_url?: string;
  cover_url?: string;
  tags?: string[];
}) {
  const { data, error } = await supabase
    .from("courses")
    .insert(course)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateCourse(
  id: string,
  updates: Partial<{
    title: string;
    slug: string;
    description: string;
    category_id: string;
    instructor_id: string;
    level: string;
    duration_hours: number;
    total_lessons: number;
    is_free: boolean;
    is_published: boolean;
    is_featured: boolean;
    youtube_preview_url: string;
    tags: string[];
    thumbnail_url: string;
    cover_url: string;
  }>
) {
  const { data, error } = await supabase
    .from("courses")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteCourse(id: string) {
  const { error } = await supabase.from("courses").delete().eq("id", id);
  if (error) throw error;
}

export async function createModule(module: {
  course_id: string;
  title: string;
  sort_order: number;
}) {
  const { data, error } = await supabase
    .from("modules")
    .insert(module)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function createLesson(lesson: {
  module_id: string;
  title: string;
  type?: string;
  youtube_url?: string;
  duration_minutes?: number;
  content?: string;
  is_free?: boolean;
  sort_order: number;
}) {
  const { data, error } = await supabase
    .from("lessons")
    .insert(lesson)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateModule(
  id: string,
  updates: Partial<{ title: string; sort_order: number }>
) {
  const { data, error } = await supabase
    .from("modules")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteModule(id: string) {
  await supabase.from("lessons").delete().eq("module_id", id);
  const { error } = await supabase.from("modules").delete().eq("id", id);
  if (error) throw error;
}

export async function updateLesson(
  id: string,
  updates: Partial<{
    title: string;
    type: string;
    youtube_url: string;
    duration_minutes: number;
    content: string;
    is_free: boolean;
    sort_order: number;
  }>
) {
  const { data, error } = await supabase
    .from("lessons")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteLesson(id: string) {
  const { error } = await supabase.from("lessons").delete().eq("id", id);
  if (error) throw error;
}

export async function getModulesForCourse(
  courseId: string
): Promise<CourseModule[]> {
  const { data, error } = await supabase
    .from("modules")
    .select("*, lessons(*)")
    .eq("course_id", courseId)
    .order("sort_order", { ascending: true });
  if (error) return [];
  return (data ?? []).map((m: CourseModule) => ({
    ...m,
    lessons: (m.lessons ?? []).sort(
      (a: Lesson, b: Lesson) => a.sort_order - b.sort_order
    ),
  }));
}

export async function getInstructors() {
  const { data, error } = await supabase
    .from("instructors")
    .select("*")
    .order("name");
  if (error) return [];
  return data ?? [];
}

export async function createInstructor(instructor: {
  name: string;
  title?: string;
  bio?: string;
}) {
  const { data, error } = await supabase
    .from("instructors")
    .insert(instructor)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ─── Admin maintenance: course totals sync ─────────────────────

export async function syncAllCourseTotals(): Promise<void> {
  const { data: courses } = await supabase.from("courses").select("id");
  if (!courses) return;
  await Promise.all(courses.map((c) => syncCourseTotals(c.id)));
}

export async function syncCourseTotals(courseId: string): Promise<void> {
  const { data: modules } = await supabase
    .from("modules")
    .select("id, lessons(id, duration_minutes)")
    .eq("course_id", courseId);

  const allLessons = (modules ?? []).flatMap(
    (m: { lessons: { id: string; duration_minutes: number }[] }) =>
      m.lessons ?? []
  );
  const totalLessons = allLessons.length;
  const totalMinutes = allLessons.reduce(
    (sum: number, l: { duration_minutes: number }) =>
      sum + (l.duration_minutes || 0),
    0
  );
  const durationHours = Math.round((totalMinutes / 60) * 10) / 10;

  await supabase
    .from("courses")
    .update({ total_lessons: totalLessons, duration_hours: durationHours })
    .eq("id", courseId);
}

// ─── Progress + enrollments (delegated) ────────────────────────

export async function getUserCourseProgress(
  userId: string
): Promise<Record<string, number>> {
  return courseRepository.progressForUser(userId);
}

export async function getCompletedLessons(userId: string): Promise<string[]> {
  return courseRepository.completedLessons(userId);
}

export async function markLessonComplete(
  userId: string,
  lessonId: string
): Promise<void> {
  return courseRepository.markLessonComplete(userId, lessonId);
}

export async function enrollInCourse(
  userId: string,
  courseId: string
): Promise<void> {
  return courseRepository.enroll(userId, courseId);
}

export async function getEnrolledCourses(userId: string) {
  return courseRepository.enrolledCourses(userId);
}

import { supabase } from "./supabase";

// ─── Course Types ───────────────────────────────────────────────────────────

export interface CourseRow {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  thumbnail_url: string | null;
  level: string;
  duration_hours: number;
  total_lessons: number;
  price: number;
  is_free: boolean;
  is_featured: boolean;
  is_published: boolean;
  rating: number;
  students_count: number;
  youtube_preview_url: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
  category: { id: string; name: string; slug: string } | null;
  instructor: {
    id: string;
    name: string;
    title: string | null;
    bio: string | null;
    avatar_url: string | null;
  } | null;
}

export interface CategoryRow {
  id: string;
  name: string;
  slug: string;
}

export interface ModuleRow {
  id: string;
  course_id: string;
  title: string;
  sort_order: number;
  lessons: LessonRow[];
}

export interface LessonRow {
  id: string;
  module_id: string;
  title: string;
  type: "video" | "article" | "quiz";
  youtube_url: string | null;
  duration_minutes: number;
  content: string | null;
  is_free: boolean;
  sort_order: number;
}

// ─── Fetch Functions ────────────────────────────────────────────────────────

/**
 * Get all published courses with category and instructor info.
 */
export async function getCourses(): Promise<CourseRow[]> {
  const { data, error } = await supabase
    .from("courses")
    .select(
      `
      *,
      category:categories(*),
      instructor:instructors(*)
    `
    )
    .eq("is_published", true)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching courses:", error);
    return [];
  }
  return data ?? [];
}

/**
 * Get ALL courses (including unpublished) for admin.
 */
export async function getAllCourses(): Promise<CourseRow[]> {
  const { data, error } = await supabase
    .from("courses")
    .select(
      `
      *,
      category:categories(*),
      instructor:instructors(*)
    `
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching all courses:", error);
    return [];
  }
  return data ?? [];
}

/**
 * Get a single course by slug with modules and lessons.
 */
export async function getCourseBySlug(
  slug: string
): Promise<(CourseRow & { modules: ModuleRow[] }) | null> {
  const { data: course, error } = await supabase
    .from("courses")
    .select(
      `
      *,
      category:categories(*),
      instructor:instructors(*)
    `
    )
    .eq("slug", slug)
    .single();

  if (error || !course) return null;

  // Fetch modules with lessons
  const { data: modules } = await supabase
    .from("modules")
    .select(
      `
      *,
      lessons(*)
    `
    )
    .eq("course_id", course.id)
    .order("sort_order", { ascending: true });

  // Sort lessons within each module
  const sortedModules = (modules ?? []).map((m: ModuleRow) => ({
    ...m,
    lessons: (m.lessons ?? []).sort(
      (a: LessonRow, b: LessonRow) => a.sort_order - b.sort_order
    ),
  }));

  return { ...course, modules: sortedModules };
}

/**
 * Get all categories.
 */
export async function getCategories(): Promise<CategoryRow[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("name", { ascending: true });

  if (error) return [];
  return data ?? [];
}

// ─── Admin CRUD ─────────────────────────────────────────────────────────────

/**
 * Create a new course.
 */
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

/**
 * Update an existing course.
 */
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

/**
 * Delete a course.
 */
export async function deleteCourse(id: string) {
  const { error } = await supabase.from("courses").delete().eq("id", id);
  if (error) throw error;
}

/**
 * Create a module for a course.
 */
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

/**
 * Create a lesson for a module.
 */
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

/**
 * Update a module.
 */
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

/**
 * Delete a module (and its lessons via cascade).
 */
export async function deleteModule(id: string) {
  // Delete lessons first
  await supabase.from("lessons").delete().eq("module_id", id);
  const { error } = await supabase.from("modules").delete().eq("id", id);
  if (error) throw error;
}

/**
 * Update a lesson.
 */
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

/**
 * Delete a lesson.
 */
export async function deleteLesson(id: string) {
  const { error } = await supabase.from("lessons").delete().eq("id", id);
  if (error) throw error;
}

/**
 * Get modules with lessons for a course (admin).
 */
export async function getModulesForCourse(courseId: string): Promise<ModuleRow[]> {
  const { data, error } = await supabase
    .from("modules")
    .select("*, lessons(*)")
    .eq("course_id", courseId)
    .order("sort_order", { ascending: true });

  if (error) return [];

  return (data ?? []).map((m: ModuleRow) => ({
    ...m,
    lessons: (m.lessons ?? []).sort(
      (a: LessonRow, b: LessonRow) => a.sort_order - b.sort_order
    ),
  }));
}

/**
 * Get all instructors.
 */
export async function getInstructors() {
  const { data, error } = await supabase
    .from("instructors")
    .select("*")
    .order("name");

  if (error) return [];
  return data ?? [];
}

/**
 * Create an instructor.
 */
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

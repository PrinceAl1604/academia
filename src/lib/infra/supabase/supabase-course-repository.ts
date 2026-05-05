"use client";

import { supabase } from "@/lib/supabase";
import type { CourseRepository } from "@/lib/domain/ports/course-repository";
import type {
  Course,
  CourseDetail,
  Category,
  CourseModule,
  Lesson,
  Enrollment,
} from "@/lib/domain/entities/course";

/**
 * Supabase implementation of CourseRepository. Encapsulates all
 * PostgREST joins for the course aggregate. Pages and use cases
 * see only the typed domain entities.
 */
export class SupabaseCourseRepository implements CourseRepository {
  async listPublished(): Promise<Course[]> {
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
      .order("sort_order", { ascending: true });
    if (error) {
      console.error("Error fetching courses:", error);
      return [];
    }
    return (data ?? []) as Course[];
  }

  async listAll(): Promise<Course[]> {
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
    return (data ?? []) as Course[];
  }

  async bySlug(slug: string): Promise<CourseDetail | null> {
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

    const sortedModules: CourseModule[] = (modules ?? []).map(
      (m: CourseModule) => ({
        ...m,
        lessons: (m.lessons ?? []).sort(
          (a: Lesson, b: Lesson) => a.sort_order - b.sort_order
        ),
      })
    );

    return { ...(course as Course), modules: sortedModules };
  }

  async listCategories(): Promise<Category[]> {
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) return [];
    return (data ?? []) as Category[];
  }

  async progressForUser(userId: string): Promise<Record<string, number>> {
    const [{ data: completedData }, { data: courses }] = await Promise.all([
      supabase
        .from("lesson_progress")
        .select("lesson_id")
        .eq("user_id", userId)
        .eq("completed", true),
      supabase
        .from("courses")
        .select("id, modules(id, lessons(id))")
        .eq("is_published", true),
    ]);

    const completedSet = new Set(
      (completedData ?? []).map((p: { lesson_id: string }) => p.lesson_id)
    );

    const progress: Record<string, number> = {};
    for (const course of courses ?? []) {
      const allLessons = (
        (course as { modules: { lessons: { id: string }[] }[] }).modules ?? []
      ).flatMap((m) => m.lessons ?? []);
      const total = allLessons.length;
      if (total === 0) {
        progress[course.id] = 0;
        continue;
      }
      const completed = allLessons.filter((l) => completedSet.has(l.id)).length;
      progress[course.id] = Math.round((completed / total) * 100);
    }
    return progress;
  }

  async completedLessons(userId: string): Promise<string[]> {
    const { data } = await supabase
      .from("lesson_progress")
      .select("lesson_id")
      .eq("user_id", userId)
      .eq("completed", true);
    return (data ?? []).map((p) => p.lesson_id);
  }

  async markLessonComplete(userId: string, lessonId: string): Promise<void> {
    await supabase.from("lesson_progress").insert({
      user_id: userId,
      lesson_id: lessonId,
      completed: true,
      completed_at: new Date().toISOString(),
    });
  }

  async enroll(userId: string, courseId: string): Promise<void> {
    const { data } = await supabase
      .from("enrollments")
      .select("id")
      .eq("user_id", userId)
      .eq("course_id", courseId)
      .single();
    if (!data) {
      await supabase.from("enrollments").insert({
        user_id: userId,
        course_id: courseId,
      });
    }
  }

  async enrolledCourses(
    userId: string
  ): Promise<
    Pick<Enrollment, "course_id" | "progress" | "enrolled_at" | "completed_at">[]
  > {
    const { data } = await supabase
      .from("enrollments")
      .select("course_id, progress, enrolled_at, completed_at")
      .eq("user_id", userId);
    return (data ?? []) as Pick<
      Enrollment,
      "course_id" | "progress" | "enrolled_at" | "completed_at"
    >[];
  }
}

export const courseRepository: CourseRepository = new SupabaseCourseRepository();

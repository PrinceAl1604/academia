/**
 * CourseRepository — port for course catalog + enrollment +
 * lesson-progress lookups. Single port covers all course-related
 * reads/writes because the entities form a tight aggregate
 * (course → modules → lessons + enrollments + progress per user).
 *
 * Splitting prematurely would force callers to juggle multiple
 * interfaces for "show me a course with the user's progress" —
 * the cohesion isn't worth the seam.
 */

import type {
  Course,
  CourseDetail,
  Category,
  Enrollment,
} from "@/lib/domain/entities/course";

export interface CourseRepository {
  /** All published courses with category + instructor joined. */
  listPublished(): Promise<Course[]>;

  /** All courses including unpublished — admin only. */
  listAll(): Promise<Course[]>;

  /** Single course by slug, with modules + lessons. */
  bySlug(slug: string): Promise<CourseDetail | null>;

  /** Categories for the catalog filter pills. */
  listCategories(): Promise<Category[]>;

  /**
   * Map of courseId → completion percentage for a user. One pass
   * over the user's lesson_progress + course/module/lesson tree.
   */
  progressForUser(userId: string): Promise<Record<string, number>>;

  /** All lesson ids the user has marked complete. */
  completedLessons(userId: string): Promise<string[]>;

  /** Mark a single lesson complete; idempotent on the server. */
  markLessonComplete(userId: string, lessonId: string): Promise<void>;

  /** Insert or no-op enrollment row. Idempotent. */
  enroll(userId: string, courseId: string): Promise<void>;

  /** All enrollments for a user with progress + dates. */
  enrolledCourses(userId: string): Promise<Pick<Enrollment, "course_id" | "progress" | "enrolled_at" | "completed_at">[]>;
}

/**
 * MarkLessonComplete — record a user's completion of a lesson.
 *
 * Idempotent at the database level (lesson_progress has a unique
 * constraint on (user_id, lesson_id) so duplicate inserts are
 * absorbed). Course completion percentage is derived elsewhere
 * (CourseRepository.progressForUser) so this use case is just a
 * write.
 */

import type { CourseRepository } from "@/lib/domain/ports/course-repository";

export class MarkLessonComplete {
  constructor(private readonly courses: CourseRepository) {}

  async execute(userId: string, lessonId: string): Promise<void> {
    if (!userId || !lessonId) return;
    await this.courses.markLessonComplete(userId, lessonId);
  }
}

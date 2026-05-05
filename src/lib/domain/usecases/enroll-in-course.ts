/**
 * EnrollInCourse — opt the current user into a course catalog
 * entry. Idempotent: re-enrolling is a no-op at the repository.
 *
 * Server-side rules (Pro vs free, course is published, etc.)
 * are enforced by RLS / DB triggers. This use case validates
 * inputs and forwards to the repository; the UI gets a typed
 * error if the server rejects.
 */

import type { CourseRepository } from "@/lib/domain/ports/course-repository";

export class EnrollInCourse {
  constructor(private readonly courses: CourseRepository) {}

  async execute(userId: string, courseId: string): Promise<void> {
    if (!userId || !courseId) {
      throw new Error("Missing userId or courseId");
    }
    await this.courses.enroll(userId, courseId);
  }
}

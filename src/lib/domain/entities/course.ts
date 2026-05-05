/**
 * Course domain entities. Independent of database row shape — the
 * repository adapter is responsible for mapping PostgREST joins
 * into these structures.
 */

export interface Category {
  id: string;
  name: string;
  slug: string;
}

export interface Instructor {
  id: string;
  name: string;
  title: string | null;
  bio: string | null;
  avatar_url: string | null;
}

export interface Course {
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
  cover_url: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
  category: Category | null;
  instructor: Instructor | null;
}

export interface Lesson {
  id: string;
  module_id: string;
  title: string;
  description: string | null;
  type: "video" | "article" | "quiz";
  youtube_url: string | null;
  duration_minutes: number;
  content: string | null;
  is_free: boolean;
  sort_order: number;
}

export interface CourseModule {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  sort_order: number;
  lessons: Lesson[];
}

export type CourseDetail = Course & { modules: CourseModule[] };

export interface Enrollment {
  course_id: string;
  user_id: string;
  progress: number;
  enrolled_at: string;
  completed_at: string | null;
}

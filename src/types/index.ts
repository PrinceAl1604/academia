export interface Course {
  id: string;
  title: string;
  slug: string;
  description: string;
  shortDescription: string;
  instructor: Instructor;
  thumbnail: string;
  category: string;
  level: "Beginner" | "Intermediate" | "Advanced";
  duration: string;
  lessonsCount: number;
  studentsCount: number;
  rating: number;
  reviewsCount: number;
  price: number;
  isFeatured: boolean;
  isFree?: boolean;
  tags: string[];
  curriculum: Module[];
  updatedAt: string;
}

export interface Module {
  id: string;
  title: string;
  lessons: Lesson[];
}

export interface Lesson {
  id: string;
  title: string;
  duration: string;
  type: "video" | "article" | "quiz";
  isCompleted?: boolean;
  isFree?: boolean;
}

export interface Instructor {
  id: string;
  name: string;
  avatar: string;
  title: string;
  bio: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  subscription: "free" | "pro" | "team";
  enrolledCourses: string[];
  completedLessons: string[];
  joinedAt: string;
}

export interface Testimonial {
  id: string;
  name: string;
  role: string;
  avatar: string;
  content: string;
  rating: number;
}

export interface LicenceKey {
  id: string;
  key: string;
  type: "student" | "admin";
  status: "active" | "inactive" | "expired";
  assignedTo: string | null;
  email: string | null;
  createdAt: string;
  expiresAt: string;
}

export interface Student {
  id: string;
  name: string;
  email: string;
  licenceKey: string;
  enrolledCourses: number;
  completedCourses: number;
  lastActive: string;
  joinedAt: string;
}

export interface ActivityEntry {
  id: string;
  type: "enrollment" | "completion" | "licence_activated" | "new_course";
  message: string;
  timestamp: string;
}

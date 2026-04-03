import { NextResponse } from "next/server";
import { validateUserAccess, getSupabaseAdmin } from "@/lib/supabase-server";

/**
 * GET /api/lessons/:id
 *
 * Returns lesson content. If the lesson belongs to a paid course,
 * the youtube_url is ONLY returned for Pro users or admins.
 * Free users get lesson metadata but no video URL.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id) {
    return NextResponse.json({ error: "Missing lesson ID" }, { status: 400 });
  }

  // 1. Validate user session + Pro status on the SERVER
  const access = await validateUserAccess();

  if (!access.authenticated) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // 2. Fetch lesson with its module → course info
  const admin = getSupabaseAdmin();
  const { data: lesson, error } = await admin
    .from("lessons")
    .select(
      `
      id, title, description, content, type,
      youtube_url, duration_minutes, is_free, sort_order,
      module:modules!inner(
        id, title, course_id,
        course:courses!inner(id, title, is_free, is_published)
      )
    `
    )
    .eq("id", id)
    .single();

  if (error || !lesson) {
    return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
  }

  // 3. Determine if this lesson requires Pro
  const module = lesson.module as unknown as {
    id: string;
    title: string;
    course_id: string;
    course: { id: string; title: string; is_free: boolean; is_published: boolean };
  };
  const course = module.course;
  const isFreeCourse = course.is_free;
  const isFreeLesson = lesson.is_free;
  const requiresPro = !isFreeCourse && !isFreeLesson;

  // 4. Gate the youtube_url based on server-side Pro check
  const canAccessVideo = access.isAdmin || access.isPro || !requiresPro;

  return NextResponse.json({
    id: lesson.id,
    title: lesson.title,
    description: lesson.description,
    content: lesson.content,
    type: lesson.type,
    duration_minutes: lesson.duration_minutes,
    is_free: lesson.is_free,
    sort_order: lesson.sort_order,
    // THIS is the key line — youtube_url is only sent if access is granted
    youtube_url: canAccessVideo ? lesson.youtube_url : null,
    locked: requiresPro && !canAccessVideo,
    module: {
      id: module.id,
      title: module.title,
      course_id: module.course_id,
    },
  });
}

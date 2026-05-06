import { NextResponse } from "next/server";
import { sendCourseCompletionEmail } from "@/lib/email";
import { validateUserAccess, getSupabaseAdmin } from "@/lib/supabase-server";

/**
 * POST /api/email/completion
 * Body: { courseId: string }
 *
 * Sends a course-completion email to the AUTHENTICATED user.
 * Course title + slug are looked up server-side from the courseId,
 * never trusted from the request body. Recipient is the auth'd
 * user, never the body.
 *
 * The caller's progress IS verified — we look up their
 * lesson_progress and confirm they've actually completed every
 * lesson in the course. Without that check, anyone could trigger
 * the email by passing a courseId.
 */
export async function POST(request: Request) {
  const access = await validateUserAccess();
  if (!access.authenticated || !access.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let courseId: string | undefined;
  try {
    const body = await request.json();
    courseId = body?.courseId;
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  if (!courseId) {
    return NextResponse.json({ error: "Missing courseId" }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  const userId = access.user.id;

  // Look up the course server-side so the title in the email is
  // canonical, not attacker-controlled.
  const { data: course } = await admin
    .from("courses")
    .select("id, title, slug")
    .eq("id", courseId)
    .single();

  if (!course) {
    return NextResponse.json({ error: "Course not found" }, { status: 404 });
  }

  // Verify completion: count lessons in the course vs lessons the
  // user has marked complete. Email only fires if completion is real.
  const { data: lessons } = await admin
    .from("lessons")
    .select("id, modules!inner(course_id)")
    .eq("modules.course_id", courseId);

  const lessonIds = (lessons ?? []).map((l) => (l as { id: string }).id);
  if (lessonIds.length === 0) {
    return NextResponse.json(
      { error: "Course has no lessons" },
      { status: 400 }
    );
  }

  const { count: completedCount } = await admin
    .from("lesson_progress")
    .select("lesson_id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("completed", true)
    .in("lesson_id", lessonIds);

  if ((completedCount ?? 0) < lessonIds.length) {
    return NextResponse.json(
      { error: "Course not yet completed" },
      { status: 400 }
    );
  }

  try {
    const name =
      access.user.user_metadata?.full_name ||
      access.user.email.split("@")[0];
    await sendCourseCompletionEmail({
      to: access.user.email,
      name,
      courseTitle: course.title,
      courseSlug: course.slug ?? "",
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[Completion Email Error]", err);
    return NextResponse.json({ error: "Failed to send" }, { status: 500 });
  }
}

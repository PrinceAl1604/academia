import { NextResponse } from "next/server";
import { validateUserAccess, getSupabaseAdmin } from "@/lib/supabase-server";
import { sendNewCourseEmail } from "@/lib/email";
import { mapWithConcurrency } from "@/lib/parallel";

// Resend free tier is 10 req/s — 5 in flight stays well under that
// while pipelining most of the wall time. Was sequential before, which
// hit Vercel's 10-s function timeout once user count grew.
const EMAIL_CONCURRENCY = 5;

/**
 * POST /api/email/new-course
 * Admin-only. Sends a "new course" announcement to all users
 * who have the new_courses notification preference enabled.
 *
 * Body: { courseId: string }
 */
export async function POST(req: Request) {
  const access = await validateUserAccess();
  if (!access.authenticated || !access.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!access.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const { courseId } = body;

  if (!courseId) {
    return NextResponse.json({ error: "courseId required" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  // Fetch course details
  const { data: course } = await supabase
    .from("courses")
    .select("title, description")
    .eq("id", courseId)
    .single();

  if (!course) {
    return NextResponse.json({ error: "Course not found" }, { status: 404 });
  }

  // Fetch users who opted in (new_courses = true or default/null which means opted in)
  const { data: users } = await supabase
    .from("users")
    .select("email, name, notification_preferences")
    .neq("role", "admin");

  let sent = 0;
  const errors: string[] = [];

  await mapWithConcurrency(users ?? [], EMAIL_CONCURRENCY, async (user) => {
    // Respect notification preferences (default is opted-in)
    const prefs = user.notification_preferences as Record<string, boolean> | null;
    if (prefs && prefs.new_courses === false) return;

    try {
      await sendNewCourseEmail({
        to: user.email,
        name: user.name,
        courseTitle: course.title,
        courseDescription: course.description || undefined,
      });
      sent++;
    } catch (err) {
      errors.push(`${user.email}:${String(err)}`);
    }
  });

  return NextResponse.json({
    success: true,
    sent,
    errors: errors.length > 0 ? errors : undefined,
  });
}

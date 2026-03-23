import { NextResponse } from "next/server";
import { sendCourseCompletionEmail } from "@/lib/email";

/**
 * POST /api/email/completion
 * Send a course completion email.
 * Called when a student completes all lessons in a course.
 */
export async function POST(request: Request) {
  try {
    const { email, name, courseTitle, courseSlug } = await request.json();

    if (!email || !courseTitle) {
      return NextResponse.json(
        { error: "Missing email or courseTitle" },
        { status: 400 }
      );
    }

    await sendCourseCompletionEmail({
      to: email,
      name: name || email.split("@")[0],
      courseTitle,
      courseSlug: courseSlug || "",
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[Completion Email Error]", err);
    return NextResponse.json({ error: "Failed to send" }, { status: 500 });
  }
}

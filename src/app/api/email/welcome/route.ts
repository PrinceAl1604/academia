import { NextResponse } from "next/server";
import { sendWelcomeEmail } from "@/lib/email";

/**
 * POST /api/email/welcome
 * Send a welcome email to a new user.
 * Called from the sign-up success flow.
 */
export async function POST(request: Request) {
  try {
    const { email, name } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "Missing email" }, { status: 400 });
    }

    await sendWelcomeEmail({ to: email, name: name || email.split("@")[0] });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[Welcome Email Error]", err);
    return NextResponse.json({ error: "Failed to send" }, { status: 500 });
  }
}

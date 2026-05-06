import { NextResponse } from "next/server";
import { sendWelcomeEmail } from "@/lib/email";
import { validateUserAccess } from "@/lib/supabase-server";

/**
 * POST /api/email/welcome
 *
 * Sends a welcome email to the AUTHENTICATED user. Recipient and
 * name are derived from the server session — never from request
 * body — so an unauth attacker can't trigger Brightroots-branded
 * emails to arbitrary addresses.
 *
 * Idempotency is loose; the sign-up page calls this once after
 * successful registration. Resend handles double-sends gracefully.
 */
export async function POST() {
  const access = await validateUserAccess();
  if (!access.authenticated || !access.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const email = access.user.email;
    const name =
      access.user.user_metadata?.full_name ||
      email.split("@")[0];
    await sendWelcomeEmail({ to: email, name });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[Welcome Email Error]", err);
    return NextResponse.json({ error: "Failed to send" }, { status: 500 });
  }
}

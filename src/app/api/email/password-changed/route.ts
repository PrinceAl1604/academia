import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";
import { sendPasswordChangedEmail } from "@/lib/email";
import { checkRateLimit } from "@/lib/rate-limit";

/**
 * POST /api/email/password-changed
 * Sends a password change confirmation email to the authenticated user.
 *
 * Rate-limited because the legitimate flow fires this exactly once
 * per password change. Without the cap, an attacker with stolen creds
 * could spam the legit user's inbox with "your password was changed"
 * emails to obscure their actual takeover, or to harass the user.
 * 3 per hour per user is generous for retries / network hiccups.
 */
const RATE_LIMIT_MAX = 3;
const RATE_LIMIT_WINDOW_SECONDS = 60 * 60;

export async function POST() {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!user.email) {
    return NextResponse.json(
      { error: "Account has no email on file" },
      { status: 400 }
    );
  }

  const allowed = await checkRateLimit({
    bucket: `pw-changed-email:${user.id}`,
    maxCount: RATE_LIMIT_MAX,
    windowSeconds: RATE_LIMIT_WINDOW_SECONDS,
  });
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": "3600" } }
    );
  }

  const name =
    user.user_metadata?.full_name || user.email.split("@")[0] || "User";

  try {
    await sendPasswordChangedEmail({ to: user.email, name });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to send email" },
      { status: 500 }
    );
  }
}

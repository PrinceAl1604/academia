import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";
import { sendPasswordChangedEmail } from "@/lib/email";

/**
 * POST /api/email/password-changed
 * Sends a password change confirmation email to the authenticated user.
 */
export async function POST() {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const name =
    user.user_metadata?.full_name || user.email?.split("@")[0] || "User";

  try {
    await sendPasswordChangedEmail({ to: user.email!, name });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to send email" },
      { status: 500 }
    );
  }
}

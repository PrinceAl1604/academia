import { NextResponse } from "next/server";
import { validateUserAccess, getSupabaseAdmin } from "@/lib/supabase-server";

/**
 * DELETE /api/account/delete
 * Permanently deletes the authenticated user's account and all associated data.
 * Requires the user to confirm by sending their email in the request body.
 */
export async function DELETE(req: Request) {
  const access = await validateUserAccess();
  if (!access.authenticated || !access.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Admins cannot delete themselves (safety net)
  if (access.isAdmin) {
    return NextResponse.json(
      { error: "Admin accounts cannot be self-deleted" },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const { confirmEmail } = body;

  // User must confirm by typing their email
  if (!confirmEmail || confirmEmail !== access.user.email) {
    return NextResponse.json(
      { error: "Email confirmation does not match" },
      { status: 400 }
    );
  }

  const userId = access.user.id;
  const supabase = getSupabaseAdmin();

  try {
    // Delete in dependency order (child rows first)
    await supabase.from("lesson_progress").delete().eq("user_id", userId);
    await supabase.from("enrollments").delete().eq("user_id", userId);
    await supabase.from("referrals").delete().eq("referred_id", userId);
    await supabase.from("referrals").delete().eq("referrer_id", userId);
    await supabase.from("activity_log").delete().eq("user_id", userId);
    await supabase.from("users").delete().eq("id", userId);

    // Finally, remove from auth.users
    const { error: authError } = await supabase.auth.admin.deleteUser(userId);
    if (authError) {
      console.error("Failed to delete auth user:", authError.message);
      return NextResponse.json(
        { error: "Account partially deleted. Contact support." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Account deletion error:", err);
    return NextResponse.json(
      { error: "Failed to delete account" },
      { status: 500 }
    );
  }
}

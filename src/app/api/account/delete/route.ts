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
    // Atomically tear down all of the user's owned data via the
    // delete_user_account() stored procedure. One round-trip, one
    // transaction — replaces the previous JS sequence that ran 6
    // independent DELETEs and could leave a half-deleted user
    // mid-flight if any step failed.
    const { error: rpcError } = await supabase.rpc("delete_user_account", {
      p_user_id: userId,
    });
    if (rpcError) {
      console.error("delete_user_account rpc failed:", rpcError.message);
      return NextResponse.json(
        { error: "Failed to delete account" },
        { status: 500 }
      );
    }

    // Auth row lives in the auth schema with its own admin API. We
    // delete it AFTER the public teardown so a partial state means
    // "auth row points to nothing public" (recoverable by admin
    // sweep) rather than "public row exists with broken FKs"
    // (corrupts joins). The proc's transactional commit guarantees
    // public is fully cleaned before we reach here.
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

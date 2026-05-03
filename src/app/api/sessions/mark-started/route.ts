import { NextResponse } from "next/server";
import { validateUserAccess, getSupabaseAdmin } from "@/lib/supabase-server";

/**
 * POST /api/sessions/mark-started
 * Body: { slot_id: string }
 *
 * Called by the room page when admin lands on a slot. Sets
 * `session_slots.host_started_at = now()` so booked students see the
 * session as LIVE NOW even if it's before the scheduled start time.
 *
 * Idempotent — uses COALESCE so the FIRST host visit wins. Subsequent
 * admin reloads don't bump the timestamp (which would slowly extend
 * the LIVE window forever).
 *
 * Admin-only. Students cannot self-elevate their slot to LIVE.
 */
export async function POST(req: Request) {
  const access = await validateUserAccess();
  if (!access.authenticated || !access.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!access.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let slotId: string | undefined;
  try {
    const body = await req.json();
    slotId = body?.slot_id;
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  if (!slotId) {
    return NextResponse.json({ error: "Missing slot_id" }, { status: 400 });
  }

  const admin = getSupabaseAdmin();

  // Conditional update: only set host_started_at if it's currently NULL.
  // This makes the operation idempotent — admin reloads don't extend
  // the LIVE window. The .is() filter scopes the update to NULL rows.
  const { error: dbError } = await admin
    .from("session_slots")
    .update({ host_started_at: new Date().toISOString() })
    .eq("id", slotId)
    .is("host_started_at", null);

  if (dbError) {
    return NextResponse.json(
      { error: "Could not mark started", detail: dbError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { validateUserAccess, getSupabaseAdmin } from "@/lib/supabase-server";
import { ensureDailyRoom } from "@/lib/daily";

/**
 * POST /api/sessions/ensure-room
 * Body: { slot_id: string }
 *
 * Called by the room page just before it renders the iframe. Ensures
 * the Daily room exists for this slot and returns its URL.
 *
 * Authorization is identical to the room page itself: admin OR an
 * active booking on this slot. We re-check server-side because
 * minting Daily rooms is a chargeable action — we don't want anyone
 * burning your free-tier minutes by hitting this with random slot IDs.
 *
 * Idempotent — multiple POSTs for the same slot return the same URL
 * without re-creating the room (Daily treats name collisions as no-op).
 */
export async function POST(req: Request) {
  const access = await validateUserAccess();
  if (!access.authenticated || !access.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
  const { data: slot } = await admin
    .from("session_slots")
    .select(
      "id, room_name, starts_at, duration_minutes, max_attendees, status"
    )
    .eq("id", slotId)
    .single();

  if (!slot) {
    return NextResponse.json({ error: "Slot not found" }, { status: 404 });
  }
  if ((slot as { status: string }).status === "cancelled") {
    return NextResponse.json(
      { error: "This session was cancelled" },
      { status: 410 }
    );
  }

  // Authorization: admin OR active booking on this slot.
  if (!access.isAdmin) {
    const { data: booking } = await admin
      .from("session_bookings")
      .select("id")
      .eq("slot_id", slotId)
      .eq("user_id", access.user.id)
      .is("cancelled_at", null)
      .maybeSingle();
    if (!booking) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  // Compute Daily's room expiry: end of session + 4-hour buffer for
  // overrun. After this, Daily auto-deletes the room and ejects
  // anyone still inside. Free-tier minutes only count up to exp,
  // and orphan rooms don't accumulate in our Daily dashboard.
  const startsAtMs = new Date(
    (slot as { starts_at: string }).starts_at
  ).getTime();
  const endsAtMs =
    startsAtMs + (slot as { duration_minutes: number }).duration_minutes * 60_000;
  const expSeconds = Math.floor((endsAtMs + 4 * 3600 * 1000) / 1000);

  try {
    const url = await ensureDailyRoom({
      name: (slot as { room_name: string }).room_name,
      exp: expSeconds,
      maxParticipants:
        (slot as { max_attendees: number }).max_attendees + 1, // +1 for host
    });
    return NextResponse.json({ ok: true, url });
  } catch (err) {
    console.error("ensure-room failed:", err);
    return NextResponse.json(
      { error: "Could not create room", detail: String(err) },
      { status: 500 }
    );
  }
}

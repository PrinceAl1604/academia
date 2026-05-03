import { NextResponse } from "next/server";
import { validateUserAccess, getSupabaseAdmin } from "@/lib/supabase-server";
import { sendSlotUpdatedEmail } from "@/lib/email";

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || "https://academia-vert-phi.vercel.app";

/**
 * POST /api/sessions/update-slot
 * Body: {
 *   slot_id: string,
 *   title?: string,
 *   description?: string | null,
 *   starts_at?: string (ISO),
 *   duration_minutes?: number,
 *   max_attendees?: number,
 * }
 *
 * Admin-only. Edits a slot in place — preserves all bookings (and
 * thus each user's monthly cap usage), unlike "cancel + recreate"
 * which would free everyone's caps.
 *
 * Side effects:
 *   - If start_time changed, every active booking's user gets a
 *     "rescheduled" email with a fresh .ics that has the same UID
 *     (so calendar apps merge the update into the existing event).
 *   - If only non-time fields changed AND there are bookings, send
 *     a lighter "updated" email.
 *   - If no bookings, no emails fire (silent edit).
 *
 * The DB still enforces invariants (duration 15-240, capacity ≥1)
 * via the original CHECK constraints, so we just pass through.
 */
export async function POST(req: Request) {
  const access = await validateUserAccess();
  if (!access.authenticated || !access.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!access.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: {
    slot_id?: string;
    title?: string;
    description?: string | null;
    starts_at?: string;
    duration_minutes?: number;
    max_attendees?: number;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const slotId = body.slot_id;
  if (!slotId) {
    return NextResponse.json({ error: "Missing slot_id" }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  const { data: existing } = await admin
    .from("session_slots")
    .select("*")
    .eq("id", slotId)
    .single();

  if (!existing) {
    return NextResponse.json({ error: "Slot not found" }, { status: 404 });
  }
  if ((existing as { status: string }).status === "cancelled") {
    return NextResponse.json(
      { error: "Cannot edit a cancelled slot" },
      { status: 409 }
    );
  }

  // Build the partial update — only include fields the caller sent.
  // This lets the form patch a single field without touching others.
  const update: Record<string, unknown> = {};
  if (body.title !== undefined) update.title = body.title.trim();
  if (body.description !== undefined)
    update.description = body.description?.trim() || null;
  if (body.starts_at !== undefined)
    update.starts_at = new Date(body.starts_at).toISOString();
  if (body.duration_minutes !== undefined)
    update.duration_minutes = body.duration_minutes;
  if (body.max_attendees !== undefined)
    update.max_attendees = body.max_attendees;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const { error: dbError } = await admin
    .from("session_slots")
    .update(update)
    .eq("id", slotId);

  if (dbError) {
    return NextResponse.json(
      { error: "Update failed", detail: dbError.message },
      { status: 500 }
    );
  }

  // Detect what changed for the email logic.
  const ex = existing as {
    title: string;
    description: string | null;
    starts_at: string;
    duration_minutes: number;
    max_attendees: number;
    type: "one_on_one" | "group";
  };
  const newStartsAt =
    body.starts_at !== undefined
      ? new Date(body.starts_at).toISOString()
      : ex.starts_at;
  const startTimeChanged =
    body.starts_at !== undefined && newStartsAt !== ex.starts_at;
  const otherChanged =
    (body.title !== undefined && body.title.trim() !== ex.title) ||
    (body.description !== undefined &&
      (body.description?.trim() || null) !== ex.description) ||
    (body.duration_minutes !== undefined &&
      body.duration_minutes !== ex.duration_minutes) ||
    (body.max_attendees !== undefined &&
      body.max_attendees !== ex.max_attendees);

  // Notify booked users only if something user-visible changed.
  if (startTimeChanged || otherChanged) {
    const { data: activeBookings } = await admin
      .from("session_bookings")
      .select("id, users!inner(email, name)")
      .eq("slot_id", slotId)
      .is("cancelled_at", null);

    let notified = 0;
    const errors: string[] = [];
    for (const row of activeBookings ?? []) {
      const u = (row as unknown as { users: { email: string; name: string } })
        .users;
      const bookingId = (row as { id: string }).id;
      try {
        await sendSlotUpdatedEmail({
          to: u.email,
          name: u.name,
          sessionTitle:
            body.title !== undefined ? body.title.trim() : ex.title,
          oldStartsAtIso: ex.starts_at,
          newStartsAtIso: newStartsAt,
          durationMinutes:
            body.duration_minutes !== undefined
              ? body.duration_minutes
              : ex.duration_minutes,
          type: ex.type,
          joinUrl: `${APP_URL}/dashboard/sessions/${slotId}`,
          bookingId,
          rescheduled: startTimeChanged,
        });
        notified++;
      } catch (err) {
        errors.push(`${u.email}: ${String(err)}`);
      }
    }
    return NextResponse.json({
      ok: true,
      notified,
      errors: errors.length ? errors : undefined,
    });
  }

  return NextResponse.json({ ok: true, notified: 0 });
}

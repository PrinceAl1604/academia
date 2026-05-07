import { NextResponse } from "next/server";
import { validateUserAccess, getSupabaseAdmin } from "@/lib/supabase-server";
import { sendSlotCancelledEmail } from "@/lib/email";
import { mapWithConcurrency } from "@/lib/parallel";

// Match the cron's email concurrency cap — Resend free tier is 10/s.
const EMAIL_CONCURRENCY = 5;

/**
 * POST /api/sessions/cancel-slot
 * Body: { slot_id: string }
 *
 * Admin-only. Cancels a slot AND every active booking on it. Each
 * booked user gets an apologetic email — their monthly cap is freed
 * automatically because the cap counter only sums bookings where
 * `cancelled_at IS NULL`.
 *
 * We do the cascade here in the API route rather than via a DB
 * trigger because the side-effect (sending mail) belongs in
 * application land — triggers should be invariant guards, not
 * orchestration.
 *
 * Response: { ok: true, notified: <count of emails sent> }
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

  // Pull the slot + all active bookings BEFORE we mutate anything,
  // so we have the email recipient list even after the cancel
  // sweep. If we updated first and then queried, we'd lose them.
  const { data: slot } = await admin
    .from("session_slots")
    .select("id, title, starts_at, status")
    .eq("id", slotId)
    .single();

  if (!slot) {
    return NextResponse.json({ error: "Slot not found" }, { status: 404 });
  }
  if ((slot as { status: string }).status === "cancelled") {
    return NextResponse.json({ error: "Already cancelled" }, { status: 409 });
  }

  const { data: activeBookings } = await admin
    .from("session_bookings")
    .select("id, user_id, users!inner(email, name)")
    .eq("slot_id", slotId)
    .is("cancelled_at", null);

  // Flip the slot first. Even if some emails fail below, the slot is
  // at least marked cancelled and won't accept new bookings.
  await admin
    .from("session_slots")
    .update({ status: "cancelled" })
    .eq("id", slotId);

  // Then sweep all active bookings into cancelled state. The partial
  // unique index lets a user re-book a different slot immediately,
  // and the cap counter free up because it only counts cancelled_at IS NULL.
  await admin
    .from("session_bookings")
    .update({ cancelled_at: new Date().toISOString() })
    .eq("slot_id", slotId)
    .is("cancelled_at", null);

  // Best-effort notify. We don't fail the whole request if Resend
  // hiccups on one user — log it and keep going so the others get
  // their email. In-app notification fires alongside the email; if
  // email is delayed/blocked, the user still sees it on their bell.
  const slotTitle = (slot as { title: string }).title;
  const slotStartsAt = (slot as { starts_at: string }).starts_at;
  let notified = 0;
  const errors: string[] = [];
  await mapWithConcurrency(activeBookings ?? [], EMAIL_CONCURRENCY, async (row) => {
    const u = (row as unknown as { users: { email: string; name: string } })
      .users;
    const userId = (row as { user_id: string }).user_id;
    try {
      await sendSlotCancelledEmail({
        to: u.email,
        name: u.name,
        sessionTitle: slotTitle,
        startsAtIso: slotStartsAt,
      });
      notified++;
    } catch (err) {
      errors.push(`${u.email}: ${String(err)}`);
    }
    // In-app notification — separate try/catch so an email failure
    // doesn't skip the bell entry.
    try {
      await admin.from("notifications").insert({
        user_id: userId,
        type: "session_cancelled",
        payload: {
          slot_id: slotId,
          title: slotTitle,
          starts_at: slotStartsAt,
        },
        link: "/dashboard/sessions",
      });
    } catch (err) {
      errors.push(`notif ${u.email}: ${String(err)}`);
    }
  });

  return NextResponse.json({
    ok: true,
    notified,
    errors: errors.length > 0 ? errors : undefined,
  });
}

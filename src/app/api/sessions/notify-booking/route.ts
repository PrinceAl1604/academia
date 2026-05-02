import { NextResponse } from "next/server";
import { validateUserAccess, getSupabaseAdmin } from "@/lib/supabase-server";
import { sendSessionBookedEmail } from "@/lib/email";

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || "https://academia-vert-phi.vercel.app";

/**
 * POST /api/sessions/notify-booking
 * Body: { booking_id: string }
 *
 * Called by the client immediately after a successful booking insert.
 * Sends the confirmation email out-of-band so the booking response
 * isn't blocked on Resend latency. We treat email failures as non-
 * fatal — the booking already exists in the DB, so the user can still
 * see and join their session even if delivery fails.
 *
 * Authorization: the caller must be the booking's owner. We re-check
 * server-side rather than trusting the client's claim, because email
 * sends are an authority — sending mail "from Brightroots" to an
 * arbitrary address is exactly the kind of thing an attacker would
 * abuse.
 */
export async function POST(req: Request) {
  const access = await validateUserAccess();
  if (!access.authenticated || !access.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let bookingId: string | undefined;
  try {
    const body = await req.json();
    bookingId = body?.booking_id;
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  if (!bookingId) {
    return NextResponse.json(
      { error: "Missing booking_id" },
      { status: 400 }
    );
  }

  const admin = getSupabaseAdmin();
  const { data: booking } = await admin
    .from("session_bookings")
    .select(
      "id, user_id, session_slots(id, title, starts_at, duration_minutes, type), users(email, name)"
    )
    .eq("id", bookingId)
    .single();

  if (!booking) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Authorization: caller must own this booking.
  if ((booking as { user_id: string }).user_id !== access.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Supabase types FK joins as object|object[] — at runtime !inner is
  // a single object. Cast through unknown for clean typing.
  const slot = (booking as unknown as {
    session_slots: {
      id: string;
      title: string;
      starts_at: string;
      duration_minutes: number;
      type: "one_on_one" | "group";
    };
  }).session_slots;
  const user = (booking as unknown as {
    users: { email: string; name: string };
  }).users;

  try {
    await sendSessionBookedEmail({
      to: user.email,
      name: user.name,
      sessionTitle: slot.title,
      startsAtIso: slot.starts_at,
      durationMinutes: slot.duration_minutes,
      type: slot.type,
      joinUrl: `${APP_URL}/dashboard/sessions/${slot.id}`,
    });
  } catch (err) {
    // Non-fatal — log and continue. The booking already exists.
    console.error("notify-booking email failed:", err);
    return NextResponse.json({ ok: true, emailed: false });
  }

  return NextResponse.json({ ok: true, emailed: true });
}

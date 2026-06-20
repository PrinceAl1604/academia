import { NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { sendWaitlistWelcomeEmail } from "@/lib/email";

/**
 * POST /api/waitlist — public, low-friction capture for the VISIBLE waitlist.
 *
 * No auth (it's top-of-funnel). Inserts via the service role (so the table
 * needs no public-write RLS) and is rate-limited per email. Upserts on email
 * so a re-submit refreshes the contact instead of erroring.
 */

const MAX = 5;
const WINDOW_SECONDS = 600; // 10 min

export async function POST(req: Request) {
  let body: { first_name?: string; email?: string; source?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const firstName = (body.first_name ?? "").trim();
  const email = (body.email ?? "").trim().toLowerCase();

  if (firstName.length < 2 || firstName.length > 80) {
    return NextResponse.json({ error: "invalid_name" }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }

  const allowed = await checkRateLimit({
    bucket: `waitlist:${email}`,
    maxCount: MAX,
    windowSeconds: WINDOW_SECONDS,
  });
  if (!allowed) {
    return NextResponse.json(
      { error: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(WINDOW_SECONDS) } }
    );
  }

  const admin = getSupabaseAdmin();
  const { error } = await admin.from("waitlist").upsert(
    {
      first_name: firstName,
      email,
      source: (body.source ?? "liste").slice(0, 40),
    },
    { onConflict: "email" }
  );

  if (error) {
    console.error("[waitlist] insert failed:", error.message);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  // Welcome email + the gift. Non-fatal: the contact is already saved, so an
  // email hiccup shouldn't fail the signup.
  const blueprintUrl = process.env.WAITLIST_BLUEPRINT_URL || null;
  try {
    await sendWaitlistWelcomeEmail({ to: email, name: firstName, blueprintUrl });
  } catch (e) {
    console.error("[waitlist] welcome email failed:", e);
  }

  return NextResponse.json({ ok: true });
}

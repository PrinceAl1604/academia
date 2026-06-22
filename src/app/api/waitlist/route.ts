import { NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { buildWaitlistWelcomeEmail, sendWaitlistWelcomeEmail } from "@/lib/email";

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

  const source = (body.source ?? "liste").slice(0, 40);
  const admin = getSupabaseAdmin();
  const { error } = await admin.from("waitlist").upsert(
    {
      first_name: firstName,
      email,
      source,
    },
    { onConflict: "email" }
  );

  if (error) {
    console.error("[waitlist] insert failed:", error.message);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  // Welcome email + the gift. Non-fatal: the contact is already saved, so an
  // email hiccup must never fail the signup.
  //
  // Preferred path: hand the rendered email to a Zapier "Catch Hook" (set
  // ZAPIER_WAITLIST_HOOK_URL). The Zap files the lead in Google Sheets and
  // sends the message from Google Workspace (Gmail), so delivery rides on the
  // owner's own inbox reputation. When the hook isn't configured we fall back
  // to sending directly through Resend, so existing deployments keep working.
  const blueprintUrl = process.env.WAITLIST_BLUEPRINT_URL || null;
  const zapierHook = process.env.ZAPIER_WAITLIST_HOOK_URL;
  try {
    if (zapierHook) {
      const { subject, html } = buildWaitlistWelcomeEmail({
        to: email,
        name: firstName,
        blueprintUrl,
      });
      // 5s cap so a slow Zap never holds the signup response hostage.
      const res = await fetch(zapierHook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ first_name: firstName, email, source, subject, html }),
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) {
        const detail = (await res.text().catch(() => "")).slice(0, 200);
        console.error("[waitlist] Zapier hook rejected:", res.status, detail);
      } else {
        console.log("[waitlist] welcome email handed to Zapier for", email);
      }
    } else {
      // Fallback: Resend. Its SDK returns { error } instead of throwing on
      // API errors, so surface both paths (otherwise sends fail silently).
      const { error: emailError } = await sendWaitlistWelcomeEmail({
        to: email,
        name: firstName,
        blueprintUrl,
      });
      if (emailError) {
        console.error("[waitlist] Resend rejected the welcome email:", emailError);
      } else {
        console.log("[waitlist] welcome email sent via Resend to", email);
      }
    }
  } catch (e) {
    console.error("[waitlist] welcome email delivery failed:", e);
  }

  return NextResponse.json({ ok: true });
}

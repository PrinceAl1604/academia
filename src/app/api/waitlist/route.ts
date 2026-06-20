import { NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { getSupabaseAdmin } from "@/lib/supabase-server";

/**
 * POST /api/waitlist — public, low-friction capture for the VISIBLE waitlist.
 *
 * No auth (it's top-of-funnel). Inserts via the service role (so the table
 * needs no public-write RLS) and is rate-limited per WhatsApp number. Upserts
 * on WhatsApp so a re-submit refreshes the contact instead of erroring.
 */

const MAX = 5;
const WINDOW_SECONDS = 600; // 10 min

function normalizePhone(raw: string): string {
  return raw.replace(/[^\d+]/g, "");
}

export async function POST(req: Request) {
  let body: {
    first_name?: string;
    whatsapp?: string;
    email?: string;
    source?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const firstName = (body.first_name ?? "").trim();
  const whatsapp = normalizePhone(body.whatsapp ?? "");
  const email = (body.email ?? "").trim() || null;

  if (firstName.length < 2 || firstName.length > 80) {
    return NextResponse.json({ error: "invalid_name" }, { status: 400 });
  }
  if (!/^\+?\d{7,15}$/.test(whatsapp)) {
    return NextResponse.json({ error: "invalid_whatsapp" }, { status: 400 });
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }

  const allowed = await checkRateLimit({
    bucket: `waitlist:${whatsapp}`,
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
      whatsapp,
      email,
      source: (body.source ?? "liste").slice(0, 40),
    },
    { onConflict: "whatsapp" }
  );

  if (error) {
    console.error("[waitlist] insert failed:", error.message);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

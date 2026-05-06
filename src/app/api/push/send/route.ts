import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { sendPushToUser } from "@/lib/push";

/**
 * POST /api/push/send
 * Body: { notification_id: uuid }
 *
 * Server-internal endpoint called by a Postgres trigger
 * (notifications_push_send) immediately after a notification row is
 * inserted. Reads the row, looks up the user's mute prefs + push
 * subscriptions, and dispatches via web-push.
 *
 * Auth: shared secret in PUSH_INTERNAL_SECRET env var. The trigger
 * passes it as the `Authorization: Bearer ...` header. The secret
 * lives in the Vercel env + a Postgres GUC (set in the migration).
 */
export async function POST(req: Request) {
  const expected = process.env.PUSH_INTERNAL_SECRET;
  if (!expected) {
    // No secret configured = push send disabled. Return ok so the
    // trigger doesn't error endlessly, but log so it's debuggable.
    console.warn("PUSH_INTERNAL_SECRET not set; push send disabled");
    return NextResponse.json({ ok: false, reason: "not_configured" });
  }

  // Timing-safe comparison: a naive `auth !== \`Bearer …\`` early-exits
  // on the first mismatching byte, leaking the secret one character
  // at a time via response timing. timingSafeEqual is constant-time.
  // Length must match before the call or it throws (and length itself
  // becomes the side channel) — pad-equal first via length check.
  const auth = req.headers.get("authorization") ?? "";
  const expectedHeader = `Bearer ${expected}`;
  const a = Buffer.from(auth, "utf8");
  const b = Buffer.from(expectedHeader, "utf8");
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { notification_id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const id = body.notification_id;
  if (!id) {
    return NextResponse.json(
      { error: "Missing notification_id" },
      { status: 400 }
    );
  }

  const admin = getSupabaseAdmin();
  const { data: notif } = await admin
    .from("notifications")
    .select("id, user_id, type, payload, link")
    .eq("id", id)
    .single();

  if (!notif) {
    return NextResponse.json({ ok: false, reason: "not_found" });
  }

  // Honor the user's "push" mute category. Stored alongside the
  // existing in-app/email mutes in notification_preferences.
  const { data: prefs } = await admin
    .from("users")
    .select("notification_preferences")
    .eq("id", notif.user_id)
    .single();
  const prefObj = prefs?.notification_preferences as
    | { muted_push_categories?: string[] }
    | null;
  const muted = Array.isArray(prefObj?.muted_push_categories)
    ? prefObj!.muted_push_categories!
    : [];
  if (muted.includes("__all__")) {
    return NextResponse.json({ ok: true, sent: 0, reason: "muted_all" });
  }

  // Render a minimal title + body — the service worker doesn't have
  // i18n context, so we use English. Users who prefer FR see French
  // text inside the app (via the bell renderer); the system push
  // banner is a "tap to see more" prompt.
  const title = renderPushTitle(notif);
  const sent = await sendPushToUser(notif.user_id, {
    title,
    body: renderPushBody(notif),
    url: notif.link || "/dashboard/notifications",
    tag: notif.type,
  });

  return NextResponse.json({ ok: true, sent });
}

function renderPushTitle(n: { type: string; payload: Record<string, unknown> }): string {
  const p = n.payload || {};
  const get = (k: string) => (p[k] as string | undefined) ?? "";
  switch (n.type) {
    case "dm_message":
      return `New message from ${get("sender_name") || "someone"}`;
    case "chat_mention":
      return `${get("sender_name") || "Someone"} mentioned you`;
    case "announcement":
      return `${get("sender_name") || "Admin"} posted an announcement`;
    case "new_course":
      return `New course: ${get("title") || ""}`;
    case "session_booked":
      return "Session booked";
    case "session_reminder":
      return `Tomorrow: ${get("title") || "your session"}`;
    case "session_live":
      return `${get("title") || "Your session"} is live now`;
    case "session_cancelled":
      return "Session cancelled";
    case "session_updated":
      return "Session updated";
    case "pro_expiring":
      return `Pro expires in ${p.days_left ?? "a few"} days`;
    case "pro_renewed":
      return "Pro renewed";
    case "pro_expired":
      return "Pro has expired";
    case "referral_signup":
      return `${get("name") || "Someone"} signed up via your link`;
    case "referral_rewarded":
      return "You earned a free month";
    case "welcome":
      return "Welcome to Brightroots";
    default:
      return "Brightroots";
  }
}

function renderPushBody(n: { type: string; payload: Record<string, unknown> }): string {
  const p = n.payload || {};
  const get = (k: string) => (p[k] as string | undefined) ?? "";
  switch (n.type) {
    case "dm_message":
    case "chat_mention":
    case "announcement":
      return get("preview") || "";
    case "session_live":
      return "Tap to join the room";
    case "session_reminder":
      return `Don't forget — ${p.duration_minutes ?? ""} min`;
    case "pro_expiring":
      return "Renew to keep premium access";
    default:
      return "";
  }
}

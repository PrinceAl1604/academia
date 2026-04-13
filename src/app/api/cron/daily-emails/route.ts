import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import {
  sendRenewalReminderEmail,
  sendProExpiredEmail,
  sendInactiveNudgeEmail,
} from "@/lib/email";

/**
 * GET /api/cron/daily-emails
 * Runs daily via Vercel Cron. Handles:
 *  1. Renewal reminders (3 days before Pro expires)
 *  2. Pro expired notifications (expired within last 24h)
 *  3. Inactive user nudges (14 days without login)
 *
 * Protected by CRON_SECRET to prevent unauthorized access.
 */
export async function GET(req: Request) {
  // Verify cron secret (Vercel sets this automatically for cron jobs)
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  const now = new Date();
  const results = { reminders: 0, expired: 0, nudges: 0, errors: [] as string[] };

  // ─── 1. Renewal reminders: Pro expires in exactly 3 days ───
  try {
    const threeDaysFromNow = new Date(now);
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
    const dayStart = new Date(threeDaysFromNow);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(threeDaysFromNow);
    dayEnd.setHours(23, 59, 59, 999);

    const { data: expiringSoon } = await supabase
      .from("users")
      .select("email, name, pro_expires_at, notification_preferences")
      .eq("subscription_tier", "pro")
      .neq("role", "admin")
      .gte("pro_expires_at", dayStart.toISOString())
      .lte("pro_expires_at", dayEnd.toISOString());

    for (const user of expiringSoon ?? []) {
      try {
        await sendRenewalReminderEmail({
          to: user.email,
          name: user.name,
          daysLeft: 3,
        });
        results.reminders++;
      } catch (err) {
        results.errors.push(`reminder:${user.email}:${String(err)}`);
      }
    }
  } catch (err) {
    results.errors.push(`reminders_query:${String(err)}`);
  }

  // ─── 2. Pro expired: expired within last 24 hours ──────────
  try {
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const { data: justExpired } = await supabase
      .from("users")
      .select("email, name, pro_expires_at")
      .eq("subscription_tier", "pro")
      .neq("role", "admin")
      .gte("pro_expires_at", twentyFourHoursAgo.toISOString())
      .lte("pro_expires_at", now.toISOString());

    for (const user of justExpired ?? []) {
      try {
        await sendProExpiredEmail({ to: user.email, name: user.name });
        // Downgrade to free
        await supabase
          .from("users")
          .update({ subscription_tier: "free" })
          .eq("email", user.email);
        results.expired++;
      } catch (err) {
        results.errors.push(`expired:${user.email}:${String(err)}`);
      }
    }
  } catch (err) {
    results.errors.push(`expired_query:${String(err)}`);
  }

  // ─── 3. Inactive nudge: no login for 14 days, free users ──
  try {
    const fourteenDaysAgo = new Date(now);
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
    const windowStart = new Date(fourteenDaysAgo);
    windowStart.setHours(0, 0, 0, 0);
    const windowEnd = new Date(fourteenDaysAgo);
    windowEnd.setHours(23, 59, 59, 999);

    const { data: inactiveUsers } = await supabase
      .from("users")
      .select("email, name, notification_preferences")
      .neq("role", "admin")
      .gte("last_active_at", windowStart.toISOString())
      .lte("last_active_at", windowEnd.toISOString());

    for (const user of inactiveUsers ?? []) {
      // Respect notification preferences
      const prefs = user.notification_preferences as Record<string, boolean> | null;
      if (prefs && prefs.promotional === false) continue;

      try {
        await sendInactiveNudgeEmail({ to: user.email, name: user.name });
        results.nudges++;
      } catch (err) {
        results.errors.push(`nudge:${user.email}:${String(err)}`);
      }
    }
  } catch (err) {
    results.errors.push(`nudge_query:${String(err)}`);
  }

  return NextResponse.json({
    ok: true,
    sent: results.reminders + results.expired + results.nudges,
    details: {
      reminders: results.reminders,
      expired: results.expired,
      nudges: results.nudges,
    },
    errors: results.errors.length > 0 ? results.errors : undefined,
  });
}

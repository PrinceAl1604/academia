import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import {
  sendRenewalReminderEmail,
  sendProExpiredEmail,
  sendInactiveNudgeEmail,
  sendSessionReminderEmail,
} from "@/lib/email";

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || "https://academia-vert-phi.vercel.app";

/**
 * GET /api/cron/daily-emails
 * Runs daily via Vercel Cron. Handles:
 *  1. Renewal reminders (3 days before Pro expires)
 *  2. Pro expired notifications (expired within last 24h)
 *  3. Inactive user nudges (14 days without login)
 *  4. Live session reminders (~24h before booked sessions)
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
  const results = {
    reminders: 0,
    expired: 0,
    nudges: 0,
    sessionReminders: 0,
    sessionsCompleted: 0,
    errors: [] as string[],
  };

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

  // ─── 4. Live session reminders: tomorrow's bookings ────────
  // Cron runs daily at 8am UTC, so we look for bookings starting in
  // the next 12-36 hours. That window catches every session happening
  // tomorrow regardless of time-of-day, and the next cron run will
  // catch the day after. The `reminder_sent_at IS NULL` clause on the
  // partial index makes this query cheap as the table grows.
  try {
    const windowStart = new Date(now.getTime() + 12 * 60 * 60 * 1000);
    const windowEnd = new Date(now.getTime() + 36 * 60 * 60 * 1000);

    const { data: pendingReminders } = await supabase
      .from("session_bookings")
      .select(
        "id, session_slots!inner(id, title, starts_at, duration_minutes, type, status), users!inner(email, name)"
      )
      .is("cancelled_at", null)
      .is("reminder_sent_at", null)
      .gte("session_slots.starts_at", windowStart.toISOString())
      .lte("session_slots.starts_at", windowEnd.toISOString())
      .eq("session_slots.status", "open");

    for (const row of pendingReminders ?? []) {
      // Supabase types the join as object|object[] depending on the
      // FK shape — at runtime !inner returns a single object for both.
      const slot = (row as unknown as {
        session_slots: {
          id: string;
          title: string;
          starts_at: string;
          duration_minutes: number;
          type: "one_on_one" | "group";
        };
        users: { email: string; name: string };
      }).session_slots;
      const user = (row as unknown as {
        users: { email: string; name: string };
      }).users;

      try {
        await sendSessionReminderEmail({
          to: user.email,
          name: user.name,
          sessionTitle: slot.title,
          startsAtIso: slot.starts_at,
          durationMinutes: slot.duration_minutes,
          type: slot.type,
          joinUrl: `${APP_URL}/dashboard/sessions/${slot.id}`,
        });
        await supabase
          .from("session_bookings")
          .update({ reminder_sent_at: new Date().toISOString() })
          .eq("id", (row as { id: string }).id);
        results.sessionReminders++;
      } catch (err) {
        results.errors.push(
          `session_reminder:${user.email}:${String(err)}`
        );
      }
    }
  } catch (err) {
    results.errors.push(`session_reminders_query:${String(err)}`);
  }

  // ─── 5. Auto-complete past slots ───────────────────────────
  // Once a slot has aged past `starts_at + duration + 30min buffer`
  // (the LIVE window), flip status from 'open' to 'completed' so
  // the admin list is a clean log. We only touch slots still 'open'
  // so we don't clobber 'cancelled' state.
  //
  // PostgREST can't express the per-row computed expression
  // `starts_at + duration_minutes`, so we pre-filter to rows whose
  // starts_at could possibly be past the buffer (max valid duration
  // is 240 min, so anything older than (240+30)min from now is
  // definitely past), then resolve per-row in app code.
  try {
    const widestEndCutoff = new Date(
      now.getTime() - (240 + 30) * 60 * 1000
    ); // anything older than this is DEFINITELY past
    const earliestPossiblyPast = new Date(now.getTime() - 30 * 60 * 1000);
    const { data: candidates } = await supabase
      .from("session_slots")
      .select("id, starts_at, duration_minutes")
      .eq("status", "open")
      .lte("starts_at", earliestPossiblyPast.toISOString())
      .gte("starts_at", new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString());

    const toComplete: string[] = [];
    for (const row of candidates ?? []) {
      const r = row as { id: string; starts_at: string; duration_minutes: number };
      const endsAtMs = new Date(r.starts_at).getTime() + r.duration_minutes * 60_000;
      if (endsAtMs + 30 * 60_000 < now.getTime()) {
        toComplete.push(r.id);
      }
    }

    if (toComplete.length > 0) {
      await supabase
        .from("session_slots")
        .update({ status: "completed" })
        .in("id", toComplete)
        .eq("status", "open");
      results.sessionsCompleted = toComplete.length;
    }
    // widestEndCutoff intentionally referenced via comment for context
    void widestEndCutoff;
  } catch (err) {
    results.errors.push(`auto_complete:${String(err)}`);
  }

  return NextResponse.json({
    ok: true,
    sent:
      results.reminders +
      results.expired +
      results.nudges +
      results.sessionReminders,
    details: {
      reminders: results.reminders,
      expired: results.expired,
      nudges: results.nudges,
      sessionReminders: results.sessionReminders,
      sessionsCompleted: results.sessionsCompleted,
    },
    errors: results.errors.length > 0 ? results.errors : undefined,
  });
}

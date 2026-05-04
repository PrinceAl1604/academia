import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import {
  sendRenewalReminderEmail,
  sendProExpiredEmail,
  sendInactiveNudgeEmail,
  sendSessionReminderEmail,
} from "@/lib/email";
import { getDailyMeetingParticipants } from "@/lib/daily";

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || "https://academia-vert-phi.vercel.app";

/**
 * True iff the user has muted this email category in their
 * notification_preferences. Centralized helper so every cron block
 * can short-circuit consistently.
 */
function emailMuted(
  prefs: unknown,
  category: string
): boolean {
  if (!prefs || typeof prefs !== "object") return false;
  const p = prefs as { muted_email_categories?: string[] };
  return Array.isArray(p.muted_email_categories)
    ? p.muted_email_categories.includes(category)
    : false;
}

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
  const startedAtMs = Date.now();
  const results = {
    reminders: 0,
    expired: 0,
    nudges: 0,
    sessionReminders: 0,
    sessionsCompleted: 0,
    noShowsFlagged: 0,
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
      .select("id, email, name, pro_expires_at, notification_preferences")
      .eq("subscription_tier", "pro")
      .neq("role", "admin")
      .gte("pro_expires_at", dayStart.toISOString())
      .lte("pro_expires_at", dayEnd.toISOString());

    for (const user of expiringSoon ?? []) {
      // Skip email if user muted the "pro" email category. In-app
      // notification still fires below (separate mute path).
      if (emailMuted(user.notification_preferences, "pro")) {
        // no-op email
      } else {
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
      // In-app bell — runs alongside email so users who don't open
      // their inbox still get the prompt next time they open the app.
      try {
        await supabase.from("notifications").insert({
          user_id: user.id,
          type: "pro_expiring",
          payload: {
            days_left: 3,
            expires_at: user.pro_expires_at,
          },
          link: "/dashboard/subscription",
        });
      } catch (err) {
        results.errors.push(`notif_expiring:${user.email}:${String(err)}`);
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
      .select("id, email, name, pro_expires_at, notification_preferences")
      .eq("subscription_tier", "pro")
      .neq("role", "admin")
      .gte("pro_expires_at", twentyFourHoursAgo.toISOString())
      .lte("pro_expires_at", now.toISOString());

    for (const user of justExpired ?? []) {
      // Email subject to muted_email_categories — but the DB
      // downgrade below ALWAYS happens regardless of email pref.
      if (!emailMuted(user.notification_preferences, "pro")) {
        try {
          await sendProExpiredEmail({ to: user.email, name: user.name });
          results.expired++;
        } catch (err) {
          results.errors.push(`expired:${user.email}:${String(err)}`);
        }
      }
      // Downgrade always runs
      try {
        await supabase
          .from("users")
          .update({ subscription_tier: "free" })
          .eq("email", user.email);
      } catch (err) {
        results.errors.push(`downgrade:${user.email}:${String(err)}`);
      }
      // In-app pro_expired notification — pairs with the email so
      // users who don't open inbox see the prompt next app visit.
      // Routes through the create_notification helper which honors
      // muted_types preferences.
      try {
        await supabase.rpc("create_notification", {
          p_user_id: user.id,
          p_type: "pro_expired",
          p_payload: {
            expires_at: user.pro_expires_at,
          },
          p_link: "/dashboard/subscription",
        });
      } catch (err) {
        results.errors.push(`notif_expired:${user.email}:${String(err)}`);
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
        "id, user_id, session_slots!inner(id, title, starts_at, duration_minutes, type, status), users!inner(email, name, notification_preferences)"
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
        users: {
          email: string;
          name: string;
          notification_preferences?: unknown;
        };
      }).users;

      // Skip email if user muted "session" emails. Reminder mark
      // still fires below so we don't keep retrying.
      if (!emailMuted(user.notification_preferences, "session")) {
        try {
          await sendSessionReminderEmail({
            to: user.email,
            name: user.name,
            sessionTitle: slot.title,
            startsAtIso: slot.starts_at,
            durationMinutes: slot.duration_minutes,
            type: slot.type,
            joinUrl: `${APP_URL}/dashboard/sessions/${slot.id}`,
            bookingId: (row as { id: string }).id,
          });
          results.sessionReminders++;
        } catch (err) {
          results.errors.push(
            `session_reminder:${user.email}:${String(err)}`
          );
        }
      }
      try {
        await supabase
          .from("session_bookings")
          .update({ reminder_sent_at: new Date().toISOString() })
          .eq("id", (row as { id: string }).id);
      } catch (err) {
        results.errors.push(`reminder_mark:${user.email}:${String(err)}`);
      }
      // In-app notification — pairs with the email so users who don't
      // open their inbox still see "you have a session tomorrow" on
      // their next app visit.
      try {
        await supabase.from("notifications").insert({
          user_id: (row as { user_id: string }).user_id,
          type: "session_reminder",
          payload: {
            slot_id: slot.id,
            title: slot.title,
            starts_at: slot.starts_at,
            duration_minutes: slot.duration_minutes,
          },
          link: `/dashboard/sessions/${slot.id}`,
        });
      } catch (err) {
        results.errors.push(
          `notif_session_reminder:${user.email}:${String(err)}`
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

      // For each just-completed slot, query Daily for the meeting's
      // participant list and flag bookings whose user didn't appear.
      // No-shows still consume the user's monthly cap (that's the
      // whole point — book → ghost → cap is gone, so they think
      // twice next time).
      for (const slotId of toComplete) {
        try {
          const { data: slotRow } = await supabase
            .from("session_slots")
            .select("room_name")
            .eq("id", slotId)
            .single();
          if (!slotRow) continue;
          const roomName = (slotRow as { room_name: string }).room_name;

          const participantNames = await getDailyMeetingParticipants(
            roomName
          );
          // Empty set is informative — meeting never happened. We
          // don't flag the booking as no-show in that case (the host
          // didn't show up either). Skip.
          if (participantNames.length === 0) continue;

          const { data: slotBookings } = await supabase
            .from("session_bookings")
            .select("id, users!inner(name, email)")
            .eq("slot_id", slotId)
            .is("cancelled_at", null)
            .is("no_show_at", null);

          for (const row of slotBookings ?? []) {
            const u = (row as unknown as {
              users: { name: string | null; email: string };
            }).users;
            const candidates = [
              u.name?.toLowerCase().trim(),
              u.email.split("@")[0].toLowerCase().trim(),
              u.name?.split(" ")[0].toLowerCase().trim(),
            ].filter(Boolean) as string[];
            // Match if any candidate substring appears in any
            // participant name. Fuzzy intentionally — Daily preserves
            // user-typed casing/format and we need to tolerate
            // "Alex L." vs "Alex Landrin" etc.
            const attended = candidates.some((c) =>
              participantNames.some((p) => p.includes(c) || c.includes(p))
            );
            if (!attended) {
              await supabase
                .from("session_bookings")
                .update({ no_show_at: new Date().toISOString() })
                .eq("id", (row as { id: string }).id);
              results.noShowsFlagged++;
            }
          }
        } catch (err) {
          results.errors.push(
            `no_show_check_${slotId}:${String(err)}`
          );
        }
      }
    }
    // widestEndCutoff intentionally referenced via comment for context
    void widestEndCutoff;
  } catch (err) {
    results.errors.push(`auto_complete:${String(err)}`);
  }

  // ─── 6. Persist cron log + alert admin on errors ───────────
  // Without this, silent failures (Resend down, Daily auth wrong)
  // go unnoticed for days. cron_logs gives admin a queryable
  // history; the email alert escalates anything that errored.
  const durationMs = Date.now() - startedAtMs;
  const totalSent =
    results.reminders +
    results.expired +
    results.nudges +
    results.sessionReminders;
  try {
    await supabase.from("cron_logs").insert({
      job_name: "daily-emails",
      ok: results.errors.length === 0,
      details: {
        sent: totalSent,
        reminders: results.reminders,
        expired: results.expired,
        nudges: results.nudges,
        sessionReminders: results.sessionReminders,
        sessionsCompleted: results.sessionsCompleted,
        noShowsFlagged: results.noShowsFlagged,
      },
      errors: results.errors.length > 0 ? results.errors : null,
      duration_ms: durationMs,
    });
  } catch {
    // Logging failure must never break the response — swallow.
  }

  // Best-effort admin alert. We could route to Slack/PagerDuty later;
  // for now, the FROM_EMAIL also receives a digest if anything broke.
  // Skipped if no errors.
  if (results.errors.length > 0) {
    try {
      const { Resend } = await import("resend");
      const resend = new Resend(process.env.RESEND_API_KEY);
      const adminAlert = process.env.ADMIN_ALERT_EMAIL;
      if (adminAlert) {
        await resend.emails.send({
          from:
            process.env.FROM_EMAIL ||
            "Brightroots <noreply@resend.dev>",
          to: adminAlert,
          subject: `[Brightroots cron] daily-emails had ${results.errors.length} error(s)`,
          text: [
            `Run at ${now.toISOString()}`,
            `Duration: ${durationMs}ms`,
            `Sent: ${totalSent}`,
            ``,
            `Errors:`,
            ...results.errors.map((e) => `- ${e}`),
          ].join("\n"),
        });
      }
    } catch {
      // ignore — already logged in cron_logs above
    }
  }

  return NextResponse.json({
    ok: true,
    sent: totalSent,
    details: {
      reminders: results.reminders,
      expired: results.expired,
      nudges: results.nudges,
      sessionReminders: results.sessionReminders,
      sessionsCompleted: results.sessionsCompleted,
      noShowsFlagged: results.noShowsFlagged,
    },
    errors: results.errors.length > 0 ? results.errors : undefined,
    duration_ms: durationMs,
  });
}

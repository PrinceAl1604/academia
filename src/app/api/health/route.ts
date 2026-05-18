import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";

/**
 * GET /api/health
 *
 * Public uptime probe. Returns 200 if the app is healthy, 5xx if a
 * dependency is broken. Hit this from an external monitor (Uptime
 * Robot, Better Uptime, Vercel Cron, etc.) every 1-5 minutes; you get
 * an alert the moment something downstream goes red.
 *
 * Design tension you decide below:
 *   - STRICT: probe more dependencies (DB, push config, Daily, Resend).
 *     Catches more breakage but a single slow third-party turns the
 *     monitor into a false-positive generator.
 *   - LENIENT: probe only what we CONTROL (DB reachability + the auth
 *     stack). Fewer false positives but a Resend outage isn't caught
 *     here — you'd find it from the missing-email user reports.
 *
 * Most production apps land in the middle: probe the things whose
 * failure would silently break the product. Use this endpoint for
 * those; rely on Sentry / user reports for everything else.
 */
export async function GET() {
  const checks: Record<string, "ok" | "fail" | "skipped"> = {};
  const startedAt = Date.now();

  // ── REQUIRED CHECK: database reachability ──────────────────────
  // SELECT 1 against a small table. Confirms the Supabase JS stack,
  // the network path to Postgres, AND that the service-role key is
  // still valid. If this fails, nothing in the app works.
  try {
    const admin = getSupabaseAdmin();
    const { error } = await admin.from("users").select("id").limit(1);
    checks.database = error ? "fail" : "ok";
  } catch {
    checks.database = "fail";
  }

  // ── YOUR DECISION: what else should "healthy" mean? ─────────────
  // See block comment above for the trade-off. Three candidate
  // checks are scaffolded below — uncomment / adapt the ones that
  // match the dependencies whose failure you'd want to know about
  // BEFORE a user reports it. Or add your own.
  //
  // TODO(launch): pick which checks to enable and tune their pass
  // criteria. Suggested starting point: keep `database` only for the
  // first week, watch the false-positive rate, then add more.

  // ── Candidate 1: cron freshness (was the daily cron alive recently?)
  //    Reads cron_logs for the most recent daily-emails run; fails
  //    if it's older than 36 hours (cron is daily, 12h slack).
  //
  // try {
  //   const admin = getSupabaseAdmin();
  //   const { data } = await admin
  //     .from("cron_logs")
  //     .select("created_at")
  //     .eq("job_name", "daily-emails")
  //     .order("created_at", { ascending: false })
  //     .limit(1)
  //     .single();
  //   const ageHours = data
  //     ? (Date.now() - new Date(data.created_at).getTime()) / 3_600_000
  //     : Infinity;
  //   checks.cron = ageHours < 36 ? "ok" : "fail";
  // } catch {
  //   checks.cron = "fail";
  // }

  // ── Candidate 2: push secret configured (in-app push pipeline alive?)
  //    Reads app_config to confirm the push URL + secret are set.
  //    Doesn't actually send a push — too noisy. Just confirms the
  //    pipeline isn't disabled by missing config.
  //
  // try {
  //   const admin = getSupabaseAdmin();
  //   const { data } = await admin
  //     .from("app_config")
  //     .select("key")
  //     .in("key", ["push_url", "push_secret"]);
  //   checks.push_config = (data?.length ?? 0) === 2 ? "ok" : "fail";
  // } catch {
  //   checks.push_config = "fail";
  // }

  // ── Candidate 3: critical env vars present
  //    Cheap and useful — catches a deploy that forgot to set a
  //    secret. Doesn't validate the secrets work, just that they exist.
  //
  // const required = [
  //   "CRON_SECRET", "RESEND_API_KEY", "DAILY_API_KEY",
  //   "MONETBIL_SERVICE_SECRET", "CINETPAY_WEBHOOK_SECRET",
  // ];
  // checks.env = required.every((k) => !!process.env[k]) ? "ok" : "fail";

  const ok = Object.values(checks).every((v) => v !== "fail");
  return NextResponse.json(
    {
      ok,
      checks,
      duration_ms: Date.now() - startedAt,
    },
    { status: ok ? 200 : 503 }
  );
}

// Force dynamic so this is never cached at the edge — the whole point
// is to probe live state.
export const dynamic = "force-dynamic";

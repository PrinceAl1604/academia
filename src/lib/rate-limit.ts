import { getSupabaseAdmin } from "./supabase-server";

/**
 * Cross-instance rate limit gate. Replaces per-process in-memory
 * counters that didn't survive Vercel's parallel cold starts —
 * attackers could otherwise cycle through fresh function instances
 * to exceed the cap.
 *
 * Uses the `rate_limit_check` Postgres function, which atomically
 * upserts a counter keyed by `bucket` and returns true if the
 * request is still under `maxCount` for the current window.
 *
 * Bucket convention: `<route-name>:<key>` so different routes can
 * share the same client identifier without colliding. Examples:
 *   `licence-activate:198.51.100.7`
 *   `ensure-room:user-uuid`
 */
export async function checkRateLimit(opts: {
  bucket: string;
  maxCount: number;
  windowSeconds: number;
}): Promise<boolean> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin.rpc("rate_limit_check", {
    p_bucket: opts.bucket,
    p_max_count: opts.maxCount,
    p_window_seconds: opts.windowSeconds,
  });
  if (error) {
    // On DB failure, fail OPEN — better to allow legitimate users
    // through than to lock everyone out if the rate-limit table is
    // unreachable. Logged so it's visible in Vercel.
    console.error("[rate-limit] check failed:", error.message);
    return true;
  }
  return data === true;
}

import webpush from "web-push";
import { getSupabaseAdmin } from "./supabase-server";

/**
 * Web Push helper. Reads VAPID keys from env vars, dispatches push
 * payloads to all registered subscriptions for a user, and prunes
 * dead endpoints (410 Gone) automatically.
 *
 * Env vars (set in Vercel):
 *   - NEXT_PUBLIC_VAPID_PUBLIC_KEY  (also used by client to subscribe)
 *   - VAPID_PRIVATE_KEY             (server secret)
 *   - VAPID_SUBJECT                 (mailto:..., FCM/APNs require it)
 *
 * If env vars are missing, sendPush is a no-op so the rest of the
 * notification flow keeps working.
 */

let configured = false;
function configureOnce() {
  if (configured) return true;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:support@brightroots.com";
  if (!pub || !priv) return false;
  webpush.setVapidDetails(subject, pub, priv);
  configured = true;
  return true;
}

export interface PushPayload {
  title: string;
  body?: string;
  url?: string;
  tag?: string;
}

/**
 * Send a push to every registered subscription for a user. Returns
 * the count of successful sends. Failures are logged but never
 * thrown — the caller should treat push as best-effort delivery.
 */
export async function sendPushToUser(
  userId: string,
  payload: PushPayload
): Promise<number> {
  if (!configureOnce()) return 0;

  const admin = getSupabaseAdmin();
  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", userId);

  if (!subs || subs.length === 0) return 0;

  const json = JSON.stringify(payload);

  // Fan out in parallel. Sequential `for await` previously serialized
  // the per-device round trips: a user with 5 devices waited 5×
  // ~150ms = ~750ms. With Promise.allSettled the wall-clock collapses
  // to the slowest device.
  //
  // Dead-endpoint pruning is batched into one DELETE at the end
  // instead of one DELETE per failure — cuts N round trips to 1.
  const results = await Promise.allSettled(
    subs.map((s) =>
      webpush.sendNotification(
        {
          endpoint: s.endpoint,
          keys: { p256dh: s.p256dh, auth: s.auth },
        },
        json,
        { TTL: 3600 } // browser keeps push for 1h if user offline
      )
    )
  );

  const deadIds: string[] = [];
  let sent = 0;
  results.forEach((r, idx) => {
    if (r.status === "fulfilled") {
      sent++;
    } else {
      const statusCode = (r.reason as { statusCode?: number })?.statusCode;
      if (statusCode === 410 || statusCode === 404) {
        // 410 Gone: subscription revoked. 404: endpoint deleted.
        // Either way, the row is dead — prune it.
        deadIds.push(subs[idx].id);
      } else {
        console.error("push send failed:", statusCode, r.reason);
      }
    }
  });

  if (deadIds.length > 0) {
    await admin.from("push_subscriptions").delete().in("id", deadIds);
  }

  return sent;
}

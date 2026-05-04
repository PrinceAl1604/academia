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
  let sent = 0;
  for (const s of subs) {
    try {
      await webpush.sendNotification(
        {
          endpoint: s.endpoint,
          keys: { p256dh: s.p256dh, auth: s.auth },
        },
        json,
        { TTL: 3600 } // browser keeps push for 1h if user offline
      );
      sent++;
    } catch (err: unknown) {
      // 410 Gone = subscription expired/revoked; 404 = endpoint
      // doesn't exist anymore. Either way, prune the row so we
      // stop trying to send to a dead endpoint.
      const statusCode = (err as { statusCode?: number })?.statusCode;
      if (statusCode === 410 || statusCode === 404) {
        await admin.from("push_subscriptions").delete().eq("id", s.id);
      } else {
        console.error("push send failed:", statusCode, err);
      }
    }
  }
  return sent;
}

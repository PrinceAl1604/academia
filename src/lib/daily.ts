/**
 * Daily.co integration — server-side only.
 *
 * We use Daily as our video provider after meet.jit.si became
 * unsuitable for production (5-min disconnect on embedded iframes
 * + moderator-gate). Daily's free tier covers ~10k participant-min
 * per month which comfortably handles our Pro membership at 2
 * sessions/user/month.
 *
 * Two env vars required (set in Vercel):
 *   - DAILY_API_KEY              — server secret, never ship to client
 *   - NEXT_PUBLIC_DAILY_DOMAIN   — public subdomain, e.g. "brightroots"
 *                                  (URL becomes https://brightroots.daily.co/...)
 *
 * Design choice: room creation is IDEMPOTENT and LAZY. We don't track
 * "is this Daily room provisioned yet" in our DB — every join POSTs to
 * Daily's /rooms endpoint and treats "already exists" as success.
 * Daily IS the source of truth for room existence.
 */

const DAILY_API_BASE = "https://api.daily.co/v1";

export interface DailyRoomConfig {
  /** Stable room name we generated when the slot was published. */
  name: string;
  /** UNIX-seconds when the room should auto-delete. Use end-of-session + buffer. */
  exp: number;
  /** Cap participants — slot.max_attendees + 1 for the host. */
  maxParticipants: number;
}

/**
 * Ensure a Daily room exists. Returns the join URL.
 * Idempotent — safe to call multiple times for the same room name.
 */
export async function ensureDailyRoom(
  config: DailyRoomConfig
): Promise<string> {
  const apiKey = process.env.DAILY_API_KEY;
  const domain = process.env.NEXT_PUBLIC_DAILY_DOMAIN;
  if (!apiKey) throw new Error("DAILY_API_KEY env var not set");
  if (!domain) throw new Error("NEXT_PUBLIC_DAILY_DOMAIN env var not set");

  const res = await fetch(`${DAILY_API_BASE}/rooms`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: config.name,
      properties: {
        // Auto-delete the room when the session ends (+ buffer).
        // Combined with eject_at_room_exp, anyone still inside gets
        // kicked at exp time so we don't leak free-tier minutes.
        exp: config.exp,
        eject_at_room_exp: true,
        max_participants: config.maxParticipants,
        // Boot straight into the room — same UX we had with Jitsi's
        // prejoinPageEnabled=false. Our app has its own "lobby"
        // (the lifecycle gate) so Daily's prejoin would be redundant.
        enable_prejoin_ui: false,
        // Chat is useful for sharing links / writing follow-ups.
        enable_chat: true,
        // We handle access via our own RLS + auth, so no Daily knock.
        enable_knocking: false,
      },
    }),
  });

  if (res.ok) {
    return roomUrl(domain, config.name);
  }

  // Idempotent path: Daily returns 400 with "already-exists" when a
  // room with this name was created before. We treat that as success.
  // Any other error is real.
  const body = await res.json().catch(() => ({}));
  const errorMsg =
    typeof body?.info === "string"
      ? body.info
      : typeof body?.error === "string"
      ? body.error
      : "";
  if (
    res.status === 400 &&
    /already.*(exist|taken|in use)/i.test(errorMsg)
  ) {
    return roomUrl(domain, config.name);
  }

  throw new Error(
    `Daily API error ${res.status}: ${errorMsg || JSON.stringify(body)}`
  );
}

/**
 * Construct the public Daily room URL. Used by the iframe src.
 * Does NOT call the API — assumes the room exists (or will be auto-
 * created by ensureDailyRoom on the same request).
 */
function roomUrl(domain: string, roomName: string): string {
  return `https://${domain}.daily.co/${roomName}`;
}

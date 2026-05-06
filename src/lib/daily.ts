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
 * Mint a meeting token for a specific user. The token embeds
 * `user_id` (our Postgres UUID) and locks `user_name`, so when the
 * user joins the meeting, Daily's `/meetings` endpoint reports back
 * the same `user_id` we set here. This makes no-show detection
 * exact instead of fuzzy-name-matching against display names that
 * users can rename mid-call.
 *
 * Tokens are short-lived (capped to room exp + 1h grace) so a leaked
 * token can't be replayed long after the session.
 */
export interface DailyTokenConfig {
  /** Room name the token grants access to. */
  roomName: string;
  /** Our Postgres user UUID — comes back on /meetings as participant.user_id. */
  userId: string;
  /** Display name shown in the room. */
  userName: string;
  /** UNIX-seconds when the token stops being accepted. */
  exp: number;
}

export async function mintDailyMeetingToken(
  config: DailyTokenConfig
): Promise<string> {
  const apiKey = process.env.DAILY_API_KEY;
  if (!apiKey) throw new Error("DAILY_API_KEY env var not set");

  const res = await fetch(`${DAILY_API_BASE}/meeting-tokens`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      properties: {
        room_name: config.roomName,
        user_id: config.userId,
        user_name: config.userName,
        exp: config.exp,
        // Students aren't owners — keeps the moderator-style controls
        // gated. Hosts get their own token with is_owner: true.
        is_owner: false,
      },
    }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      `Daily /meeting-tokens ${res.status}: ${
        typeof body?.info === "string" ? body.info : JSON.stringify(body)
      }`
    );
  }
  const json = (await res.json()) as { token?: string };
  if (!json.token) {
    throw new Error("Daily /meeting-tokens returned no token");
  }
  return json.token;
}

/**
 * Fetch the list of participants who joined a Daily room. Used by
 * the daily cron to flag no-shows after a session ends.
 *
 * Daily retains meeting history for ~30 days on the free tier so
 * the cron's once-a-day cadence has plenty of buffer to query a
 * just-ended session.
 *
 * Returns participant records with both `user_id` (when minted via
 * mintDailyMeetingToken — exact match) and `name` (lowercased
 * fallback for legacy meetings created before token minting was
 * wired up). The cron prefers user_id where present.
 */
export interface DailyParticipant {
  /** Our user UUID, present iff a meeting-token was minted server-side. */
  user_id: string | null;
  /** Display name, lowercased + trimmed. Fuzzy fallback. */
  name: string;
}

export async function getDailyMeetingParticipants(
  roomName: string
): Promise<DailyParticipant[]> {
  const apiKey = process.env.DAILY_API_KEY;
  if (!apiKey) throw new Error("DAILY_API_KEY env var not set");

  const res = await fetch(
    `${DAILY_API_BASE}/meetings?room=${encodeURIComponent(roomName)}&limit=100`,
    {
      headers: { Authorization: `Bearer ${apiKey}` },
    }
  );
  if (!res.ok) {
    throw new Error(`Daily /meetings ${res.status}`);
  }
  const data = (await res.json()) as {
    data?: Array<{
      participants?: Array<{ user_name?: string; user_id?: string }>;
    }>;
  };
  // Deduplicate by user_id (when set) or name. A user who joined
  // multiple meetings on the same room (rejoined after disconnect)
  // shows up once in the resulting set.
  const seen = new Map<string, DailyParticipant>();
  for (const meeting of data.data ?? []) {
    for (const p of meeting.participants ?? []) {
      const name = (p.user_name || "").trim().toLowerCase();
      const userId = p.user_id || null;
      const key = userId || name;
      if (!key) continue;
      if (!seen.has(key)) seen.set(key, { user_id: userId, name });
    }
  }
  return Array.from(seen.values());
}

/**
 * Construct the public Daily room URL. Used by the iframe src.
 * Does NOT call the API — assumes the room exists (or will be auto-
 * created by ensureDailyRoom on the same request).
 *
 * `domain` is normalized so any of these env-var forms work:
 *   - brightroots
 *   - brightroots.daily.co
 *   - https://brightroots.daily.co
 *   - https://brightroots.daily.co/
 * Daily's dashboard shows the full `brightroots.daily.co` so users
 * naturally copy the longer form. Without normalization the URL
 * would silently double-up to `brightroots.daily.co.daily.co`.
 */
function roomUrl(domain: string, roomName: string): string {
  const subdomain = domain
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/\.daily\.co\/?$/i, "")
    .replace(/\/$/, "");
  return `https://${subdomain}.daily.co/${roomName}`;
}

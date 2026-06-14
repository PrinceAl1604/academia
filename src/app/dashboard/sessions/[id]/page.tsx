"use client";

import { useState, useEffect, use, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/i18n/language-context";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Illustration } from "@/components/shared/illustration";
import {
  ArrowLeft,
  Loader2,
  Users,
  User,
  Calendar as CalendarIcon,
  Clock,
  Video,
  XCircle,
  CheckCircle2,
} from "lucide-react";

/**
 * Live session room — `/dashboard/sessions/[id]`
 *
 * Three lifecycle states gate the join button:
 *
 *   1. PRE  — current time is more than 15 min before slot start.
 *             Render a countdown card; the join button is hidden so
 *             users don't jump into a meeting that hasn't started.
 *
 *   2. LIVE — within [start - 15min, start + duration + 30min buffer].
 *             Show a "Join on Zoom" button pointing at the admin-set
 *             meeting_url, which opens Zoom (native app or browser).
 *
 *   3. PAST — past the LIVE window OR slot.status is completed/cancelled.
 *             Show a closing card with a back link.
 *
 * Authorization (orthogonal to lifecycle): user must have an active
 * (non-cancelled) booking, OR be admin. Anyone else gets bounced.
 *
 * The meeting link is pasted by the admin when creating/editing the
 * slot (Zoom, Google Meet, etc.). No video is embedded — joining
 * happens in the external client.
 */

interface SessionSlot {
  id: string;
  type: "one_on_one" | "group";
  title: string;
  description: string | null;
  starts_at: string;
  duration_minutes: number;
  max_attendees: number;
  meeting_url: string | null;
  status: "open" | "cancelled" | "completed";
  /** Set when admin first lands on the room — promotes slot to LIVE
   * for students even before the scheduled start time. NULL = host
   * hasn't opened the room yet. */
  host_started_at: string | null;
}

const PRE_SESSION_BUFFER_MS = 15 * 60 * 1000; // doors open 15 min early
const POST_SESSION_BUFFER_MS = 30 * 60 * 1000; // grace period after end

type LifecycleState = "pre" | "live" | "past" | "cancelled";

export default function SessionRoomPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { t } = useLanguage();
  const { user, isAdmin, loading: authLoading } = useAuth();
  const router = useRouter();
  const isEn = t.nav.signIn === "Sign In";

  const [slot, setSlot] = useState<SessionSlot | null>(null);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  // Tick once a second so the countdown updates and we transition
  // PRE→LIVE the moment doors open. Cheap — JS Date diff, no fetch.
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (authLoading || !user) return;

    (async () => {
      const { data: slotData } = await supabase
        .from("session_slots")
        .select("*")
        .eq("id", id)
        .single();

      if (!slotData) {
        router.replace("/dashboard/sessions");
        return;
      }
      setSlot(slotData as SessionSlot);

      // Authorization: admin OR active booking on this slot.
      // We allow active booking for cancelled slots too — the user
      // should still see "this was cancelled" rather than 404.
      if (isAdmin) {
        setAuthorized(true);
        setLoading(false);
        return;
      }

      const { data: bookingData } = await supabase
        .from("session_bookings")
        .select("id")
        .eq("slot_id", id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (bookingData) {
        setAuthorized(true);
      } else {
        router.replace("/dashboard/sessions");
        return;
      }
      setLoading(false);
    })();
  }, [authLoading, user, id, isAdmin, router]);

  // Compute the lifecycle state from the slot + the current tick.
  // useMemo with `tick` as a dep means it re-evaluates every second.
  //
  // Admin bypass: the host wants to be able to open the meeting and
  // prep before attendees arrive. The PRE gate exists to spare
  // students the "I joined too early" confusion — the host expects
  // that, so we skip the gate for them. POST is also skipped so admin
  // can keep a session going if it runs long. CANCELLED still applies.
  //
  // Host-started bypass: when admin lands on this page we POST to
  // /api/sessions/mark-started which sets host_started_at. From that
  // moment onward, students see the slot as LIVE (not PRE) — the
  // assumption being "if the host opened the room, it's open". The
  // bypass only counts within a sane window after host_started_at so
  // an old "started but never re-cancelled" slot doesn't stay live
  // forever.
  const lifecycle = useMemo<LifecycleState | null>(() => {
    if (!slot) return null;
    if (slot.status === "cancelled") return "cancelled";
    if (isAdmin) return "live";

    const startMs = new Date(slot.starts_at).getTime();
    const endMs = startMs + slot.duration_minutes * 60_000;
    const now = Date.now();

    // Host-started bypass for non-admin users.
    if (slot.host_started_at) {
      const hostStartedMs = new Date(slot.host_started_at).getTime();
      const liveWindowEnd =
        Math.max(endMs, hostStartedMs + slot.duration_minutes * 60_000) +
        POST_SESSION_BUFFER_MS;
      if (now <= liveWindowEnd) return "live";
    }

    if (now < startMs - PRE_SESSION_BUFFER_MS) return "pre";
    if (now > endMs + POST_SESSION_BUFFER_MS) return "past";
    return "live";
    // tick intentionally drives re-evaluation
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slot, tick, isAdmin]);

  // Admin auto-mark: the moment admin sees the LIVE iframe (= they're
  // intending to enter the room), POST to mark-started so booked
  // students see the slot as live too. The endpoint is idempotent —
  // first call wins, subsequent reloads no-op. fire-and-forget; we
  // don't need to block UI on the response.
  useEffect(() => {
    if (!isAdmin || !slot || lifecycle !== "live") return;
    if (slot.host_started_at) return; // already marked
    fetch("/api/sessions/mark-started", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slot_id: slot.id }),
    }).catch(() => {
      // intentionally swallowed — surfaced via server logs
    });
  }, [isAdmin, slot, lifecycle]);

  // Student Realtime subscription: while on PRE screen, listen for
  // UPDATE events on this specific slot row. When admin enters the
  // room (host_started_at flips) or admin cancels the slot, we get
  // a push event within ~1 second instead of waiting for the next
  // 20s poll. Subscription auto-cleans up when lifecycle leaves PRE.
  //
  // Filter: server-side `id=eq.<uuid>` so we only receive events for
  // THIS slot, not the entire table — saves bandwidth and avoids
  // leaking other students' slot state.
  useEffect(() => {
    if (!slot || lifecycle !== "pre" || isAdmin) return;
    const channel = supabase
      .channel(`session_slot_${slot.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "session_slots",
          filter: `id=eq.${slot.id}`,
        },
        (payload) => {
          const next = payload.new as {
            host_started_at: string | null;
            status: "open" | "cancelled" | "completed";
          };
          setSlot((prev) =>
            prev
              ? {
                  ...prev,
                  host_started_at: next.host_started_at,
                  status: next.status,
                }
              : prev
          );
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [slot, lifecycle, isAdmin]);

  if (authLoading || loading || !slot || lifecycle === null) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/70" />
      </div>
    );
  }

  if (!authorized) return null;

  const isGroup = slot.type === "group";
  const formatStart = (iso: string) =>
    new Date(iso).toLocaleString(isEn ? "en-US" : "fr-FR", {
      weekday: "long",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  // Header strip used by all three lifecycle states — keeps the page
  // identity consistent regardless of which body renders below.
  const Header = () => (
    <header className="space-y-1">
      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
        / Session
      </p>
      <h1 className="text-2xl sm:text-3xl font-medium tracking-tight text-foreground">
        {slot.title}
      </h1>
      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground font-mono">
        <span className="inline-flex items-center gap-1.5">
          {isGroup ? (
            <Users className="h-3.5 w-3.5" />
          ) : (
            <User className="h-3.5 w-3.5" />
          )}
          {isGroup ? t.sessions.typeGroup : t.sessions.typeOneOnOne}
        </span>
        <span className="inline-flex items-center gap-1.5 tabular-nums">
          <CalendarIcon className="h-3.5 w-3.5" />
          {formatStart(slot.starts_at)}
        </span>
        <span className="inline-flex items-center gap-1.5 tabular-nums">
          <Clock className="h-3.5 w-3.5" />
          {slot.duration_minutes} min
        </span>
      </div>
      {slot.description && (
        <p className="text-sm text-muted-foreground max-w-prose pt-2">
          {slot.description}
        </p>
      )}
    </header>
  );

  return (
    <div className="px-4 py-6 lg:px-8 lg:py-8 max-w-6xl mx-auto space-y-4">
      <Button
        variant="ghost"
        size="sm"
        render={<Link href="/dashboard/sessions" />}
        className="gap-1.5 -ml-2"
      >
        <ArrowLeft className="h-4 w-4" />
        {t.sessions.title}
      </Button>

      <Header />

      {/* Host-only banner — makes it obvious admin is seeing the
           unfiltered room so they don't accidentally publish a slot
           link expecting it to behave the same for students. */}
      {isAdmin && lifecycle === "live" && (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-500">
          {t.sessions.adminEarlyAccessHint}
        </div>
      )}

      {lifecycle === "pre" && (
        <PreSessionCard startsAt={slot.starts_at} tick={tick} />
      )}

      {lifecycle === "live" && (
        <LiveSessionJoin
          meetingUrl={slot.meeting_url}
          isAdmin={isAdmin}
        />
      )}

      {lifecycle === "past" && <ClosedCard variant="ended" />}

      {lifecycle === "cancelled" && <ClosedCard variant="cancelled" />}
    </div>
  );
}

/* ─── PRE state — countdown card ──────────────────────────── */
/**
 * Shown when the user arrives more than 15 min before their slot.
 * Better than showing the join button early (they'd jump into a
 * meeting that hasn't started) or 404'ing (rude). Just a countdown.
 */
function PreSessionCard({
  startsAt,
  tick,
}: {
  startsAt: string;
  tick: number;
}) {
  const { t } = useLanguage();

  // Compute time-until-doors-open. tick keeps this fresh every second
  // without an explicit dependency.
  const opensAt = new Date(startsAt).getTime() - PRE_SESSION_BUFFER_MS;
  const ms = Math.max(0, opensAt - Date.now());
  const days = Math.floor(ms / 86_400_000);
  const hours = Math.floor((ms % 86_400_000) / 3_600_000);
  const minutes = Math.floor((ms % 3_600_000) / 60_000);

  // Pick the largest unit so the badge stays compact:
  //   "2d 4h" if >24h away, "4h 13m" if hours, "13m" if minutes
  let timeStr: string;
  if (days > 0) {
    timeStr = `${days}d ${hours}h`;
  } else if (hours > 0) {
    timeStr = `${hours}h ${minutes}m`;
  } else {
    timeStr = `${minutes}m`;
  }
  // Suppress unused-var warning for tick — the closure above implicitly
  // re-runs whenever tick changes via parent useMemo.
  void tick;

  return (
    <Card className="border-dashed">
      <CardContent className="grid grid-cols-1 sm:grid-cols-[1fr_auto] items-center gap-6 p-8">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span className="font-mono text-[10px] uppercase tracking-[0.18em]">
              {t.sessions.roomOpensIn.replace("{time}", timeStr)}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-medium tracking-tight text-foreground">
            {t.sessions.roomTooEarlyTitle}
          </h2>
          <p className="text-sm text-muted-foreground max-w-prose">
            {t.sessions.roomTooEarlyBody}
          </p>
        </div>
        <div className="hidden sm:block">
          <Illustration name="email-sent" alt="" size="md" />
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── LIVE state — Join on Zoom button ────────────────────── */
/**
 * The session is live. Show a prominent "Join on Zoom" button that
 * opens the admin-set meeting_url in a new tab (Zoom native app or
 * browser). No video is embedded — the join happens in the external
 * client.
 *
 * If the admin hasn't pasted a link yet, show a calm "no link" state
 * instead of a dead button. For admins, the message nudges them to
 * add the link via the edit form.
 */
function LiveSessionJoin({
  meetingUrl,
  isAdmin,
}: {
  meetingUrl: string | null;
  isAdmin: boolean;
}) {
  const { t } = useLanguage();

  if (!meetingUrl) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
          <Video className="h-8 w-8 text-muted-foreground/60" />
          <p className="text-sm text-muted-foreground max-w-prose">
            {isAdmin
              ? t.sessions.roomNoLinkAdmin
              : t.sessions.roomNoLinkStudent}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-5 py-14 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Video className="h-7 w-7" />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-xl sm:text-2xl font-medium tracking-tight text-foreground">
            {t.sessions.roomLiveTitle}
          </h2>
          <p className="text-sm text-muted-foreground max-w-prose">
            {t.sessions.roomLiveBody}
          </p>
        </div>
        <Button
          size="lg"
          className="gap-2"
          render={
            <a href={meetingUrl} target="_blank" rel="noopener noreferrer" />
          }
        >
          <Video className="h-4 w-4" />
          {t.sessions.roomJoinButton}
        </Button>
      </CardContent>
    </Card>
  );
}

/* ─── PAST / CANCELLED state — closing card ───────────────── */
function ClosedCard({ variant }: { variant: "ended" | "cancelled" }) {
  const { t } = useLanguage();
  const isCancelled = variant === "cancelled";
  return (
    <Card className="border-dashed">
      <CardContent className="grid grid-cols-1 sm:grid-cols-[1fr_auto] items-center gap-6 p-8">
        <div className="space-y-3">
          <div
            className={`inline-flex items-center gap-2 ${
              isCancelled ? "text-destructive" : "text-muted-foreground"
            }`}
          >
            {isCancelled ? (
              <XCircle className="h-4 w-4" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            <span className="font-mono text-[10px] uppercase tracking-[0.18em]">
              {isCancelled ? t.sessions.statusCancelled : t.sessions.statusCompleted}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-medium tracking-tight text-foreground">
            {isCancelled
              ? t.sessions.roomCancelledTitle
              : t.sessions.roomEndedTitle}
          </h2>
          <p className="text-sm text-muted-foreground max-w-prose">
            {isCancelled ? t.sessions.roomCancelledBody : t.sessions.roomEndedBody}
          </p>
          <Button
            render={<Link href="/dashboard/sessions" />}
            variant="outline"
            size="sm"
            className="gap-1.5 mt-2"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {t.sessions.roomBackToList}
          </Button>
        </div>
        <div className="hidden sm:block">
          <Illustration
            name={isCancelled ? "no-results" : "onboarding-complete"}
            alt=""
            size="md"
          />
        </div>
      </CardContent>
    </Card>
  );
}

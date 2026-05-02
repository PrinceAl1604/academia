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
 * Three lifecycle states gate the iframe:
 *
 *   1. PRE  — current time is more than 15 min before slot start.
 *             Render a countdown card; iframe is hidden so users don't
 *             join an empty room and wonder if they're in the right place.
 *
 *   2. LIVE — within [start - 15min, start + duration + 30min buffer].
 *             Iframe renders — actual Jitsi meeting time.
 *
 *   3. PAST — past the LIVE window OR slot.status is completed/cancelled.
 *             Show a closing card with a back link. Iframe is hidden so
 *             we don't burn a Jitsi room load on a meeting that's done.
 *
 * Authorization (orthogonal to lifecycle): user must have an active
 * (non-cancelled) booking, OR be admin. Anyone else gets bounced.
 */

interface SessionSlot {
  id: string;
  type: "one_on_one" | "group";
  title: string;
  description: string | null;
  starts_at: string;
  duration_minutes: number;
  max_attendees: number;
  room_name: string;
  status: "open" | "cancelled" | "completed";
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
  const lifecycle = useMemo<LifecycleState | null>(() => {
    if (!slot) return null;
    if (slot.status === "cancelled") return "cancelled";
    const startMs = new Date(slot.starts_at).getTime();
    const endMs = startMs + slot.duration_minutes * 60_000;
    const now = Date.now();
    if (now < startMs - PRE_SESSION_BUFFER_MS) return "pre";
    if (now > endMs + POST_SESSION_BUFFER_MS) return "past";
    return "live";
    // tick intentionally drives re-evaluation
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slot, tick]);

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

      {lifecycle === "pre" && (
        <PreSessionCard
          startsAt={slot.starts_at}
          roomName={slot.room_name}
          tick={tick}
        />
      )}

      {lifecycle === "live" && (
        <LiveSessionFrame
          roomName={slot.room_name}
          title={slot.title}
          displayName={
            user?.user_metadata?.full_name ||
            user?.email?.split("@")[0] ||
            "Guest"
          }
          isEn={isEn}
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
 * Better than rendering an empty Jitsi room (confusing) or 404'ing
 * (rude). Includes a "test cam/mic" link that opens the same Jitsi
 * room in a new tab so the user can verify their setup.
 */
function PreSessionCard({
  startsAt,
  roomName,
  tick,
}: {
  startsAt: string;
  roomName: string;
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
          <Button
            variant="outline"
            className="gap-1.5 mt-2"
            size="sm"
            render={
              <a
                href={`https://meet.jit.si/${roomName}`}
                target="_blank"
                rel="noopener noreferrer"
              />
            }
          >
            <Video className="h-3.5 w-3.5" />
            {t.sessions.roomTestSetup}
          </Button>
        </div>
        <div className="hidden sm:block">
          <Illustration name="email-sent" alt="" size="md" />
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── LIVE state — Jitsi iframe ───────────────────────────── */
function LiveSessionFrame({
  roomName,
  title,
  displayName,
  isEn,
}: {
  roomName: string;
  title: string;
  displayName: string;
  isEn: boolean;
}) {
  // Jitsi config flags ride on the URL hash:
  //   - prejoinPageEnabled=false → boot straight into the call
  //   - userInfo.displayName → pre-fill the user's name
  const jitsiUrl = `https://meet.jit.si/${roomName}#config.prejoinPageEnabled=false&userInfo.displayName=%22${encodeURIComponent(
    displayName
  )}%22`;

  return (
    <>
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <iframe
            src={jitsiUrl}
            allow="camera; microphone; fullscreen; display-capture; autoplay; clipboard-write"
            className="block w-full"
            style={{ height: "min(70vh, 720px)", minHeight: "480px", border: 0 }}
            title={title}
          />
        </CardContent>
      </Card>
      <p className="text-xs text-muted-foreground/70 text-center">
        {isEn
          ? "Powered by Jitsi Meet — free, open-source, no account required."
          : "Propulsé par Jitsi Meet — libre, open-source, sans compte."}
      </p>
    </>
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

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Video, Calendar as CalendarIcon, Clock, Users, User } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/i18n/language-context";
import { supabase } from "@/lib/supabase";

/**
 * Next-session widget — sits on the student dashboard.
 *
 * Shows the soonest upcoming booked session (or the currently-live
 * one if the host has opened the room). Renders nothing if the user
 * has no upcoming bookings — silent absence is better than an
 * always-empty card cluttering the dashboard.
 *
 * The "live now" detection mirrors the bookings list logic: if
 * host_started_at is set and we're inside the session window, the
 * card flips to a high-emphasis primary CTA with a pulsing dot.
 */

interface NextSessionRow {
  id: string;
  slot_id: string;
  session_slots: {
    id: string;
    type: "one_on_one" | "group";
    title: string;
    starts_at: string;
    duration_minutes: number;
    host_started_at: string | null;
  };
}

export function NextSessionWidget() {
  const { user, isPro } = useAuth();
  const { t } = useLanguage();
  const isEn = t.nav.signIn === "Sign In";
  const [next, setNext] = useState<NextSessionRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !isPro) {
      setLoading(false);
      return;
    }
    (async () => {
      // Fetch the soonest upcoming non-cancelled booking. We pull
      // active bookings whose slot ends in the future + 30 min buffer
      // so a session that's still in progress also surfaces here.
      const cutoff = new Date(Date.now() - 30 * 60_000).toISOString();
      const { data } = await supabase
        .from("session_bookings")
        .select(
          "id, slot_id, session_slots!inner(id, type, title, starts_at, duration_minutes, host_started_at)"
        )
        .eq("user_id", user.id)
        .is("cancelled_at", null)
        .gte("session_slots.starts_at", cutoff)
        .order("session_slots(starts_at)", { ascending: true })
        .limit(1);

      if (data && data.length > 0) {
        setNext(data[0] as unknown as NextSessionRow);
      }
      setLoading(false);
    })();
  }, [user, isPro]);

  if (loading || !next) return null;

  const slot = next.session_slots;
  const isGroup = slot.type === "group";

  const liveNow = (() => {
    if (!slot.host_started_at) return false;
    const hostStartedMs = new Date(slot.host_started_at).getTime();
    const slotEndMs =
      new Date(slot.starts_at).getTime() + slot.duration_minutes * 60_000;
    const liveWindowEnd =
      Math.max(slotEndMs, hostStartedMs + slot.duration_minutes * 60_000) +
      60 * 60_000;
    return Date.now() <= liveWindowEnd;
  })();

  const formatStart = (iso: string) =>
    new Date(iso).toLocaleString(isEn ? "en-US" : "fr-FR", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <section className="space-y-3">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-1">
          / Next session
        </p>
        <h2 className="text-base font-medium tracking-tight text-foreground">
          {liveNow
            ? isEn
              ? "Your session is live now"
              : "Votre session est en direct"
            : isEn
            ? "Coming up next"
            : "Prochaine session"}
        </h2>
      </div>

      <Card className="overflow-hidden">
        <CardContent className="grid grid-cols-1 sm:grid-cols-[auto_1fr_auto] items-center gap-4 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-primary shrink-0">
            {isGroup ? (
              <Users className="h-5 w-5" />
            ) : (
              <User className="h-5 w-5" />
            )}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-foreground tracking-tight truncate">
                {slot.title}
              </p>
              {liveNow && (
                <span className="inline-flex items-center gap-1 rounded-full bg-destructive/15 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-destructive">
                  <span className="h-1.5 w-1.5 rounded-full bg-destructive animate-pulse" />
                  {t.sessions.liveNow}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5 font-mono text-xs text-muted-foreground tabular-nums">
              <CalendarIcon className="h-3.5 w-3.5" />
              <span>{formatStart(slot.starts_at)}</span>
              <span className="text-muted-foreground/50">·</span>
              <Clock className="h-3.5 w-3.5" />
              <span>{slot.duration_minutes}m</span>
            </div>
          </div>

          <Button
            size="sm"
            variant={liveNow ? "default" : "outline"}
            render={<Link href={`/dashboard/sessions/${slot.id}`} />}
            className="gap-1.5"
          >
            <Video className="h-3.5 w-3.5" />
            {isEn ? "Join room" : "Rejoindre"}
          </Button>
        </CardContent>
      </Card>
    </section>
  );
}

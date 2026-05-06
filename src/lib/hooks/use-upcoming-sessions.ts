"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

/**
 * useUpcomingSessions — fetches the current user's booked
 * sessions that are LIVE NOW or UPCOMING, sorted by start time.
 *
 * "Live now" mirrors NextSessionWidget's logic: host_started_at
 * is set AND we're inside (start, end + 1h grace) window.
 *
 * "Upcoming" is everything booked, not cancelled, starting in
 * the future. Capped at 5 — the sidebar isn't a calendar; users
 * who need the full list go to /dashboard/sessions.
 *
 * Returns null while loading, a structured object once resolved.
 * Pulls only the fields the sidebar renders — no description, no
 * room_name, no booking metadata. Fewer columns = smaller payload
 * + simpler RLS evaluation.
 */
export interface UpcomingSession {
  id: string;
  type: "one_on_one" | "group";
  title: string;
  starts_at: string;
  duration_minutes: number;
  host_started_at: string | null;
}

interface UseUpcomingSessionsResult {
  live: UpcomingSession[];
  upcoming: UpcomingSession[];
  loading: boolean;
}

const SIDEBAR_LIMIT = 5;

function isLiveNow(slot: UpcomingSession): boolean {
  if (!slot.host_started_at) return false;
  const hostStartedMs = new Date(slot.host_started_at).getTime();
  const slotEndMs =
    new Date(slot.starts_at).getTime() + slot.duration_minutes * 60_000;
  // Allow a 1h grace window past the scheduled end — sessions
  // routinely run over and the host's "joined" state is the
  // authoritative signal of "still happening" anyway.
  const liveWindowEnd =
    Math.max(slotEndMs, hostStartedMs + slot.duration_minutes * 60_000) +
    60 * 60_000;
  return Date.now() <= liveWindowEnd;
}

export function useUpcomingSessions(
  userId: string | undefined,
  isPro: boolean
): UseUpcomingSessionsResult {
  const [live, setLive] = useState<UpcomingSession[]>([]);
  const [upcoming, setUpcoming] = useState<UpcomingSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Sessions are a Pro feature on the student side; no sense
    // querying for free users — they'd get empty results anyway.
    if (!userId || !isPro) {
      setLive([]);
      setUpcoming([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      // Pull bookings whose slot ends in the future + 30 min buffer
      // so a session that's already started but still in the live
      // window surfaces in the LIVE NOW section.
      const cutoff = new Date(Date.now() - 30 * 60_000).toISOString();
      const { data } = await supabase
        .from("session_bookings")
        .select(
          "session_slots!inner(id, type, title, starts_at, duration_minutes, host_started_at)"
        )
        .eq("user_id", userId)
        .is("cancelled_at", null)
        .gte("session_slots.starts_at", cutoff)
        .order("session_slots(starts_at)", { ascending: true })
        .limit(SIDEBAR_LIMIT);
      if (cancelled) return;

      // PostgREST types nested FK joins as arrays even for the
      // !inner one-row case — cast through unknown to read the
      // single object shape.
      const rows = (data ?? []).map(
        (r) =>
          (r as unknown as { session_slots: UpcomingSession }).session_slots
      );
      const liveRows = rows.filter(isLiveNow);
      const upcomingRows = rows.filter((s) => !isLiveNow(s));
      setLive(liveRows);
      setUpcoming(upcomingRows);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, isPro]);

  return { live, upcoming, loading };
}

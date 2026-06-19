"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/i18n/language-context";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Loader2,
  Calendar as CalendarIcon,
  Video,
  MapPin,
  Globe,
  Lock,
  Crown,
} from "lucide-react";

/**
 * Event space (Phase 3).
 *
 * Surfaces the community's live sessions that are attached to THIS event
 * space (`session_slots.space_id`), with covers + location, and lets a Pro
 * member RSVP inline. Events stay a Pro benefit — the same DB trigger
 * (Pro + capacity + 2/month cap) enforces every booking, so free members
 * see the Pro gate (mirrors `/dashboard/sessions`). Cancel/feedback live in
 * that hub; this space focuses on discover → book → join.
 */

interface EventSlot {
  id: string;
  type: "one_on_one" | "group";
  title: string;
  description: string | null;
  starts_at: string;
  duration_minutes: number;
  max_attendees: number;
  status: "open" | "cancelled" | "completed";
  host_started_at: string | null;
  cover_url: string | null;
  location_type: "online" | "in_person";
}

interface ActiveBooking {
  id: string;
  slot_id: string;
  session_slots: { starts_at: string } | null;
}

const MONTHLY_CAP = 2;

export function EventSpace({
  spaceId,
  name,
  emoji,
}: {
  spaceId: string;
  name: string;
  emoji: string | null;
}) {
  const { t } = useLanguage();
  const { user, isPro, isAdmin, isAuthenticated, loading: authLoading } = useAuth();
  const isEn = t.nav.signIn === "Sign In";

  const [events, setEvents] = useState<EventSlot[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [bookings, setBookings] = useState<ActiveBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bookTarget, setBookTarget] = useState<EventSlot | null>(null);
  const [bookNote, setBookNote] = useState("");
  const [bookingId, setBookingId] = useState<string | null>(null);
  const inFlight = useRef(false);

  const loadData = useCallback(async () => {
    if (!user) return;
    const nowIso = new Date().toISOString();
    const [slotsRes, bookingsRes] = await Promise.all([
      supabase
        .from("session_slots")
        .select(
          "id,type,title,description,starts_at,duration_minutes,max_attendees,status,host_started_at,cover_url,location_type,bookings:session_bookings(cancelled_at)"
        )
        .eq("space_id", spaceId)
        .eq("status", "open")
        .gte("starts_at", nowIso)
        .order("starts_at", { ascending: true }),
      supabase
        .from("session_bookings")
        .select("id,slot_id,session_slots(starts_at)")
        .eq("user_id", user.id)
        .is("cancelled_at", null),
    ]);

    const rows = (slotsRes.data ?? []) as Array<
      EventSlot & { bookings?: Array<{ cancelled_at: string | null }> }
    >;
    const c: Record<string, number> = {};
    for (const r of rows) {
      c[r.id] = (r.bookings ?? []).filter((b) => b.cancelled_at === null).length;
    }
    setEvents(rows as EventSlot[]);
    setCounts(c);
    setBookings((bookingsRes.data ?? []) as unknown as ActiveBooking[]);
    setLoading(false);
  }, [user, spaceId]);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    loadData();
  }, [authLoading, isAuthenticated, loadData]);

  // Cap usage = active bookings whose slot starts this calendar month
  // (global, not per-space — mirrors the DB rule + the hub).
  const monthlyCount = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return bookings.filter((b) => {
      if (!b.session_slots) return false;
      const s = new Date(b.session_slots.starts_at);
      return s >= monthStart && s < monthEnd;
    }).length;
  }, [bookings]);

  const myBookingBySlot = useMemo(() => {
    const m: Record<string, string> = {};
    bookings.forEach((b) => {
      m[b.slot_id] = b.id;
    });
    return m;
  }, [bookings]);

  // Trigger raises stable English messages — match prefixes to i18n.
  const translateError = (msg?: string | null): string => {
    if (!msg) return t.sessions.errorGeneric;
    if (msg.includes("Pro benefit")) return t.sessions.errorPro;
    if (msg.includes("Monthly session cap")) return t.sessions.errorCap;
    if (msg.includes("session is full")) return t.sessions.errorFull;
    return msg;
  };

  const handleBook = async (slot: EventSlot, note: string) => {
    if (!user || inFlight.current) return;
    inFlight.current = true;
    setError(null);
    setBookingId(slot.id);
    try {
      const { data: inserted, error: dbErr } = await supabase
        .from("session_bookings")
        .insert({ slot_id: slot.id, user_id: user.id, notes: note.trim() || null })
        .select("id")
        .single();
      if (dbErr || !inserted) {
        setError(translateError(dbErr?.message));
        setBookingId(null);
        return;
      }
      // Fire-and-forget confirmation email (+ in-app notification).
      fetch("/api/sessions/notify-booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ booking_id: inserted.id }),
      }).catch(() => {});
      await loadData();
      setBookingId(null);
      setBookTarget(null);
      setBookNote("");
    } finally {
      inFlight.current = false;
    }
  };

  const formatStart = (iso: string) =>
    new Date(iso).toLocaleString(isEn ? "en-US" : "fr-FR", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const Title = () => (
    <div className="flex items-center gap-3">
      <span className="text-3xl leading-none">{emoji ?? "📅"}</span>
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">{name}</h1>
    </div>
  );

  if (authLoading || loading) {
    return (
      <main className="mx-auto max-w-3xl px-5 py-10">
        <div className="mb-8">
          <Title />
        </div>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/70" />
        </div>
      </main>
    );
  }

  // Events are a Pro benefit — same gate as /dashboard/sessions.
  if (!isPro && !isAdmin) {
    return (
      <main className="mx-auto max-w-3xl px-5 py-10">
        <div className="mb-8">
          <Title />
        </div>
        <Card className="overflow-hidden">
          <CardContent className="grid grid-cols-1 items-center gap-6 p-8 sm:grid-cols-[1fr_auto]">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-amber-500">
                <Crown className="h-4 w-4" />
                <span className="font-mono text-[10px] uppercase tracking-[0.18em]">Pro</span>
              </div>
              <h2 className="text-xl font-medium tracking-tight text-foreground sm:text-2xl">
                {t.sessions.proGateTitle}
              </h2>
              <p className="max-w-prose text-sm text-muted-foreground">{t.sessions.proGateBody}</p>
              <Button render={<Link href="/dashboard/subscription" />} className="mt-2 gap-1.5">
                <Crown className="h-4 w-4" />
                {t.sessions.proGateCta}
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    );
  }

  const capReached = monthlyCount >= MONTHLY_CAP;

  return (
    <main className="mx-auto max-w-3xl px-5 py-10">
      <div className="mb-8 flex items-end justify-between gap-4">
        <Title />
        <Button
          variant="ghost"
          size="sm"
          render={<Link href="/dashboard/sessions" />}
          className="shrink-0 text-muted-foreground"
        >
          {isEn ? "My bookings →" : "Mes réservations →"}
        </Button>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {events.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
          <CalendarIcon className="mx-auto h-8 w-8 text-muted-foreground/50" />
          <p className="mx-auto mt-3 max-w-sm text-sm text-muted-foreground">
            {isEn
              ? "No upcoming events here yet."
              : "Aucun événement à venir pour l'instant."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {events.map((ev) => {
            const taken = counts[ev.id] ?? 0;
            const full = taken >= ev.max_attendees;
            const booked = !!myBookingBySlot[ev.id];
            const inPerson = ev.location_type === "in_person";
            return (
              <Card key={ev.id} className="flex flex-col overflow-hidden">
                {ev.cover_url && (
                  // Covers are admin-pasted URLs (any host) → plain img avoids
                  // next/image remotePatterns limits.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={ev.cover_url} alt="" className="aspect-video w-full object-cover" />
                )}
                <CardContent className="flex flex-1 flex-col gap-3 p-5">
                  <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      {inPerson ? <MapPin className="h-3.5 w-3.5" /> : <Globe className="h-3.5 w-3.5" />}
                      {inPerson ? (isEn ? "In person" : "En personne") : isEn ? "Online" : "En ligne"}
                    </span>
                    <span className="tabular-nums">
                      {taken}/{ev.max_attendees}
                    </span>
                  </div>

                  <h3 className="text-base font-medium leading-tight tracking-tight text-foreground">
                    {ev.title}
                  </h3>

                  {ev.description && (
                    <p className="line-clamp-2 text-sm text-muted-foreground">{ev.description}</p>
                  )}

                  <div className="flex items-center gap-1.5 font-mono text-xs tabular-nums text-muted-foreground">
                    <CalendarIcon className="h-3.5 w-3.5" />
                    <span>{formatStart(ev.starts_at)}</span>
                    <span className="text-muted-foreground/50">· {ev.duration_minutes}m</span>
                  </div>

                  <div className="mt-auto pt-2">
                    {isAdmin ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full"
                        render={<Link href="/admin/sessions" />}
                      >
                        {isEn ? "Manage" : "Gérer"}
                      </Button>
                    ) : booked ? (
                      <Button
                        size="sm"
                        className="w-full gap-1.5"
                        render={<Link href={`/dashboard/sessions/${ev.id}`} />}
                      >
                        <Video className="h-3.5 w-3.5" />
                        {isEn ? "Join room" : "Rejoindre"}
                      </Button>
                    ) : full ? (
                      <Button size="sm" disabled variant="outline" className="w-full">
                        <Lock className="mr-1.5 h-3.5 w-3.5" />
                        {t.sessions.slotFull}
                      </Button>
                    ) : capReached ? (
                      <Button size="sm" disabled variant="outline" className="w-full">
                        <Lock className="mr-1.5 h-3.5 w-3.5" />
                        {t.sessions.capReached}
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        className="w-full"
                        disabled={bookingId === ev.id}
                        onClick={() => {
                          setBookTarget(ev);
                          setBookNote("");
                        }}
                      >
                        {bookingId === ev.id ? (
                          <>
                            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                            {t.sessions.booking}
                          </>
                        ) : (
                          t.sessions.bookCta
                        )}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Book-with-notes dialog (same flow as the sessions hub) */}
      <Dialog
        open={!!bookTarget}
        onOpenChange={(o) => {
          if (!o) {
            setBookTarget(null);
            setBookNote("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t.sessions.bookConfirmTitle}</DialogTitle>
            {bookTarget && (
              <DialogDescription>
                {bookTarget.title} · {formatStart(bookTarget.starts_at)}
              </DialogDescription>
            )}
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="ev-note">{t.sessions.bookNotesLabel}</Label>
            <Textarea
              id="ev-note"
              value={bookNote}
              onChange={(e) => setBookNote(e.target.value.slice(0, 500))}
              placeholder={t.sessions.bookNotesPlaceholder}
              rows={4}
            />
            <p className="text-right text-xs tabular-nums text-muted-foreground/70">
              {bookNote.length}/500
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setBookTarget(null);
                setBookNote("");
              }}
              disabled={!!bookingId}
            >
              {t.sessions.cancelConfirmNo}
            </Button>
            <Button
              onClick={() => bookTarget && handleBook(bookTarget, bookNote)}
              disabled={!!bookingId}
            >
              {bookingId ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  {t.sessions.booking}
                </>
              ) : (
                t.sessions.bookConfirmYes
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}

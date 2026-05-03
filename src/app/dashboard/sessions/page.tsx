"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/i18n/language-context";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Illustration } from "@/components/shared/illustration";
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
  Users,
  User,
  Calendar as CalendarIcon,
  Lock,
  Crown,
  Video,
} from "lucide-react";

/**
 * Student Sessions page — `/dashboard/sessions`
 *
 * Phase 2 of the Live Sessions feature. Pro members see open upcoming
 * slots and can book up to 2/month. Free users see a locked teaser
 * card linking to the subscription page (conversion hook — they see
 * what they're missing rather than getting redirected).
 *
 * The DB trigger does the heavy validation lifting (cap check,
 * capacity check, plan check) so the client just needs to surface
 * friendly errors and update local state optimistically.
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
  /** Set when the host first opened the room. Drives the LIVE NOW
   * badge on booking cards so students can spot active sessions. */
  host_started_at: string | null;
}

interface SessionBooking {
  id: string;
  slot_id: string;
  booked_at: string;
  cancelled_at: string | null;
  session_slots: SessionSlot;
}

const MONTHLY_CAP = 2;

/**
 * 🧠 LEARNING MOMENT — canCancelBooking
 *
 * Once a user has booked, when can they undo it?
 *
 *   - Up to N hours before the slot starts? Industry default is 24h
 *     (gives the host time to fill the slot or close it).
 *   - Always? (Most generous, least friction. Risk: last-minute
 *     cancels game the cap — book Mon, cancel Sat night, re-book
 *     next week with cap freed.)
 *   - Never? (Hostile to legit conflicts. Don't pick this.)
 *
 * The cap counter currently treats every active booking as "used"
 * toward the 2/month limit, INCLUDING bookings already in the past.
 * That's a separate decision: should past sessions still count
 * against this month's cap? (Most platforms say yes — you used the
 * slot.)
 *
 * Return true if cancellation is allowed for this booking.
 *
 * Worth ~5-10 lines once you decide the policy.
 */
function canCancelBooking(slot: SessionSlot): boolean {
  // 24-hour notice policy — industry standard for office hours and
  // 1:1 booking products (Calendly, Cal.com default to this). Two
  // benefits:
  //   1. Gives the host time to fill the slot via someone else
  //   2. Prevents cap-gaming: book → wait until session day → cancel
  //      to free the cap → re-book another slot for "free"
  // Bookings whose slot is already cancelled (handled at Card-render
  // time as not "cancellable" since the cancel button hides) and
  // already-past bookings (same guard) don't reach this function.
  const HOURS_NOTICE = 24;
  const noticeWindowEndsMs = Date.now() + HOURS_NOTICE * 60 * 60 * 1000;
  return new Date(slot.starts_at).getTime() > noticeWindowEndsMs;
}

export default function StudentSessionsPage() {
  const { t } = useLanguage();
  const { user, isPro, isAuthenticated, loading: authLoading } = useAuth();
  const isEn = t.nav.signIn === "Sign In";

  const [slots, setSlots] = useState<SessionSlot[]>([]);
  const [bookings, setBookings] = useState<SessionBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Cancel-confirmation dialog: holds the booking we're about to
  // cancel. null = closed; setting a value opens the dialog.
  const [cancelTarget, setCancelTarget] = useState<SessionBooking | null>(null);
  // Book-with-notes dialog: holds the slot the user is about to
  // book. Opens a textarea so they can tell the host what they want
  // to discuss (optional).
  const [bookTarget, setBookTarget] = useState<SessionSlot | null>(null);
  const [bookNote, setBookNote] = useState("");

  // Load open upcoming slots + the user's own bookings in parallel.
  const loadData = useCallback(async () => {
    if (!user) return;
    const nowIso = new Date().toISOString();
    const [slotsRes, bookingsRes] = await Promise.all([
      supabase
        .from("session_slots")
        .select("*")
        .eq("status", "open")
        .gte("starts_at", nowIso)
        .order("starts_at", { ascending: true }),
      supabase
        .from("session_bookings")
        .select(
          "id, slot_id, booked_at, cancelled_at, session_slots(*)"
        )
        .eq("user_id", user.id)
        .is("cancelled_at", null)
        .order("booked_at", { ascending: false }),
    ]);
    setSlots((slotsRes.data ?? []) as SessionSlot[]);
    setBookings((bookingsRes.data ?? []) as unknown as SessionBooking[]);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) return;
    loadData();
  }, [authLoading, isAuthenticated, loadData]);

  // Fetch attendance counts for ALL slots — used to mark slots full.
  // Done once after slots load; cheap because we already have the IDs.
  const [attendanceCounts, setAttendanceCounts] = useState<
    Record<string, number>
  >({});
  useEffect(() => {
    if (slots.length === 0) return;
    (async () => {
      const ids = slots.map((s) => s.id);
      const { data } = await supabase
        .from("session_bookings")
        .select("slot_id")
        .is("cancelled_at", null)
        .in("slot_id", ids);
      const counts: Record<string, number> = {};
      (data ?? []).forEach((b: { slot_id: string }) => {
        counts[b.slot_id] = (counts[b.slot_id] || 0) + 1;
      });
      setAttendanceCounts(counts);
    })();
  }, [slots]);

  // Compute monthly cap usage from active bookings whose slot starts
  // in the current calendar month. Mirrors the SQL function in the DB.
  const monthlyCount = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return bookings.filter((b) => {
      const startsAt = new Date(b.session_slots.starts_at);
      return startsAt >= monthStart && startsAt < monthEnd;
    }).length;
  }, [bookings]);

  // Map slot id -> user's active booking id (if booked)
  const myBookingBySlot = useMemo(() => {
    const map: Record<string, string> = {};
    bookings.forEach((b) => {
      map[b.slot_id] = b.id;
    });
    return map;
  }, [bookings]);

  // Translate DB-trigger errors into i18n strings. Trigger raises
  // exceptions with literal English messages — we match prefixes since
  // the messages are short and stable.
  const translateError = (msg: string | undefined | null): string => {
    if (!msg) return t.sessions.errorGeneric;
    if (msg.includes("Pro benefit")) return t.sessions.errorPro;
    if (msg.includes("Monthly session cap")) return t.sessions.errorCap;
    if (msg.includes("session is full")) return t.sessions.errorFull;
    return msg;
  };

  const handleBook = async (slot: SessionSlot, note: string) => {
    if (!user) return;
    setError(null);
    setBookingId(slot.id);
    const trimmedNote = note.trim();
    const { data: inserted, error: dbError } = await supabase
      .from("session_bookings")
      .insert({
        slot_id: slot.id,
        user_id: user.id,
        notes: trimmedNote || null,
      })
      .select("id")
      .single();
    if (dbError || !inserted) {
      setError(translateError(dbError?.message));
      setBookingId(null);
      return;
    }

    // Fire-and-forget the confirmation email. We don't block the UI
    // refresh on Resend latency — the booking exists in the DB the
    // moment the insert resolves, so the user already has access. If
    // email delivery fails the booking is still valid; it'll just
    // mean the user gets the day-before reminder without an
    // immediate confirmation.
    fetch("/api/sessions/notify-booking", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ booking_id: inserted.id }),
    }).catch(() => {
      // intentionally swallowed — surfaced via server logs
    });

    // Refresh both lists so capacity + cap counter sync up.
    await loadData();
    setBookingId(null);
    setBookTarget(null);
    setBookNote("");
  };

  const handleCancel = async (booking: SessionBooking) => {
    setError(null);
    setCancellingId(booking.id);
    const { error: dbError } = await supabase
      .from("session_bookings")
      .update({ cancelled_at: new Date().toISOString() })
      .eq("id", booking.id);
    if (dbError) {
      setError(t.sessions.errorGeneric);
      setCancellingId(null);
      return;
    }
    await loadData();
    setCancellingId(null);
    setCancelTarget(null);
  };

  const formatStart = (iso: string) =>
    new Date(iso).toLocaleString(isEn ? "en-US" : "fr-FR", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/70" />
      </div>
    );
  }

  // ── Free-user gate ─────────────────────────────────────────
  if (!isPro) {
    return (
      <div className="px-4 py-8 lg:px-8 lg:py-12 max-w-4xl mx-auto space-y-8">
        <header className="space-y-2">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            / Sessions
          </p>
          <h1 className="text-3xl sm:text-4xl font-medium tracking-tight text-foreground">
            {t.sessions.title}
          </h1>
          <p className="text-muted-foreground text-base max-w-prose">
            {t.sessions.subtitle}
          </p>
        </header>

        <Card className="overflow-hidden">
          <CardContent className="grid grid-cols-1 sm:grid-cols-[1fr_auto] items-center gap-6 p-8">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-amber-500">
                <Crown className="h-4 w-4" />
                <span className="font-mono text-[10px] uppercase tracking-[0.18em]">
                  Pro
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-medium tracking-tight text-foreground">
                {t.sessions.proGateTitle}
              </h2>
              <p className="text-sm text-muted-foreground max-w-prose">
                {t.sessions.proGateBody}
              </p>
              <Button
                render={<Link href="/dashboard/subscription" />}
                className="gap-1.5 mt-2"
              >
                <Crown className="h-4 w-4" />
                {t.sessions.proGateCta}
              </Button>
            </div>
            <div className="hidden sm:block">
              <Illustration name="subscription" alt="" size="md" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Pro user view ──────────────────────────────────────────
  const capReached = monthlyCount >= MONTHLY_CAP;
  const capLabel = t.sessions.capUsed
    .replace("{used}", String(monthlyCount))
    .replace("{max}", String(MONTHLY_CAP));

  return (
    <div className="px-4 py-8 lg:px-8 lg:py-12 max-w-4xl mx-auto space-y-10">
      {/* ── Hero ────────────────────────────────────────────── */}
      <header className="space-y-2">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          / Sessions
        </p>
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <h1 className="text-3xl sm:text-4xl font-medium tracking-tight text-foreground">
            {t.sessions.title}
          </h1>
          {/* Cap counter pill — at-a-glance "how many do I have left" */}
          <div
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-[11px] tabular-nums ${
              capReached
                ? "border-destructive/40 bg-destructive/10 text-destructive"
                : "border-border/60 bg-card text-muted-foreground"
            }`}
          >
            {capReached ? t.sessions.capReached : capLabel}
          </div>
        </div>
        <p className="text-muted-foreground text-base max-w-prose">
          {t.sessions.subtitle}
        </p>
      </header>

      {/* Error banner */}
      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* ── Your upcoming sessions ─────────────────────────── */}
      {bookings.length > 0 && (
        <section className="space-y-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-1">
              / Booked
            </p>
            <h2 className="text-base font-medium tracking-tight text-foreground">
              {t.sessions.yourBookings}
            </h2>
          </div>

          <div className="space-y-2">
            {bookings.map((b) => {
              const slot = b.session_slots;
              const isGroup = slot.type === "group";
              const cancellable = canCancelBooking(slot);
              // "Live now" applies when the host has flipped
              // host_started_at AND we're still within the session
              // window (start of host_started_at through end of slot
              // + 1h buffer). After that the slot is past — no point
              // teasing a finished session with a LIVE badge.
              const liveNow = (() => {
                if (!slot.host_started_at) return false;
                const hostStartedMs = new Date(slot.host_started_at).getTime();
                const slotEndMs =
                  new Date(slot.starts_at).getTime() +
                  slot.duration_minutes * 60_000;
                const liveWindowEnd =
                  Math.max(slotEndMs, hostStartedMs + slot.duration_minutes * 60_000) +
                  60 * 60_000; // 1h grace
                return Date.now() <= liveWindowEnd;
              })();
              return (
                <Card key={b.id} className="overflow-hidden">
                  <CardContent className="grid grid-cols-1 sm:grid-cols-[auto_1fr_auto] items-center gap-4 p-4">
                    {/* Type icon block */}
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-primary shrink-0">
                      {isGroup ? (
                        <Users className="h-5 w-5" />
                      ) : (
                        <User className="h-5 w-5" />
                      )}
                    </div>

                    {/* Title + meta */}
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
                        <span className="text-muted-foreground/50">
                          · {slot.duration_minutes}m
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant={liveNow ? "default" : "outline"}
                        render={
                          <Link
                            href={`/dashboard/sessions/${slot.id}`}
                          />
                        }
                        className="gap-1.5"
                      >
                        <Video className="h-3.5 w-3.5" />
                        {isEn ? "Join room" : "Rejoindre"}
                      </Button>
                      {cancellable && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setCancelTarget(b)}
                          disabled={cancellingId === b.id}
                          className="text-muted-foreground"
                        >
                          {cancellingId === b.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            t.sessions.cancelBooking
                          )}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Available slots ─────────────────────────────────── */}
      <section className="space-y-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-1">
            / Available
          </p>
          <h2 className="text-base font-medium tracking-tight text-foreground">
            {t.sessions.availableSlots}
          </h2>
        </div>

        {slots.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center text-center py-12">
              <Illustration name="chat-empty" alt="" size="md" />
              <p className="mt-4 text-sm text-muted-foreground">
                {t.sessions.noAvailableSlots}
              </p>
            </CardContent>
          </Card>
        ) : (
          // grid items-stretch (default) + h-full on card + flex column on
          // CardContent + mt-auto on the action = every card the same
          // height, every CTA aligned to the same baseline. Optional
          // description no longer collapses the layout.
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-stretch">
            {slots.map((slot) => {
              const isGroup = slot.type === "group";
              const taken = attendanceCounts[slot.id] ?? 0;
              const full = taken >= slot.max_attendees;
              const alreadyBooked = !!myBookingBySlot[slot.id];
              const blocked = !alreadyBooked && (capReached || full);

              return (
                <Card
                  key={slot.id}
                  className={`flex flex-col h-full ${blocked ? "opacity-70" : ""}`}
                >
                  <CardContent className="p-5 flex flex-col flex-1 gap-3">
                    {/* Type + capacity — true label metadata: mono uppercase
                         tight-tracking, matches the rest of the design
                         language. De-emphasized so it doesn't compete with
                         the title. */}
                    <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        {isGroup ? (
                          <Users className="h-3.5 w-3.5" />
                        ) : (
                          <User className="h-3.5 w-3.5" />
                        )}
                        {isGroup ? t.sessions.typeGroup : t.sessions.typeOneOnOne}
                      </span>
                      <span className="tabular-nums">
                        {taken}/{slot.max_attendees}
                      </span>
                    </div>

                    {/* Title — primary content, leading-tight to keep the
                         block compact when wrapping to two lines. */}
                    <h3 className="text-base font-medium tracking-tight text-foreground leading-tight">
                      {slot.title}
                    </h3>

                    {/* Description — ALWAYS rendered with min-h so a slot
                         without one doesn't collapse the layout. line-clamp
                         keeps long descriptions from breaking the grid. */}
                    <p className="text-sm text-muted-foreground line-clamp-2 min-h-[2.5rem]">
                      {slot.description ?? ""}
                    </p>

                    {/* When — matches the metadata language used elsewhere
                         (mono tabular for time, muted) */}
                    <div className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground tabular-nums">
                      <CalendarIcon className="h-3.5 w-3.5" />
                      <span>{formatStart(slot.starts_at)}</span>
                      <span className="text-muted-foreground/50">
                        · {slot.duration_minutes}m
                      </span>
                    </div>

                    {/* Action — mt-auto pushes it to the bottom of the
                         card so every CTA aligns across the row regardless
                         of how much content sits above. */}
                    <div className="pt-2 mt-auto">
                      {alreadyBooked ? (
                        <Badge className="bg-primary/15 text-primary">
                          {t.sessions.bookedCta}
                        </Badge>
                      ) : full ? (
                        <Button size="sm" disabled variant="outline" className="w-full">
                          <Lock className="h-3.5 w-3.5 mr-1.5" />
                          {t.sessions.slotFull}
                        </Button>
                      ) : capReached ? (
                        <Button size="sm" disabled variant="outline" className="w-full">
                          <Lock className="h-3.5 w-3.5 mr-1.5" />
                          {t.sessions.capReached}
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => {
                            setBookTarget(slot);
                            setBookNote("");
                          }}
                          disabled={bookingId === slot.id}
                          className="w-full"
                        >
                          {bookingId === slot.id ? (
                            <>
                              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
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
      </section>

      {/* ── Book-with-notes dialog ──────────────────────────────
           Optional notes give the host context before walking into
           1:1 office hours. Capped at 500 chars (DB enforces too). */}
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
            <Label htmlFor="book-note">{t.sessions.bookNotesLabel}</Label>
            <Textarea
              id="book-note"
              value={bookNote}
              onChange={(e) => setBookNote(e.target.value.slice(0, 500))}
              placeholder={t.sessions.bookNotesPlaceholder}
              rows={4}
            />
            <p className="text-xs text-muted-foreground/70 text-right tabular-nums">
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
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  {t.sessions.booking}
                </>
              ) : (
                t.sessions.bookConfirmYes
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Cancel-confirmation dialog ──────────────────────────
           Single dialog instance reused for any booking the user
           clicks "cancel" on. open === !!cancelTarget so closing
           also clears the target — no stale state. */}
      <Dialog open={!!cancelTarget} onOpenChange={(o) => !o && setCancelTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t.sessions.cancelConfirmTitle}</DialogTitle>
            <DialogDescription>
              {t.sessions.cancelConfirmBody}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setCancelTarget(null)}
              disabled={!!cancellingId}
            >
              {t.sessions.cancelConfirmNo}
            </Button>
            <Button
              variant="destructive"
              onClick={() => cancelTarget && handleCancel(cancelTarget)}
              disabled={!!cancellingId}
            >
              {cancellingId ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  {t.sessions.cancelling}
                </>
              ) : (
                t.sessions.cancelConfirmYes
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

"use client";

import { useEffect, useState, use, useCallback } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/lib/i18n/language-context";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  ArrowLeft,
  Loader2,
  Users,
  User,
  Calendar as CalendarIcon,
  Clock,
  Video,
  Mail,
  Pencil,
  Star,
} from "lucide-react";

/**
 * Admin slot-detail page — `/admin/sessions/[id]`
 *
 * Shows a single slot + the list of attendees with their booking
 * notes. Crucial for office hours: admin walks into a 1:1 already
 * knowing what the student wants to discuss, instead of starting
 * cold with "so... what brings you here?"
 *
 * Linked from the title in the admin sessions list.
 */

interface SessionSlot {
  id: string;
  type: "one_on_one" | "group";
  title: string;
  description: string | null;
  starts_at: string;
  duration_minutes: number;
  max_attendees: number;
  status: "open" | "cancelled" | "completed";
  host_started_at: string | null;
}

interface BookingWithUser {
  id: string;
  booked_at: string;
  notes: string | null;
  cancelled_at: string | null;
  feedback_rating: number | null;
  feedback_comment: string | null;
  feedback_submitted_at: string | null;
  user: {
    id: string;
    name: string | null;
    email: string;
  };
}

export default function AdminSlotDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { t } = useLanguage();
  const isEn = t.nav.signIn === "Sign In";

  const [slot, setSlot] = useState<SessionSlot | null>(null);
  const [bookings, setBookings] = useState<BookingWithUser[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [slotRes, bookingsRes] = await Promise.all([
      supabase.from("session_slots").select("*").eq("id", id).single(),
      supabase
        .from("session_bookings")
        .select(
          "id, booked_at, notes, cancelled_at, feedback_rating, feedback_comment, feedback_submitted_at, user:users(id, name, email)"
        )
        .eq("slot_id", id)
        .order("booked_at", { ascending: true }),
    ]);
    if (slotRes.data) setSlot(slotRes.data as SessionSlot);
    if (bookingsRes.data)
      setBookings(bookingsRes.data as unknown as BookingWithUser[]);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/70" />
      </div>
    );
  }

  if (!slot) {
    return (
      <div className="px-4 py-8 lg:px-8 lg:py-12 max-w-4xl mx-auto">
        <Button
          variant="ghost"
          size="sm"
          render={<Link href="/admin/sessions" />}
          className="gap-1.5 -ml-2"
        >
          <ArrowLeft className="h-4 w-4" />
          {t.sessions.adminTitle}
        </Button>
        <p className="text-muted-foreground mt-8">Slot not found.</p>
      </div>
    );
  }

  const isGroup = slot.type === "group";
  const activeBookings = bookings.filter((b) => !b.cancelled_at);
  const cancelledBookings = bookings.filter((b) => b.cancelled_at);

  const formatStart = (iso: string) =>
    new Date(iso).toLocaleString(isEn ? "en-US" : "fr-FR", {
      weekday: "long",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const initials = (name: string | null, email: string) => {
    const n = name?.trim() || email;
    return n
      .split(/\s+/)
      .map((part) => part[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  return (
    <div className="px-4 py-8 lg:px-8 lg:py-12 max-w-4xl mx-auto space-y-8">
      <Button
        variant="ghost"
        size="sm"
        render={<Link href="/admin/sessions" />}
        className="gap-1.5 -ml-2"
      >
        <ArrowLeft className="h-4 w-4" />
        {t.sessions.adminTitle}
      </Button>

      {/* Hero */}
      <header className="space-y-2">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          / Sessions / Detail
        </p>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl sm:text-4xl font-medium tracking-tight text-foreground">
              {slot.title}
            </h1>
            <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground font-mono">
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
              <span className="tabular-nums">
                {activeBookings.length}/{slot.max_attendees}
              </span>
            </div>
          </div>
          {slot.status === "open" && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                render={<Link href={`/admin/sessions/${slot.id}/edit`} />}
                className="gap-1.5"
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit
              </Button>
              <Button
                render={<Link href={`/dashboard/sessions/${slot.id}`} />}
                className="gap-1.5"
              >
                <Video className="h-4 w-4" />
                {t.sessions.adminJoinRoom}
              </Button>
            </div>
          )}
        </div>
        {slot.description && (
          <p className="text-sm text-muted-foreground max-w-prose pt-2">
            {slot.description}
          </p>
        )}
      </header>

      {/* Active attendees */}
      <section className="space-y-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-1">
            / Attendees
          </p>
          <h2 className="text-base font-medium tracking-tight text-foreground">
            {activeBookings.length === 0
              ? isEn
                ? "No one's booked yet"
                : "Personne n'a encore réservé"
              : isEn
              ? `${activeBookings.length} attending`
              : `${activeBookings.length} participant${activeBookings.length > 1 ? "s" : ""}`}
          </h2>
        </div>

        {activeBookings.length > 0 && (
          <div className="space-y-2">
            {activeBookings.map((b) => (
              <Card key={b.id}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="text-xs">
                        {initials(b.user.name, b.user.email)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">
                        {b.user.name || b.user.email.split("@")[0]}
                      </p>
                      <p className="font-mono text-[10px] text-muted-foreground/70 truncate">
                        {b.user.email}
                      </p>
                    </div>
                    <a
                      href={`mailto:${b.user.email}`}
                      className="text-muted-foreground hover:text-foreground"
                      title={isEn ? "Email" : "E-mail"}
                    >
                      <Mail className="h-4 w-4" />
                    </a>
                  </div>

                  {b.notes && (
                    <div className="pl-12">
                      <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground mb-1">
                        / {t.sessions.adminBookingNotes}
                      </p>
                      <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
                        {b.notes}
                      </p>
                    </div>
                  )}

                  {/* Post-session feedback (only after user submits).
                       Shows rating + optional comment. */}
                  {b.feedback_rating !== null && (
                    <div className="pl-12">
                      <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground mb-1.5">
                        / {t.sessions.adminFeedback}
                      </p>
                      <div className="flex items-center gap-1.5 mb-2">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <Star
                            key={n}
                            className={`h-4 w-4 ${
                              n <= (b.feedback_rating ?? 0)
                                ? "fill-amber-400 text-amber-400"
                                : "text-muted-foreground/30"
                            }`}
                          />
                        ))}
                        <span className="ml-1 font-mono text-xs text-muted-foreground tabular-nums">
                          {b.feedback_rating}/5
                        </span>
                      </div>
                      {b.feedback_comment && (
                        <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed italic">
                          &ldquo;{b.feedback_comment}&rdquo;
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Cancelled — collapsed at bottom for admin audit */}
      {cancelledBookings.length > 0 && (
        <section className="space-y-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            / Cancelled
          </p>
          <div className="space-y-1">
            {cancelledBookings.map((b) => (
              <div
                key={b.id}
                className="flex items-center gap-3 px-3 py-2 text-xs text-muted-foreground"
              >
                <span className="truncate flex-1">
                  {b.user.name || b.user.email.split("@")[0]}
                </span>
                <Badge className="bg-muted text-muted-foreground">
                  {t.sessions.statusCancelled}
                </Badge>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

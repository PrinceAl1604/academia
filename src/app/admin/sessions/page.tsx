"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/lib/i18n/language-context";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Illustration } from "@/components/shared/illustration";
import {
  Plus,
  Loader2,
  Users,
  User,
  Calendar as CalendarIcon,
} from "lucide-react";

/**
 * Admin Sessions list page — `/admin/sessions`
 *
 * Phase 1 of the Live Sessions feature. Admin sees every published slot
 * with at-a-glance booking counts, sorted upcoming-first. Past slots
 * stay visible (greyed out) so the admin can audit history without a
 * separate "archive" page — the same pattern as `/admin/licences`.
 *
 * Status semantics:
 *   - `open`       — published, accepting bookings
 *   - `cancelled`  — admin pulled it (not yet exposed in UI; Phase 5)
 *   - `completed`  — past + intended for marking done; for now we just
 *                    derive past-ness from `starts_at` for visual greying
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
  created_at: string;
}

interface SlotWithBookings extends SessionSlot {
  active_bookings: number;
}

export default function AdminSessionsPage() {
  const { t } = useLanguage();
  const isEn = t.nav.signIn === "Sign In";
  const [slots, setSlots] = useState<SlotWithBookings[]>([]);
  const [loading, setLoading] = useState(true);

  const loadSlots = useCallback(async () => {
    // Fetch all slots admin-side. RLS lets admin read everything; we
    // sort upcoming-first so the most actionable rows are at the top.
    const { data: slotData } = await supabase
      .from("session_slots")
      .select("*")
      .order("starts_at", { ascending: true });

    if (!slotData) {
      setSlots([]);
      setLoading(false);
      return;
    }

    // Get active booking counts in a single query, grouped client-side.
    // For Phase 1 traffic this is cheap; if it grows past ~hundreds of
    // slots we can swap to a database view that pre-aggregates.
    const { data: bookings } = await supabase
      .from("session_bookings")
      .select("slot_id, cancelled_at");

    const counts: Record<string, number> = {};
    (bookings ?? []).forEach((b: { slot_id: string; cancelled_at: string | null }) => {
      if (b.cancelled_at === null) {
        counts[b.slot_id] = (counts[b.slot_id] || 0) + 1;
      }
    });

    setSlots(
      slotData.map((s) => ({
        ...s,
        active_bookings: counts[s.id] ?? 0,
      }))
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    loadSlots();
  }, [loadSlots]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/70" />
      </div>
    );
  }

  // Format helpers — date/time uses the user's locale; mono-tabular for
  // alignment with the design system's metadata typography.
  const formatStart = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString(isEn ? "en-US" : "fr-FR", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const isPast = (iso: string) => new Date(iso).getTime() < Date.now();

  return (
    <div className="px-4 py-8 lg:px-8 lg:py-12 max-w-6xl mx-auto space-y-8">
      {/* ── Hero ────────────────────────────────────────────── */}
      <header className="flex items-end justify-between gap-4">
        <div className="space-y-2">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            / Sessions
          </p>
          <h1 className="text-3xl sm:text-4xl font-medium tracking-tight text-foreground">
            {t.sessions.adminTitle}
          </h1>
          <p className="text-muted-foreground text-base max-w-prose">
            {t.sessions.adminSubtitle}
          </p>
        </div>
        <Button render={<Link href="/admin/sessions/new" />} className="gap-1.5 shrink-0">
          <Plus className="h-4 w-4" />
          {t.sessions.newSlot}
        </Button>
      </header>

      {/* ── List / empty state ──────────────────────────────── */}
      {slots.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center text-center py-16">
            <Illustration name="admin-empty" alt="" size="md" />
            <p className="mt-6 text-base font-medium text-foreground">
              {t.sessions.empty}
            </p>
            <Button
              render={<Link href="/admin/sessions/new" />}
              className="mt-4 gap-1.5"
              size="sm"
            >
              <Plus className="h-4 w-4" />
              {t.sessions.emptyAdminCta}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y divide-border/60">
              {/* Header row — mono uppercase, matches admin design language */}
              <div className="hidden lg:grid grid-cols-[1fr_140px_180px_100px_100px] items-center gap-4 px-5 py-3 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                <span>{t.sessions.listColTitle}</span>
                <span>{t.sessions.listColType}</span>
                <span>{t.sessions.listColStartsAt}</span>
                <span className="text-right">{t.sessions.listColAttendees}</span>
                <span className="text-right">{t.sessions.listColStatus}</span>
              </div>

              {slots.map((slot) => {
                const past = isPast(slot.starts_at);
                const isGroup = slot.type === "group";
                return (
                  <div
                    key={slot.id}
                    className={`grid grid-cols-1 lg:grid-cols-[1fr_140px_180px_100px_100px] items-center gap-4 px-5 py-4 transition-opacity ${
                      past ? "opacity-60" : ""
                    }`}
                  >
                    {/* Title + description */}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground tracking-tight truncate">
                        {slot.title}
                      </p>
                      {slot.description && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {slot.description}
                        </p>
                      )}
                    </div>

                    {/* Type pill */}
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      {isGroup ? (
                        <Users className="h-3.5 w-3.5" />
                      ) : (
                        <User className="h-3.5 w-3.5" />
                      )}
                      <span>
                        {isGroup ? t.sessions.typeGroup : t.sessions.typeOneOnOne}
                      </span>
                    </div>

                    {/* Starts at — mono tabular for column alignment */}
                    <div className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground tabular-nums">
                      <CalendarIcon className="h-3.5 w-3.5" />
                      <span>{formatStart(slot.starts_at)}</span>
                      <span className="text-muted-foreground/50">
                        · {slot.duration_minutes}m
                      </span>
                    </div>

                    {/* Booked / capacity — fraction style for at-a-glance fill */}
                    <div className="font-mono text-sm text-foreground tabular-nums lg:text-right">
                      {slot.active_bookings}
                      <span className="text-muted-foreground">
                        /{slot.max_attendees}
                      </span>
                    </div>

                    {/* Status badge */}
                    <div className="lg:text-right">
                      <Badge
                        className={
                          slot.status === "open" && !past
                            ? "bg-primary/15 text-primary"
                            : slot.status === "cancelled"
                            ? "bg-destructive/15 text-destructive"
                            : "bg-muted text-muted-foreground"
                        }
                      >
                        {slot.status === "open"
                          ? past
                            ? t.sessions.statusCompleted
                            : t.sessions.statusOpen
                          : slot.status === "cancelled"
                          ? t.sessions.statusCancelled
                          : t.sessions.statusCompleted}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

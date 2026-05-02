"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/i18n/language-context";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Loader2,
  Users,
  User,
  Calendar as CalendarIcon,
  Clock,
} from "lucide-react";

/**
 * Live session room — `/dashboard/sessions/[id]`
 *
 * Embeds the Jitsi Meet iframe for a slot the current user has booked.
 * The room URL is `https://meet.jit.si/{room_name}` — Jitsi creates
 * the room on first visit, no API or auth needed.
 *
 * Authorization: the user must have an active (non-cancelled) booking
 * for this slot, OR be admin. Anyone else gets bounced back to the
 * sessions list. We don't have a "host can always join" exception
 * separate from admin because there's only one host (the platform
 * admin) per the Phase 1 design decision.
 *
 * Note: this is a Next.js 16 page — params is a Promise that gets
 * unwrapped via React's `use()` hook.
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

  useEffect(() => {
    if (authLoading || !user) return;

    (async () => {
      // Load the slot — RLS allows any authenticated user to read.
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
        .is("cancelled_at", null)
        .maybeSingle();

      if (bookingData) {
        setAuthorized(true);
      } else {
        // Not booked → bounce back to the list.
        router.replace("/dashboard/sessions");
        return;
      }
      setLoading(false);
    })();
  }, [authLoading, user, id, isAdmin, router]);

  if (authLoading || loading || !slot) {
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

  // Jitsi iframe URL — we add a few config flags via the URL
  // hash so the page boots straight into the meeting:
  //   - prejoinPageEnabled=false → skip the lobby
  //   - userInfo.displayName=... → pre-fill the user's name
  // Jitsi reads `config.*` from the hash on load.
  const displayName =
    user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Guest";
  const jitsiUrl = `https://meet.jit.si/${slot.room_name}#config.prejoinPageEnabled=false&userInfo.displayName=%22${encodeURIComponent(
    displayName
  )}%22`;

  return (
    <div className="px-4 py-6 lg:px-8 lg:py-8 max-w-6xl mx-auto space-y-4">
      {/* Back link */}
      <Button
        variant="ghost"
        size="sm"
        render={<Link href="/dashboard/sessions" />}
        className="gap-1.5 -ml-2"
      >
        <ArrowLeft className="h-4 w-4" />
        {t.sessions.title}
      </Button>

      {/* Header */}
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

      {/* Jitsi iframe — fills the available height with a 16/9-ish floor */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <iframe
            src={jitsiUrl}
            allow="camera; microphone; fullscreen; display-capture; autoplay; clipboard-write"
            className="block w-full"
            style={{ height: "min(70vh, 720px)", minHeight: "480px", border: 0 }}
            title={slot.title}
          />
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground/70 text-center">
        {isEn
          ? "Powered by Jitsi Meet — free, open-source, no account required."
          : "Propulsé par Jitsi Meet — libre, open-source, sans compte."}
      </p>
    </div>
  );
}

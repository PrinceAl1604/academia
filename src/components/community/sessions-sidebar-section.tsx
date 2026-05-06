"use client";

import Link from "next/link";
import {
  Video,
  Clock,
  Users,
  User as UserIcon,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { UpcomingSession } from "@/lib/hooks/use-upcoming-sessions";

/**
 * Sidebar block that surfaces live + upcoming sessions inside the
 * Community sidebar. Two stacked sections:
 *
 *   LIVE NOW   — auto-hides when no live session. Each row gets a
 *                pulse dot + primary-tint background to telegraph
 *                "join this thing right now".
 *   SESSIONS   — next-up list, sorted by start time, capped at 5.
 *                "View all →" link drops to /dashboard/sessions
 *                for the full schedule.
 *
 * If both are empty AND the user is Pro, we show a quiet
 * "no sessions yet" stub. If empty for free users we render
 * nothing — sessions are a Pro-only feature; an empty stub for
 * free users is just upsell noise.
 */

interface SessionsSidebarSectionProps {
  live: UpcomingSession[];
  upcoming: UpcomingSession[];
  loading: boolean;
  isPro: boolean;
  isEn: boolean;
  labels: {
    liveNow?: string;
    sessions?: string;
    viewAll?: string;
    noUpcoming?: string;
  };
}

export function SessionsSidebarSection({
  live,
  upcoming,
  loading,
  isPro,
  isEn,
  labels,
}: SessionsSidebarSectionProps) {
  if (loading) return null;
  if (!isPro && live.length === 0 && upcoming.length === 0) return null;

  return (
    <>
      {/* ─── LIVE NOW ───────────────────────────────────────────
           Suppressed when empty so the sidebar doesn't carry an
           always-visible-but-usually-empty section. The user only
           sees it when there's something to act on. */}
      {live.length > 0 && (
        <>
          <div className="pt-3 pb-1 px-2.5">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-primary inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              {labels.liveNow || (isEn ? "Live now" : "En direct")}
            </p>
          </div>
          <div className="space-y-0.5">
            {live.map((slot) => (
              <SessionRow key={slot.id} slot={slot} isLive isEn={isEn} />
            ))}
          </div>
        </>
      )}

      {/* ─── UPCOMING SESSIONS ───────────────────────────────── */}
      <div className="pt-3 pb-1 px-2.5 flex items-center justify-between">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground/50">
          <span className="opacity-50">/</span>{" "}
          {labels.sessions || (isEn ? "Sessions" : "Sessions")}
        </p>
        <Link
          href="/dashboard/sessions"
          className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground/70 hover:text-foreground transition-colors"
        >
          {labels.viewAll || (isEn ? "View all" : "Voir tout")}
          <ArrowRight className="h-2.5 w-2.5" />
        </Link>
      </div>

      {upcoming.length === 0 ? (
        <div className="px-3 py-2 text-[11px] text-muted-foreground/60 leading-relaxed">
          {labels.noUpcoming ||
            (isEn ? "No upcoming sessions." : "Aucune session à venir.")}
        </div>
      ) : (
        <div className="space-y-0.5">
          {upcoming.map((slot) => (
            <SessionRow key={slot.id} slot={slot} isEn={isEn} />
          ))}
        </div>
      )}
    </>
  );
}

/* ─── Single session row ─────────────────────────────────────
 * Three lines of content packed into a sidebar-friendly height:
 *   1. Type icon + title (truncated)
 *   2. Starts-at timestamp (mono, tabular)
 *   3. (live only) "Join now" affordance
 *
 * Live rows get a subtle primary tint so they pop above the
 * uniform muted-foreground sea of upcoming rows. */
function SessionRow({
  slot,
  isLive,
  isEn,
}: {
  slot: UpcomingSession;
  isLive?: boolean;
  isEn?: boolean;
}) {
  const formatStart = (iso: string) =>
    new Date(iso).toLocaleString(isEn ? "en-US" : "fr-FR", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const isGroup = slot.type === "group";
  const TypeIcon = isGroup ? Users : UserIcon;

  return (
    <Link
      href={`/dashboard/sessions/${slot.id}`}
      className={cn(
        "group flex items-start gap-2 rounded-md px-2.5 py-2 transition-colors",
        isLive
          ? "bg-primary/10 hover:bg-primary/15 text-foreground"
          : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground"
      )}
    >
      <TypeIcon
        className={cn(
          "h-3.5 w-3.5 mt-0.5 shrink-0",
          isLive ? "text-primary" : "text-muted-foreground/70"
        )}
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate leading-tight">
          {slot.title}
        </p>
        <p
          className={cn(
            "font-mono text-[10px] tabular-nums mt-0.5 inline-flex items-center gap-1",
            isLive ? "text-primary/80" : "text-muted-foreground/60"
          )}
        >
          {isLive ? (
            <>
              <Video className="h-2.5 w-2.5" />
              {isEn ? "Join now" : "Rejoindre"}
            </>
          ) : (
            <>
              <Clock className="h-2.5 w-2.5" />
              {formatStart(slot.starts_at)}
            </>
          )}
        </p>
      </div>
    </Link>
  );
}

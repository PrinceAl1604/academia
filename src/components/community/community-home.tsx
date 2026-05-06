"use client";

import Link from "next/link";
import {
  Video,
  Hash,
  Megaphone,
  ArrowRight,
  Calendar as CalendarIcon,
  MessageSquare,
  Users,
  User as UserIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { userTintClass } from "@/lib/avatar-color";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { UpcomingSession } from "@/lib/hooks/use-upcoming-sessions";

/**
 * Community Home — the right-pane view shown when no channel
 * or DM is selected (default landing on /dashboard/community).
 *
 * Replaces the old "automatically open General" behavior, which
 * gave users a sea of empty chat space when General had no
 * recent activity. The home view always has SOMETHING to show
 * because it composes from four sources:
 *
 *   1. LIVE NOW       — any session currently in-progress.
 *                       Hero card, Join button, primary tint.
 *   2. UP NEXT        — single biggest upcoming session card.
 *   3. UNREAD CHATS   — channels with unread counts, descending.
 *   4. RECENT DMS     — last 3 DM threads with sender preview.
 *
 * Sections auto-hide when empty. If literally everything is
 * empty (unlikely — General always exists) we render a clean
 * "All caught up" empty state.
 *
 * Click any item → switches the parent's active channel +
 * exits home view via onChannelOpen / onSessionOpen callbacks.
 */

interface CommunityHomeChannel {
  id: string;
  type: "general" | "announcements" | "course" | "direct";
  name: string;
  unreadCount: number;
}

interface CommunityHomeDm {
  channel_id: string;
  other_user_id: string;
  other_name: string;
  other_role: string | null;
  last_message_at: string | null;
}

interface CommunityHomeProps {
  userName: string | null;
  liveSessions: UpcomingSession[];
  upcomingSessions: UpcomingSession[];
  unreadChannels: CommunityHomeChannel[];
  dmThreads: CommunityHomeDm[];
  isEn: boolean;
  onChannelOpen: (channelId: string) => void;
  labels: {
    title?: string;
    welcome?: string;
    liveNow?: string;
    upNext?: string;
    unreadChannels?: string;
    recentDms?: string;
    allCaughtUp?: string;
    allCaughtUpDesc?: string;
    joinNow?: string;
    viewAllSessions?: string;
    general?: string;
    announcements?: string;
  };
}

export function CommunityHome({
  userName,
  liveSessions,
  upcomingSessions,
  unreadChannels,
  dmThreads,
  isEn,
  onChannelOpen,
  labels,
}: CommunityHomeProps) {
  const firstName = (userName ?? "").split(" ")[0];
  const nextSession = upcomingSessions[0];
  const hasAnything =
    liveSessions.length > 0 ||
    upcomingSessions.length > 0 ||
    unreadChannels.length > 0 ||
    dmThreads.length > 0;

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-3xl mx-auto w-full px-4 py-8 space-y-8">
        {/* ─── Hero greeting ─────────────────────────────────── */}
        <header className="space-y-1.5">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            {labels.title || (isEn ? "Community" : "Communauté")}
          </p>
          <h1 className="text-2xl sm:text-3xl font-medium tracking-tight text-foreground">
            {firstName
              ? labels.welcome
                ? labels.welcome.replace("{{name}}", firstName)
                : isEn
                ? `Welcome back, ${firstName}.`
                : `Bon retour, ${firstName}.`
              : labels.title || (isEn ? "Community" : "Communauté")}
          </h1>
        </header>

        {/* ─── LIVE NOW ────────────────────────────────────────
             Single hero card per active session. If there are
             multiple (rare) we stack them — each is independently
             actionable. */}
        {liveSessions.length > 0 && (
          <section className="space-y-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-primary inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              {labels.liveNow || (isEn ? "Live now" : "En direct")}
            </p>
            <div className="space-y-2">
              {liveSessions.map((s) => (
                <SessionCard
                  key={s.id}
                  session={s}
                  variant="live"
                  isEn={isEn}
                  joinLabel={labels.joinNow}
                />
              ))}
            </div>
          </section>
        )}

        {/* ─── UP NEXT ─────────────────────────────────────────
             Show the single soonest upcoming session as a
             larger, glanceable card. Rest of the schedule lives
             in the sidebar + /dashboard/sessions. */}
        {nextSession && (
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground/50">
                    {labels.upNext || (isEn ? "Up next" : "À venir")}
              </p>
              <Link
                href="/dashboard/sessions"
                className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground/70 hover:text-foreground transition-colors"
              >
                {labels.viewAllSessions || (isEn ? "View all" : "Voir tout")}
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <SessionCard session={nextSession} variant="upcoming" isEn={isEn} />
          </section>
        )}

        {/* ─── UNREAD CHANNELS ───────────────────────────────── */}
        {unreadChannels.length > 0 && (
          <section className="space-y-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground/50">
                {labels.unreadChannels ||
                (isEn ? "Unread channels" : "Salons non lus")}
            </p>
            <div className="space-y-1">
              {unreadChannels.map((ch) => {
                const Icon = ch.type === "announcements" ? Megaphone : Hash;
                return (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => onChannelOpen(ch.id)}
                    className="group flex w-full items-center justify-between gap-3 rounded-lg border border-border/60 bg-card px-4 py-3 text-left transition-colors hover:border-border hover:bg-sidebar-accent/40"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon
                        className={cn(
                          "h-4 w-4 shrink-0",
                          ch.type === "announcements"
                            ? "text-amber-500"
                            : "text-muted-foreground/60"
                        )}
                      />
                      <span className="font-medium text-sm text-foreground truncate">
                        {ch.type === "general"
                          ? labels.general || "General"
                          : ch.type === "announcements"
                          ? labels.announcements || "Announcements"
                          : ch.name}
                      </span>
                    </div>
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground tabular-nums px-1 shrink-0">
                      {ch.unreadCount > 99 ? "99+" : ch.unreadCount}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* ─── RECENT DMs ─────────────────────────────────────
             Shows up to 3 most-recent DM threads — full list
             stays in the sidebar. Helpful when a student logs
             in and wants to pick up where they left off. */}
        {dmThreads.length > 0 && (
          <section className="space-y-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground/50">
                {labels.recentDms ||
                (isEn ? "Recent messages" : "Messages récents")}
            </p>
            <div className="space-y-1">
              {dmThreads.slice(0, 3).map((dm) => {
                const isAdminThread = dm.other_role === "admin";
                const initials = (dm.other_name || "?")
                  .split(/\s+/)
                  .map((s) => s[0])
                  .filter(Boolean)
                  .slice(0, 2)
                  .join("")
                  .toUpperCase();
                return (
                  <button
                    key={dm.channel_id}
                    type="button"
                    onClick={() => onChannelOpen(dm.channel_id)}
                    className="group flex w-full items-center gap-3 rounded-lg border border-border/60 bg-card px-4 py-3 text-left transition-colors hover:border-border hover:bg-sidebar-accent/40"
                  >
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarFallback
                        className={cn(
                          "text-xs font-medium",
                          isAdminThread
                            ? "bg-amber-500/15 text-amber-500"
                            : userTintClass(dm.other_user_id)
                        )}
                      >
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <span className="flex-1 text-sm font-medium text-foreground truncate">
                      {dm.other_name}
                    </span>
                    <MessageSquare className="h-3.5 w-3.5 text-muted-foreground/50 group-hover:text-foreground transition-colors shrink-0" />
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* ─── Empty fallback ─────────────────────────────────
             Nothing to surface — everyone is caught up and
             nothing is scheduled. Quiet, encouraging copy
             rather than a sad empty state. */}
        {!hasAnything && (
          <section className="rounded-lg border border-dashed border-border/60 bg-muted/20 px-6 py-12 text-center">
            <p className="text-base font-medium text-foreground">
              {labels.allCaughtUp ||
                (isEn ? "All caught up" : "Tout est à jour")}
            </p>
            <p className="text-sm text-muted-foreground/70 mt-1.5">
              {labels.allCaughtUpDesc ||
                (isEn
                  ? "No live sessions, unread messages, or upcoming events. Check back later."
                  : "Aucune session en direct, message non lu ou événement à venir. Revenez plus tard.")}
            </p>
          </section>
        )}
      </div>
    </div>
  );
}

/* ─── Session card ──────────────────────────────────────────
 * Two visual variants:
 *   - live    : primary-tinted background, pulse dot, big Join CTA
 *   - upcoming: bordered card, calendar icon, lower-emphasis
 *
 * Same data shape, same Link target. Variant just shifts the
 * weight to match the urgency. */
function SessionCard({
  session,
  variant,
  isEn,
  joinLabel,
}: {
  session: UpcomingSession;
  variant: "live" | "upcoming";
  isEn: boolean;
  joinLabel?: string;
}) {
  const isLive = variant === "live";
  const isGroup = session.type === "group";
  const TypeIcon = isGroup ? Users : UserIcon;

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleString(isEn ? "en-US" : "fr-FR", {
      weekday: "long",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <Link
      href={`/dashboard/sessions/${session.id}`}
      className={cn(
        "group flex items-center gap-4 rounded-lg px-4 py-4 transition-colors",
        isLive
          ? "bg-primary/15 hover:bg-primary/20 border border-primary/30"
          : "bg-card border border-border/60 hover:border-border"
      )}
    >
      <div
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
          isLive ? "bg-primary/25 text-primary" : "bg-muted text-muted-foreground"
        )}
      >
        {isLive ? (
          <Video className="h-5 w-5" />
        ) : (
          <CalendarIcon className="h-5 w-5" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground truncate">
          {session.title}
        </p>
        <p
          className={cn(
            "text-xs mt-0.5 truncate inline-flex items-center gap-1.5",
            isLive ? "text-primary/80" : "text-muted-foreground"
          )}
        >
          <TypeIcon className="h-3 w-3 shrink-0" />
          {isLive
            ? isEn
              ? "Happening now"
              : "En cours"
            : formatTime(session.starts_at)}
        </p>
      </div>
      {isLive ? (
        <Button size="sm" className="shrink-0 shadow-sm">
          <Video className="h-3.5 w-3.5" />
          {joinLabel || (isEn ? "Join now" : "Rejoindre")}
        </Button>
      ) : (
        <ArrowRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-foreground transition-colors shrink-0" />
      )}
    </Link>
  );
}

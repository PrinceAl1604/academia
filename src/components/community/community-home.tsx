"use client";

import {
  Hash,
  Megaphone,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { userTintClass } from "@/lib/avatar-color";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

/**
 * Community Home — the right-pane view shown when no channel
 * or DM is selected (default landing on /dashboard/community).
 *
 * Composes from two sources, each auto-hiding when empty:
 *
 *   1. UNREAD CHATS   — channels with unread counts, descending.
 *   2. RECENT DMS     — last 3 DM threads with sender preview.
 *
 * Empty fallback: clean "All caught up" card when both are quiet.
 *
 * Click any item → switches the parent's active channel via
 * onChannelOpen.
 *
 * NOTE: live + upcoming sessions used to live here too (Phase B
 * of an earlier merge). Removed after a UX review found the
 * combined view bloated the visual hierarchy. Sessions are back
 * in the main DashboardSidebar at /dashboard/sessions.
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
  unreadChannels: CommunityHomeChannel[];
  dmThreads: CommunityHomeDm[];
  isEn: boolean;
  onChannelOpen: (channelId: string) => void;
  labels: {
    title?: string;
    welcome?: string;
    unreadChannels?: string;
    recentDms?: string;
    allCaughtUp?: string;
    allCaughtUpDesc?: string;
    general?: string;
    announcements?: string;
  };
}

export function CommunityHome({
  userName,
  unreadChannels,
  dmThreads,
  isEn,
  onChannelOpen,
  labels,
}: CommunityHomeProps) {
  const firstName = (userName ?? "").split(" ")[0];
  const hasAnything = unreadChannels.length > 0 || dmThreads.length > 0;

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

        {/* ─── UNREAD CHANNELS ───────────────────────────────── */}
        {unreadChannels.length > 0 && (
          <section className="space-y-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground/60">
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
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground/60">
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
             Nothing to surface — everyone is caught up.
             Quiet, encouraging copy rather than a sad empty
             state. */}
        {!hasAnything && (
          <section className="rounded-lg border border-dashed border-border/60 bg-muted/20 px-6 py-12 text-center">
            <p className="text-base font-medium text-foreground">
              {labels.allCaughtUp ||
                (isEn ? "All caught up" : "Tout est à jour")}
            </p>
            <p className="text-sm text-muted-foreground/70 mt-1.5">
              {labels.allCaughtUpDesc ||
                (isEn
                  ? "No unread messages or recent activity. Check back later."
                  : "Aucun message non lu ou activité récente. Revenez plus tard.")}
            </p>
          </section>
        )}
      </div>
    </div>
  );
}

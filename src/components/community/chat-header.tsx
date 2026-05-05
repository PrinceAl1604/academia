"use client";

import {
  Bell,
  BellOff,
  Crown,
  PanelLeft,
  PanelLeftClose,
  Pin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { userTintClass } from "@/lib/avatar-color";

/**
 * Chat header for the community page. Renders three layouts
 * depending on what's active:
 *   - DM thread: peer avatar + name (+ Host badge if admin)
 *   - Public channel: # glyph + name (+ description for special
 *     types like announcements / course)
 *   - Nothing: hidden by parent (parent gates the render)
 *
 * Right cluster: pinned-toggle, mute toggle, online indicator.
 *
 * Props are explicit (no t/translations object) so the component
 * is locale-agnostic at the type level. Parent passes pre-resolved
 * label strings — pattern matches DmComposePanel.
 */

export interface ChatHeaderChannel {
  id: string;
  type: "general" | "announcements" | "course" | "direct";
  name: string;
}

export interface ChatHeaderDmThread {
  channel_id: string;
  other_user_id: string;
  other_name: string;
  other_role: string | null;
}

interface OnlineUser {
  id: string;
  name: string;
}

interface ChatHeaderLabels {
  general?: string;
  announcements?: string;
  announcementsDesc?: string;
  courseChat?: string;
  directMessages?: string;
  dmAdminBadge?: string;
  channelMute?: string;
  channelUnmute?: string;
}

interface ChatHeaderProps {
  activeChannel: ChatHeaderChannel | null;
  dmThreads: ChatHeaderDmThread[];
  pinnedCount: number;
  showPinned: boolean;
  onTogglePinned: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  showSidebar: boolean;
  onToggleSidebar: () => void;
  onlineUsers: OnlineUser[];
  onlineCount: number;
  isEn: boolean;
  labels: ChatHeaderLabels;
}

export function ChatHeader({
  activeChannel,
  dmThreads,
  pinnedCount,
  showPinned,
  onTogglePinned,
  isMuted,
  onToggleMute,
  showSidebar,
  onToggleSidebar,
  onlineUsers,
  onlineCount,
  isEn,
  labels,
}: ChatHeaderProps) {
  return (
    <div className="border-b border-border">
      <div className="max-w-3xl mx-auto w-full flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 text-muted-foreground/70"
            onClick={onToggleSidebar}
          >
            {showSidebar ? (
              <PanelLeftClose className="h-4 w-4" />
            ) : (
              <PanelLeft className="h-4 w-4" />
            )}
          </Button>

          {activeChannel && activeChannel.type === "direct" ? (
            <DmHeader
              dm={dmThreads.find((d) => d.channel_id === activeChannel.id)}
              labels={labels}
            />
          ) : activeChannel ? (
            <ChannelHeader
              channel={activeChannel}
              isEn={isEn}
              labels={labels}
            />
          ) : null}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {pinnedCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-muted-foreground h-8"
              onClick={onTogglePinned}
              aria-pressed={showPinned}
            >
              <Pin className="h-3.5 w-3.5" />
              {pinnedCount}
            </Button>
          )}

          {activeChannel && activeChannel.type !== "direct" && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={onToggleMute}
              title={isMuted ? labels.channelUnmute : labels.channelMute}
              aria-label={isMuted ? labels.channelUnmute : labels.channelMute}
            >
              {isMuted ? (
                <BellOff className="h-3.5 w-3.5 text-amber-500" />
              ) : (
                <Bell className="h-3.5 w-3.5" />
              )}
            </Button>
          )}

          <div
            className="flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1"
            title={
              onlineUsers.length > 0
                ? onlineUsers.map((u) => u.name).join(", ")
                : undefined
            }
          >
            <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <span className="text-xs font-medium text-primary tabular-nums">
              {onlineCount}{" "}
              {isEn
                ? onlineCount === 1
                  ? "person online"
                  : "people online"
                : onlineCount === 1
                ? "personne en ligne"
                : "personnes en ligne"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function DmHeader({
  dm,
  labels,
}: {
  dm: ChatHeaderDmThread | undefined;
  labels: ChatHeaderLabels;
}) {
  if (!dm) return null;
  const isAdminThread = dm.other_role === "admin";
  const initials = (dm.other_name || "?")
    .split(/\s+/)
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <div className="flex items-center gap-2.5 min-w-0">
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
      <div className="min-w-0">
        <h1 className="text-base font-semibold tracking-tight text-foreground truncate flex items-center gap-1.5">
          {dm.other_name}
          {isAdminThread && (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-500/15 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-amber-500">
              <Crown className="h-2.5 w-2.5" />
              {labels.dmAdminBadge || "Host"}
            </span>
          )}
        </h1>
        <p className="text-[11px] text-muted-foreground/70">
          {(labels.directMessages || "Direct messages").toLowerCase()}
        </p>
      </div>
    </div>
  );
}

function ChannelHeader({
  channel,
  isEn,
  labels,
}: {
  channel: ChatHeaderChannel;
  isEn: boolean;
  labels: ChatHeaderLabels;
}) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      <span
        className={cn(
          "shrink-0 font-mono text-lg leading-none",
          channel.type === "announcements"
            ? "text-amber-500"
            : "text-muted-foreground/60"
        )}
        aria-hidden
      >
        #
      </span>
      <div className="min-w-0">
        <h1 className="text-base font-semibold tracking-tight text-foreground truncate">
          {channel.type === "general"
            ? labels.general || "General"
            : channel.type === "announcements"
            ? labels.announcements || "Announcements"
            : channel.name}
        </h1>
        {channel.type === "announcements" && (
          <p className="text-[11px] text-amber-600 dark:text-amber-400">
            {labels.announcementsDesc ||
              (isEn
                ? "Important updates from admins"
                : "Mises à jour importantes des administrateurs")}
          </p>
        )}
        {channel.type === "course" && (
          <p className="text-[11px] text-muted-foreground/70">
            {labels.courseChat ||
              (isEn ? "Course discussion" : "Discussion du cours")}
          </p>
        )}
      </div>
    </div>
  );
}

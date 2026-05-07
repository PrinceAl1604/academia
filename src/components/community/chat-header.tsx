"use client";

import {
  Bell,
  BellOff,
  Crown,
  MoreVertical,
  PanelLeft,
  PanelLeftClose,
  Pin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { userTintClass } from "@/lib/avatar-color";

/**
 * Chat header for the community page (compact form).
 *
 * Refactored to mirror the ClickUp Chat header — single low-row
 * with minimal chrome:
 *
 *   [◀ toggle] [#] Channel name      [● 3]   [⋯ menu]
 *
 * Previously the right cluster carried a heavy "1 personne en
 * ligne" pill, a pinned-toggle button, and a mute-toggle button
 * — three things competing for attention in a slot that should
 * be quiet metadata. Now:
 *
 *   - Online indicator collapses to a compact dot + count
 *     (tooltip on hover lists names). It only appears when at
 *     least one other person is online so it doesn't clutter
 *     empty channels.
 *   - Pin + Mute move INTO a ⋯ DropdownMenu. Same affordances,
 *     no longer competing for header space.
 *   - Header padding tightened (py-3 → py-2.5).
 *
 * Sub-components DmHeader and ChannelHeader handle the three
 * render modes (DM / public channel / nothing).
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
  other_avatar_url: string | null;
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
  pinnedMessages?: string;
  onlineRoster?: string;
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
  const isDm = activeChannel?.type === "direct";
  // Online indicator only counts OTHERS — showing "1" when only
  // the current user is on the page is a self-help signal that's
  // never useful. The roster tooltip already includes self if
  // anyone wants the whole list.
  const othersOnline = Math.max(0, onlineCount - 1);

  return (
    <div className="border-b border-border">
      <div className="max-w-3xl mx-auto w-full flex items-center justify-between gap-2 px-4 py-2.5">
        <div className="flex items-center gap-2 min-w-0">
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

          {isDm && activeChannel ? (
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

        <div className="flex items-center gap-1 shrink-0">
          {/* Online indicator — compact dot + count of OTHERS.
               Hidden when nobody else is on the page so empty
               channels don't carry visual noise. Tooltip lists
               every connected user (including self). */}
          {othersOnline > 0 && (
            <div
              className="flex items-center gap-1.5 rounded-full px-2 py-1"
              title={
                onlineUsers.length > 0
                  ? onlineUsers.map((u) => u.name).join(", ")
                  : undefined
              }
            >
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              <span className="text-[11px] font-medium text-muted-foreground tabular-nums">
                {othersOnline}
              </span>
            </div>
          )}

          {/* Channel actions menu. Holds pin-toggle + mute-toggle
               so the header itself stays clean. Only renders if
               there's at least one applicable action — DMs don't
               support mute, so a DM with zero pins shows no
               menu at all. */}
          {(activeChannel && (!isDm || pinnedCount > 0)) && (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    aria-label={isEn ? "Channel options" : "Options du salon"}
                  />
                }
              >
                <MoreVertical className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel className="text-[10px] font-mono uppercase tracking-[0.16em] text-muted-foreground/60">
                  {isDm
                    ? labels.directMessages || (isEn ? "Direct message" : "Message direct")
                    : labels.general || (isEn ? "Channel" : "Salon")}
                </DropdownMenuLabel>
                {pinnedCount > 0 && (
                  <DropdownMenuItem
                    className="gap-2 text-sm"
                    onClick={onTogglePinned}
                    aria-pressed={showPinned}
                  >
                    <Pin className="h-3.5 w-3.5" />
                    <span className="flex-1">
                      {labels.pinnedMessages ||
                        (isEn ? "Pinned messages" : "Messages épinglés")}
                    </span>
                    <span className="font-mono text-xs text-muted-foreground/70 tabular-nums">
                      {pinnedCount}
                    </span>
                  </DropdownMenuItem>
                )}
                {!isDm && (
                  <>
                    {pinnedCount > 0 && <DropdownMenuSeparator />}
                    <DropdownMenuItem
                      className="gap-2 text-sm"
                      onClick={onToggleMute}
                    >
                      {isMuted ? (
                        <BellOff className="h-3.5 w-3.5 text-amber-500" />
                      ) : (
                        <Bell className="h-3.5 w-3.5" />
                      )}
                      <span>
                        {isMuted
                          ? labels.channelUnmute || (isEn ? "Unmute" : "Réactiver")
                          : labels.channelMute ||
                            (isEn ? "Mute notifications" : "Couper les notifications")}
                      </span>
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
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
    <div className="flex items-center gap-2 min-w-0">
      <Avatar className="h-7 w-7 shrink-0">
        {dm.other_avatar_url && (
          <AvatarImage src={dm.other_avatar_url} alt="" />
        )}
        <AvatarFallback
          className={cn(
            "text-[11px] font-medium",
            isAdminThread
              ? "bg-amber-500/15 text-amber-500"
              : userTintClass(dm.other_user_id)
          )}
        >
          {initials}
        </AvatarFallback>
      </Avatar>
      <h1 className="text-sm font-semibold tracking-tight text-foreground truncate flex items-center gap-1.5">
        {dm.other_name}
        {isAdminThread && (
          <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-500/15 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-amber-500">
            <Crown className="h-2.5 w-2.5" />
            {labels.dmAdminBadge || "Host"}
          </span>
        )}
      </h1>
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
          "shrink-0 font-mono text-base leading-none",
          channel.type === "announcements"
            ? "text-amber-500"
            : "text-muted-foreground/60"
        )}
        aria-hidden
      >
        #
      </span>
      <h1 className="text-sm font-semibold tracking-tight text-foreground truncate">
        {channel.type === "general"
          ? labels.general || "General"
          : channel.type === "announcements"
          ? labels.announcements || "Announcements"
          : channel.name}
      </h1>
      {channel.type === "course" && (
        <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground/50 shrink-0">
          {isEn ? "course" : "cours"}
        </span>
      )}
    </div>
  );
}

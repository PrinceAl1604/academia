"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Send,
  Pin,
  Trash2,
  MoreVertical,
  Smile,
  ChevronDown,
  Loader2,
  Hash,
  Megaphone,
  BookOpen,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/i18n/language-context";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

/* ─── Types ───────────────────────────────────────────────── */

interface Channel {
  id: string;
  type: "general" | "announcements" | "course";
  name: string;
  course_id: string | null;
  created_at: string;
}

interface ChatMessage {
  id: string;
  user_id: string;
  channel_id: string;
  content: string;
  is_pinned: boolean;
  is_deleted: boolean;
  created_at: string;
  user?: { name: string; role: string | null };
}

/* ─── Constants ───────────────────────────────────────────── */

const GENERAL_CHANNEL_ID = "00000000-0000-0000-0000-000000000001";
const MESSAGES_PER_PAGE = 50;
const QUICK_EMOJIS = ["👍", "❤️", "😂", "🔥", "🎉", "💡", "👏", "🙏"];

/* ─── Channel Icon ────────────────────────────────────────── */

function ChannelIcon({
  type,
  className,
}: {
  type: Channel["type"];
  className?: string;
}) {
  switch (type) {
    case "announcements":
      return <Megaphone className={className} />;
    case "course":
      return <BookOpen className={className} />;
    default:
      return <Hash className={className} />;
  }
}

/* ═══════════════════════════════════════════════════════════ */
/*  Main Component                                            */
/* ═══════════════════════════════════════════════════════════ */

export default function CommunityPage() {
  const { user, isAdmin, userName } = useAuth();
  const { t, language } = useLanguage();
  const isEn = language === "en";

  /* ─── Channel state ─────────────────────────────────────── */
  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeChannelId, setActiveChannelId] = useState(GENERAL_CHANNEL_ID);
  const [unreadCounts, setUnreadCounts] = useState<Map<string, number>>(
    new Map()
  );
  const [showSidebar, setShowSidebar] = useState(true);

  /* ─── Chat state ────────────────────────────────────────── */
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [onlineCount, setOnlineCount] = useState(0);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [pinnedMessages, setPinnedMessages] = useState<ChatMessage[]>([]);
  const [showPinned, setShowPinned] = useState(false);

  /* ─── Refs ──────────────────────────────────────────────── */
  const bottomRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const isNearBottom = useRef(true);
  const activeChannelRef = useRef(activeChannelId);

  // Keep ref in sync so realtime callbacks always see latest value
  useEffect(() => {
    activeChannelRef.current = activeChannelId;
  }, [activeChannelId]);

  /* ─── Computed ──────────────────────────────────────────── */
  const activeChannel = useMemo(
    () => channels.find((c) => c.id === activeChannelId) || null,
    [channels, activeChannelId]
  );

  const canPost = isAdmin || activeChannel?.type !== "announcements";

  const coreChannels = useMemo(
    () => channels.filter((c) => c.type !== "course"),
    [channels]
  );
  const courseChannels = useMemo(
    () => channels.filter((c) => c.type === "course"),
    [channels]
  );

  const totalUnread = useMemo(
    () => Array.from(unreadCounts.values()).reduce((a, b) => a + b, 0),
    [unreadCounts]
  );

  /* ═══════════════════════════════════════════════════════════ */
  /*  Data Loading                                              */
  /* ═══════════════════════════════════════════════════════════ */

  /* ─── Load channels ─────────────────────────────────────── */
  useEffect(() => {
    if (!user) return;

    (async () => {
      const { data: allChannels } = await supabase
        .from("chat_channels")
        .select("*")
        .order("created_at", { ascending: true });

      if (!allChannels) return;

      if (isAdmin) {
        setChannels(allChannels as Channel[]);
      } else {
        // Only show course channels the student is enrolled in
        const { data: enrollments } = await supabase
          .from("enrollments")
          .select("course_id")
          .eq("user_id", user.id);

        const enrolledIds = new Set(
          (enrollments ?? []).map((e: { course_id: string }) => e.course_id)
        );

        setChannels(
          (allChannels as Channel[]).filter(
            (ch) => ch.type !== "course" || enrolledIds.has(ch.course_id!)
          )
        );
      }
    })();
  }, [user, isAdmin]);

  /* ─── Load unread counts ────────────────────────────────── */
  const loadUnreadCounts = useCallback(async () => {
    if (!user || channels.length === 0) return;

    const { data: reads } = await supabase
      .from("chat_reads")
      .select("channel_id, last_read_at")
      .eq("user_id", user.id);

    const readMap = new Map(
      (reads ?? []).map((r: { channel_id: string; last_read_at: string }) => [
        r.channel_id,
        r.last_read_at,
      ])
    );

    const counts = new Map<string, number>();

    await Promise.all(
      channels.map(async (ch) => {
        const lastRead = readMap.get(ch.id);
        let query = supabase
          .from("chat_messages")
          .select("*", { count: "exact", head: true })
          .eq("channel_id", ch.id)
          .eq("is_deleted", false)
          .neq("user_id", user.id);

        if (lastRead) query = query.gt("created_at", lastRead);

        const { count } = await query;
        if (count && count > 0) counts.set(ch.id, count);
      })
    );

    setUnreadCounts(counts);
  }, [user, channels]);

  useEffect(() => {
    loadUnreadCounts();
  }, [loadUnreadCounts]);

  /* ─── Load messages for active channel ──────────────────── */
  const loadMessages = useCallback(async (channelId: string) => {
    setLoading(true);
    const { data } = await supabase
      .from("chat_messages")
      .select("*, user:users(name, role)")
      .eq("channel_id", channelId)
      .order("created_at", { ascending: true })
      .limit(MESSAGES_PER_PAGE);

    const msgs = (data as ChatMessage[]) || [];
    setMessages(msgs);
    setPinnedMessages(msgs.filter((m) => m.is_pinned && !m.is_deleted));
    setLoading(false);
    setTimeout(() => bottomRef.current?.scrollIntoView(), 50);
  }, []);

  useEffect(() => {
    loadMessages(activeChannelId);
  }, [activeChannelId, loadMessages]);

  /* ─── Mark channel as read ──────────────────────────────── */
  const markAsRead = useCallback(
    async (channelId: string) => {
      if (!user) return;
      await supabase.from("chat_reads").upsert(
        {
          user_id: user.id,
          channel_id: channelId,
          last_read_at: new Date().toISOString(),
        },
        { onConflict: "user_id,channel_id" }
      );
      setUnreadCounts((prev) => {
        const next = new Map(prev);
        next.delete(channelId);
        return next;
      });
    },
    [user]
  );

  // Mark as read when switching channels
  useEffect(() => {
    markAsRead(activeChannelId);
  }, [activeChannelId, markAsRead]);

  /* ═══════════════════════════════════════════════════════════ */
  /*  Realtime                                                  */
  /* ═══════════════════════════════════════════════════════════ */

  useEffect(() => {
    const channel = supabase
      .channel("chat_messages_realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages" },
        async (payload) => {
          const { data } = await supabase
            .from("chat_messages")
            .select("*, user:users(name, role)")
            .eq("id", payload.new.id)
            .single();
          if (!data) return;

          const msg = data as ChatMessage;

          if (msg.channel_id === activeChannelRef.current) {
            // Message in active channel → add to list
            setMessages((prev) => [...prev, msg]);
            if (isNearBottom.current) {
              setTimeout(
                () =>
                  bottomRef.current?.scrollIntoView({ behavior: "smooth" }),
                50
              );
            }
            // Auto mark-as-read (non-blocking)
            if (msg.user_id !== user?.id) {
              markAsRead(activeChannelRef.current);
            }
          } else if (msg.user_id !== user?.id) {
            // Message in another channel → increment unread badge
            setUnreadCounts((prev) => {
              const next = new Map(prev);
              next.set(
                msg.channel_id,
                (next.get(msg.channel_id) || 0) + 1
              );
              return next;
            });
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "chat_messages" },
        async (payload) => {
          const updated = payload.new as { id: string; channel_id: string };
          if (updated.channel_id !== activeChannelRef.current) return;

          const { data } = await supabase
            .from("chat_messages")
            .select("*, user:users(name, role)")
            .eq("id", updated.id)
            .single();
          if (!data) return;

          const msg = data as ChatMessage;
          setMessages((prev) =>
            prev.map((m) => (m.id === msg.id ? msg : m))
          );
          setPinnedMessages((prev) => {
            const without = prev.filter((m) => m.id !== msg.id);
            if (msg.is_pinned && !msg.is_deleted) return [...without, msg];
            return without;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, markAsRead]);

  /* ─── Presence ──────────────────────────────────────────── */
  useEffect(() => {
    if (!user) return;

    const presence = supabase.channel("community_presence", {
      config: { presence: { key: user.id } },
    });

    presence
      .on("presence", { event: "sync" }, () => {
        setOnlineCount(Object.keys(presence.presenceState()).length);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await presence.track({ user_id: user.id, name: userName });
        }
      });

    return () => {
      supabase.removeChannel(presence);
    };
  }, [user, userName]);

  /* ═══════════════════════════════════════════════════════════ */
  /*  Handlers                                                  */
  /* ═══════════════════════════════════════════════════════════ */

  const handleScroll = useCallback(() => {
    const el = chatContainerRef.current;
    if (!el) return;
    const atBottom =
      el.scrollHeight - el.scrollTop - el.clientHeight < 150;
    isNearBottom.current = atBottom;
    setShowScrollBtn(!atBottom);
  }, []);

  const scrollToBottom = () =>
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });

  const switchChannel = (channelId: string) => {
    if (channelId === activeChannelId) return;
    setActiveChannelId(channelId);
    setShowPinned(false);
    setShowEmoji(false);
    setInput("");
  };

  const handleSend = async () => {
    if (!input.trim() || !user || sending || !canPost) return;
    const content = input.trim();
    setInput("");
    setSending(true);
    setShowEmoji(false);

    await supabase.from("chat_messages").insert({
      user_id: user.id,
      channel_id: activeChannelId,
      content,
    });

    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  /* ─── Admin / self actions ──────────────────────────────── */
  const togglePin = async (msg: ChatMessage) => {
    await supabase
      .from("chat_messages")
      .update({ is_pinned: !msg.is_pinned })
      .eq("id", msg.id);
  };

  const deleteMessage = async (msg: ChatMessage) => {
    await supabase
      .from("chat_messages")
      .update({ is_deleted: true })
      .eq("id", msg.id);
  };

  /* ─── Helpers ───────────────────────────────────────────── */
  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor(
      (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24)
    );
    const time = d.toLocaleTimeString(isEn ? "en-US" : "fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    });
    if (diffDays === 0) return time;
    if (diffDays === 1)
      return `${isEn ? "Yesterday" : "Hier"} ${time}`;
    return `${d.toLocaleDateString(isEn ? "en-US" : "fr-FR", {
      day: "numeric",
      month: "short",
    })} ${time}`;
  };

  const getInitials = (name: string) =>
    (name || "U")
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();

  /* ═══════════════════════════════════════════════════════════ */
  /*  Render                                                    */
  /* ═══════════════════════════════════════════════════════════ */

  return (
    <div className="flex h-[calc(100vh-8rem)]">
      {/* ─── Channel Sidebar ────────────────────────────────── */}
      <div
        className={cn(
          "shrink-0 flex-col border-r border-border bg-muted/40 transition-[width,opacity] duration-200 overflow-hidden",
          showSidebar
            ? "w-56 opacity-100 flex"
            : "w-0 opacity-0 hidden md:flex md:w-0"
        )}
      >
        {/* Sidebar header */}
        <div className="flex items-center justify-between px-3 py-3 border-b border-border">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">
            {t.community?.channels || "Channels"}
          </h2>
          <div className="flex items-center gap-1.5 rounded-full bg-primary/10 px-2 py-0.5">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            <span className="text-[10px] font-medium text-primary">
              {onlineCount}
            </span>
          </div>
        </div>

        {/* Channel list */}
        <nav className="flex-1 overflow-y-auto py-2 px-1.5 space-y-0.5">
          {/* Core channels (General, Announcements) */}
          {coreChannels.map((ch) => {
            const isActive = ch.id === activeChannelId;
            const unread = unreadCounts.get(ch.id) || 0;
            return (
              <button
                key={ch.id}
                onClick={() => switchChannel(ch.id)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left transition-colors",
                  isActive
                    ? "bg-card text-foreground shadow-sm ring-1 ring-primary/15"
                    : "text-muted-foreground hover:bg-card/60 hover:text-foreground"
                )}
              >
                <ChannelIcon
                  type={ch.type}
                  className={cn(
                    "h-4 w-4 shrink-0",
                    ch.type === "announcements"
                      ? "text-amber-500 dark:text-amber-400"
                      : isActive
                        ? "text-primary"
                        : "text-muted-foreground/70"
                  )}
                />
                <span className="flex-1 text-sm font-medium truncate">
                  {ch.type === "general"
                    ? t.community?.general || "General"
                    : ch.type === "announcements"
                    ? t.community?.announcements || "Announcements"
                    : ch.name}
                </span>
                {unread > 0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground px-1">
                    {unread > 99 ? "99+" : unread}
                  </span>
                )}
              </button>
            );
          })}

          {/* Course channels */}
          {courseChannels.length > 0 && (
            <>
              <div className="pt-3 pb-1 px-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                  {t.community?.courseChannels || "Courses"}
                </p>
              </div>
              {courseChannels.map((ch) => {
                const isActive = ch.id === activeChannelId;
                const unread = unreadCounts.get(ch.id) || 0;
                return (
                  <button
                    key={ch.id}
                    onClick={() => switchChannel(ch.id)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left transition-colors",
                      isActive
                        ? "bg-card text-foreground shadow-sm ring-1 ring-primary/15"
                        : "text-muted-foreground hover:bg-card/60 hover:text-foreground"
                    )}
                  >
                    <BookOpen
                      className={cn(
                        "h-4 w-4 shrink-0",
                        isActive
                          ? "text-primary"
                          : "text-muted-foreground/70"
                      )}
                    />
                    <span className="flex-1 text-sm font-medium truncate">
                      {ch.name}
                    </span>
                    {unread > 0 && (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground px-1">
                        {unread > 99 ? "99+" : unread}
                      </span>
                    )}
                  </button>
                );
              })}
            </>
          )}
        </nav>
      </div>

      {/* ─── Chat Area ──────────────────────────────────────── */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* ─── Chat Header ────────────────────────────────────── */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Toggle sidebar */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 text-muted-foreground"
              onClick={() => setShowSidebar(!showSidebar)}
            >
              {showSidebar ? (
                <PanelLeftClose className="h-4 w-4" />
              ) : (
                <PanelLeft className="h-4 w-4" />
              )}
            </Button>

            {/* Channel info */}
            {activeChannel && (
              <div className="flex items-center gap-2 min-w-0">
                <ChannelIcon
                  type={activeChannel.type}
                  className={cn(
                    "h-5 w-5 shrink-0",
                    activeChannel.type === "announcements"
                      ? "text-amber-500 dark:text-amber-400"
                      : "text-muted-foreground"
                  )}
                />
                <div className="min-w-0">
                  <h1 className="text-sm font-bold text-foreground truncate">
                    {activeChannel.type === "general"
                      ? t.community?.general || "General"
                      : activeChannel.type === "announcements"
                      ? t.community?.announcements || "Announcements"
                      : activeChannel.name}
                  </h1>
                  {activeChannel.type === "announcements" && (
                    <p className="text-[11px] text-amber-600 dark:text-amber-400">
                      {t.community?.announcementsDesc ||
                        (isEn
                          ? "Important updates from admins"
                          : "Mises à jour importantes des administrateurs")}
                    </p>
                  )}
                  {activeChannel.type === "course" && (
                    <p className="text-[11px] text-muted-foreground/80">
                      {t.community?.courseChat ||
                        (isEn
                          ? "Course discussion"
                          : "Discussion du cours")}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Pinned toggle */}
            {pinnedMessages.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-muted-foreground h-8"
                onClick={() => setShowPinned(!showPinned)}
              >
                <Pin className="h-3.5 w-3.5" />
                {pinnedMessages.length}
              </Button>
            )}

            {/* Online indicator (mobile-friendly) */}
            <div className="flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1">
              <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              <span className="text-xs font-medium text-primary">
                {onlineCount} {isEn ? "online" : "en ligne"}
              </span>
            </div>
          </div>
        </div>

        {/* ─── Pinned Messages Panel ──────────────────────────── */}
        {showPinned && pinnedMessages.length > 0 && (
          <div className="border-b border-border bg-amber-50/50 dark:bg-amber-900/10 p-3 space-y-2">
            <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
              <Pin className="h-3 w-3" />
              {t.community?.pinnedMessages ||
                (isEn ? "Pinned Messages" : "Messages épinglés")}
            </p>
            {pinnedMessages.map((msg) => (
              <div
                key={msg.id}
                className="flex items-start gap-2 rounded-lg bg-card p-2.5 text-sm"
              >
                <span className="font-medium text-foreground shrink-0">
                  {msg.user?.name || "User"}:
                </span>
                <span className="text-muted-foreground">
                  {msg.content}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* ─── Messages Area ──────────────────────────────────── */}
        <div
          ref={chatContainerRef}
          className="flex-1 overflow-y-auto px-1 py-4 space-y-1"
          onScroll={handleScroll}
        >
          {loading ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              {activeChannel && (
                <ChannelIcon
                  type={activeChannel.type}
                  className="h-12 w-12 mb-3 opacity-30"
                />
              )}
              <p className="text-sm font-medium">
                {t.community?.noMessages ||
                  (isEn ? "No messages yet" : "Aucun message")}
              </p>
              <p className="text-xs mt-1">
                {canPost
                  ? t.community?.beFirst ||
                    (isEn
                      ? "Be the first to say hello!"
                      : "Soyez le premier à dire bonjour !")
                  : t.community?.announcementsEmpty ||
                    (isEn
                      ? "No announcements yet"
                      : "Aucune annonce pour le moment")}
              </p>
            </div>
          ) : (
            messages.map((msg, i) => {
              const isOwn = msg.user_id === user?.id;
              const isMsgAdmin = msg.user?.role === "admin";
              const showAvatar =
                i === 0 || messages[i - 1].user_id !== msg.user_id;

              return (
                <div
                  key={msg.id}
                  className={cn(
                    "group flex items-start gap-2.5 px-2 py-1 rounded-lg transition-colors hover:bg-muted",
                    msg.is_pinned &&
                      !msg.is_deleted &&
                      "bg-amber-50/40 dark:bg-amber-900/10"
                  )}
                >
                  {/* Avatar */}
                  <div className="w-8 shrink-0">
                    {showAvatar && (
                      <Avatar className="h-8 w-8">
                        <AvatarFallback
                          className={cn(
                            "text-[11px] font-semibold",
                            isMsgAdmin
                              ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                              : "bg-primary/10 text-primary"
                          )}
                        >
                          {getInitials(msg.user?.name || "")}
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>

                  {/* Body */}
                  <div className="flex-1 min-w-0">
                    {showAvatar && (
                      <div className="flex items-center gap-2 mb-0.5">
                        <span
                          className={cn(
                            "text-sm font-semibold",
                            isMsgAdmin
                              ? "text-red-600 dark:text-red-400"
                              : "text-foreground"
                          )}
                        >
                          {msg.user?.name || "User"}
                        </span>
                        {isMsgAdmin && (
                          <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-[10px] px-1.5 py-0">
                            Admin
                          </Badge>
                        )}
                        {msg.is_pinned && !msg.is_deleted && (
                          <Pin className="h-3 w-3 text-amber-500 dark:text-amber-400" />
                        )}
                        <span className="text-[11px] text-muted-foreground/80">
                          {formatTime(msg.created_at)}
                        </span>
                      </div>
                    )}

                    {msg.is_deleted ? (
                      <p className="text-sm italic text-muted-foreground/80">
                        {isEn
                          ? "This message was deleted"
                          : "Ce message a été supprimé"}
                      </p>
                    ) : (
                      <p className="text-sm text-foreground/85 whitespace-pre-wrap break-words">
                        {msg.content}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  {!msg.is_deleted && (
                    <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                            />
                          }
                        >
                          <MoreVertical className="h-3.5 w-3.5" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          {isAdmin && (
                            <>
                              <DropdownMenuItem
                                className="gap-2 text-xs"
                                onClick={() => togglePin(msg)}
                              >
                                <Pin className="h-3.5 w-3.5" />
                                {msg.is_pinned
                                  ? isEn
                                    ? "Unpin"
                                    : "Désépingler"
                                  : isEn
                                  ? "Pin message"
                                  : "Épingler"}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="gap-2 text-xs text-red-600"
                                onClick={() => deleteMessage(msg)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                {isEn ? "Delete" : "Supprimer"}
                              </DropdownMenuItem>
                            </>
                          )}
                          {isOwn && !isAdmin && (
                            <DropdownMenuItem
                              className="gap-2 text-xs text-red-600"
                              onClick={() => deleteMessage(msg)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              {isEn ? "Delete" : "Supprimer"}
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        {/* ─── Scroll to bottom ───────────────────────────────── */}
        {showScrollBtn && (
          <div className="relative">
            <button
              onClick={scrollToBottom}
              className="absolute -top-12 left-1/2 -translate-x-1/2 flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors"
            >
              <ChevronDown className="h-3.5 w-3.5" />
              {isEn ? "New messages" : "Nouveaux messages"}
            </button>
          </div>
        )}

        {/* ─── Input Area ─────────────────────────────────────── */}
        {canPost ? (
          <div className="border-t border-border px-4 pt-3 pb-2">
            {showEmoji && (
              <div className="flex gap-1 mb-2 flex-wrap">
                {QUICK_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => setInput((prev) => prev + emoji)}
                    className="h-9 w-9 rounded-lg text-lg hover:bg-muted transition-colors"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 shrink-0 text-muted-foreground"
                onClick={() => setShowEmoji(!showEmoji)}
              >
                <Smile className="h-4 w-4" />
              </Button>
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  isEn ? "Type a message..." : "Écrire un message..."
                }
                className="flex-1"
                maxLength={1000}
              />
              <Button
                size="icon"
                className="h-9 w-9 shrink-0"
                onClick={handleSend}
                disabled={!input.trim() || sending}
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="border-t border-border px-4 py-3">
            <p className="text-center text-sm text-muted-foreground">
              <Megaphone className="inline h-4 w-4 mr-1.5 -mt-0.5" />
              {t.community?.announcementsOnly ||
                (isEn
                  ? "Only admins can post in this channel"
                  : "Seuls les administrateurs peuvent publier ici")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

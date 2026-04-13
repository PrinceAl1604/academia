"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Send,
  Pin,
  Trash2,
  MoreVertical,
  Users,
  Smile,
  ChevronDown,
  Loader2,
  MessageSquare,
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

interface ChatMessage {
  id: string;
  user_id: string;
  content: string;
  is_pinned: boolean;
  is_deleted: boolean;
  created_at: string;
  user?: { name: string; role: string | null };
}

const MESSAGES_PER_PAGE = 50;

/* ─── Emoji Picker (lightweight) ──────────────────────────── */

const QUICK_EMOJIS = ["👍", "❤️", "😂", "🔥", "🎉", "💡", "👏", "🙏"];

/* ─── Main Component ──────────────────────────────────────── */

export default function CommunityPage() {
  const { user, isAdmin, userName } = useAuth();
  const { t, language } = useLanguage();
  const isEn = language === "en";

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [onlineCount, setOnlineCount] = useState(0);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [pinnedMessages, setPinnedMessages] = useState<ChatMessage[]>([]);
  const [showPinned, setShowPinned] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const isNearBottom = useRef(true);

  /* ─── Load initial messages ──────────────────────────────── */
  useEffect(() => {
    loadMessages();
  }, []);

  const loadMessages = async () => {
    const { data } = await supabase
      .from("chat_messages")
      .select("*, user:users(name, role)")
      .order("created_at", { ascending: true })
      .limit(MESSAGES_PER_PAGE);

    const msgs = (data as ChatMessage[]) || [];
    setMessages(msgs);
    setPinnedMessages(msgs.filter((m) => m.is_pinned && !m.is_deleted));
    setLoading(false);
    // Scroll to bottom on initial load
    setTimeout(() => bottomRef.current?.scrollIntoView(), 50);
  };

  /* ─── Realtime subscription ──────────────────────────────── */
  useEffect(() => {
    const channel = supabase
      .channel("chat_messages_realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages" },
        async (payload) => {
          // Fetch the full message with user info
          const { data } = await supabase
            .from("chat_messages")
            .select("*, user:users(name, role)")
            .eq("id", payload.new.id)
            .single();
          if (data) {
            setMessages((prev) => [...prev, data as ChatMessage]);
            if (isNearBottom.current) {
              setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
            }
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "chat_messages" },
        async (payload) => {
          const { data } = await supabase
            .from("chat_messages")
            .select("*, user:users(name, role)")
            .eq("id", payload.new.id)
            .single();
          if (data) {
            const updated = data as ChatMessage;
            setMessages((prev) =>
              prev.map((m) => (m.id === updated.id ? updated : m))
            );
            // Update pinned list
            setPinnedMessages((prev) => {
              const without = prev.filter((m) => m.id !== updated.id);
              if (updated.is_pinned && !updated.is_deleted) {
                return [...without, updated];
              }
              return without;
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  /* ─── Presence (online users) ────────────────────────────── */
  useEffect(() => {
    if (!user) return;

    const presence = supabase.channel("community_presence", {
      config: { presence: { key: user.id } },
    });

    presence
      .on("presence", { event: "sync" }, () => {
        const state = presence.presenceState();
        setOnlineCount(Object.keys(state).length);
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

  /* ─── Scroll tracking ────────────────────────────────────── */
  const handleScroll = useCallback(() => {
    const el = chatContainerRef.current;
    if (!el) return;
    const threshold = 150;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
    isNearBottom.current = atBottom;
    setShowScrollBtn(!atBottom);
  }, []);

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  /* ─── Send message ───────────────────────────────────────── */
  const handleSend = async () => {
    if (!input.trim() || !user || sending) return;
    const content = input.trim();
    setInput("");
    setSending(true);
    setShowEmoji(false);

    await supabase.from("chat_messages").insert({
      user_id: user.id,
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

  /* ─── Admin actions ──────────────────────────────────────── */
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

  const deleteSelfMessage = async (msg: ChatMessage) => {
    if (msg.user_id !== user?.id) return;
    await supabase
      .from("chat_messages")
      .update({ is_deleted: true })
      .eq("id", msg.id);
  };

  /* ─── Helpers ────────────────────────────────────────────── */
  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));

    const time = d.toLocaleTimeString(isEn ? "en-US" : "fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    });

    if (diffDays === 0) return time;
    if (diffDays === 1) return `${isEn ? "Yesterday" : "Hier"} ${time}`;
    return `${d.toLocaleDateString(isEn ? "en-US" : "fr-FR", { day: "numeric", month: "short" })} ${time}`;
  };

  const getInitials = (name: string) =>
    (name || "U")
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();

  /* ─── Render ─────────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="flex h-[calc(100vh-8rem)] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      {/* ─── Header ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-4 mb-0">
        <div>
          <h1 className="text-xl font-bold text-neutral-900 dark:text-white flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            {t.community?.title || "Community"}
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
            {t.community?.subtitle || "Chat with fellow students"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Pinned messages toggle */}
          {pinnedMessages.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-neutral-500"
              onClick={() => setShowPinned(!showPinned)}
            >
              <Pin className="h-3.5 w-3.5" />
              {pinnedMessages.length}
            </Button>
          )}
          {/* Online count */}
          <div className="flex items-center gap-1.5 rounded-full bg-green-50 dark:bg-green-900/20 px-3 py-1.5">
            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs font-medium text-green-700 dark:text-green-400">
              {onlineCount} {isEn ? "online" : "en ligne"}
            </span>
          </div>
        </div>
      </div>

      {/* ─── Pinned messages dropdown ───────────────────────── */}
      {showPinned && pinnedMessages.length > 0 && (
        <div className="border-b border-neutral-200 dark:border-neutral-800 bg-amber-50/50 dark:bg-amber-900/10 p-3 space-y-2">
          <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
            <Pin className="h-3 w-3" />
            {isEn ? "Pinned Messages" : "Messages épinglés"}
          </p>
          {pinnedMessages.map((msg) => (
            <div key={msg.id} className="flex items-start gap-2 rounded-lg bg-white dark:bg-neutral-900 p-2.5 text-sm">
              <span className="font-medium text-neutral-900 dark:text-white shrink-0">
                {msg.user?.name || "User"}:
              </span>
              <span className="text-neutral-600 dark:text-neutral-400">{msg.content}</span>
            </div>
          ))}
        </div>
      )}

      {/* ─── Messages ───────────────────────────────────────── */}
      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto px-1 py-4 space-y-1"
        onScroll={handleScroll}
      >
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-neutral-400 dark:text-neutral-500">
            <MessageSquare className="h-12 w-12 mb-3 opacity-30" />
            <p className="text-sm font-medium">{isEn ? "No messages yet" : "Aucun message"}</p>
            <p className="text-xs mt-1">{isEn ? "Be the first to say hello!" : "Soyez le premier à dire bonjour !"}</p>
          </div>
        )}

        {messages.map((msg, i) => {
          const isOwn = msg.user_id === user?.id;
          const isAdmin_ = msg.user?.role === "admin";
          const showAvatar =
            i === 0 || messages[i - 1].user_id !== msg.user_id;

          return (
            <div
              key={msg.id}
              className={cn(
                "group flex items-start gap-2.5 px-2 py-1 rounded-lg transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/30",
                msg.is_pinned && !msg.is_deleted && "bg-amber-50/40 dark:bg-amber-900/10"
              )}
            >
              {/* Avatar (only on first message of a cluster) */}
              <div className="w-8 shrink-0">
                {showAvatar && (
                  <Avatar className="h-8 w-8">
                    <AvatarFallback
                      className={cn(
                        "text-[11px] font-semibold",
                        isAdmin_
                          ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                          : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300"
                      )}
                    >
                      {getInitials(msg.user?.name || "")}
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>

              {/* Message body */}
              <div className="flex-1 min-w-0">
                {showAvatar && (
                  <div className="flex items-center gap-2 mb-0.5">
                    <span
                      className={cn(
                        "text-sm font-semibold",
                        isAdmin_
                          ? "text-red-600 dark:text-red-400"
                          : "text-neutral-900 dark:text-white"
                      )}
                    >
                      {msg.user?.name || "User"}
                    </span>
                    {isAdmin_ && (
                      <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-[10px] px-1.5 py-0">
                        Admin
                      </Badge>
                    )}
                    {msg.is_pinned && !msg.is_deleted && (
                      <Pin className="h-3 w-3 text-amber-500" />
                    )}
                    <span className="text-[11px] text-neutral-400 dark:text-neutral-500">
                      {formatTime(msg.created_at)}
                    </span>
                  </div>
                )}

                {msg.is_deleted ? (
                  <p className="text-sm italic text-neutral-400 dark:text-neutral-500">
                    {isEn ? "This message was deleted" : "Ce message a été supprimé"}
                  </p>
                ) : (
                  <p className="text-sm text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap break-words">
                    {msg.content}
                  </p>
                )}
              </div>

              {/* Actions (visible on hover) */}
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
                              ? isEn ? "Unpin" : "Désépingler"
                              : isEn ? "Pin message" : "Épingler"}
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
                          onClick={() => deleteSelfMessage(msg)}
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
        })}
        <div ref={bottomRef} />
      </div>

      {/* ─── Scroll to bottom button ────────────────────────── */}
      {showScrollBtn && (
        <div className="relative">
          <button
            onClick={scrollToBottom}
            className="absolute -top-12 left-1/2 -translate-x-1/2 flex items-center gap-1.5 rounded-full bg-neutral-900 dark:bg-white px-3 py-1.5 text-xs font-medium text-white dark:text-neutral-900 shadow-lg hover:opacity-90 transition-opacity"
          >
            <ChevronDown className="h-3.5 w-3.5" />
            {isEn ? "New messages" : "Nouveaux messages"}
          </button>
        </div>
      )}

      {/* ─── Input ──────────────────────────────────────────── */}
      <div className="border-t border-neutral-200 dark:border-neutral-800 pt-3 mt-0">
        {/* Emoji quick-pick */}
        {showEmoji && (
          <div className="flex gap-1 mb-2 flex-wrap">
            {QUICK_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => setInput((prev) => prev + emoji)}
                className="h-9 w-9 rounded-lg text-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
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
            className="h-9 w-9 shrink-0 text-neutral-400"
            onClick={() => setShowEmoji(!showEmoji)}
          >
            <Smile className="h-4 w-4" />
          </Button>
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isEn ? "Type a message..." : "Écrire un message..."}
            className="flex-1 dark:bg-neutral-800 dark:border-neutral-700"
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
    </div>
  );
}

"use client";

import {
  useState,
  useEffect,
  useLayoutEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Send,
  Pin,
  Trash2,
  Pencil,
  MoreVertical,
  Smile,
  SmilePlus,
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
import { ChatMarkdown } from "@/components/community/chat-markdown";

/* ─── Types ───────────────────────────────────────────────── */

interface Channel {
  id: string;
  type: "general" | "announcements" | "course";
  name: string;
  course_id: string | null;
  created_at: string;
}

interface ChatReaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
}

interface ChatMessage {
  id: string;
  user_id: string;
  channel_id: string;
  content: string;
  is_pinned: boolean;
  is_deleted: boolean;
  created_at: string;
  edited_at: string | null;
  user?: { name: string; role: string | null };
  reactions?: ChatReaction[];
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

/* ─── Reaction helpers ────────────────────────────────────── */

/**
 * Collapse a flat list of chat_reactions rows (one per user+emoji) into
 * one entry per emoji with { count, mine }. `mine` drives the "I already
 * reacted" highlight on the chip and tells the toggle handler whether a
 * click should add or remove.
 *
 * O(R) per message; R is tiny in practice so no memoization needed.
 */
function groupReactions(
  reactions: ChatReaction[],
  currentUserId: string | undefined
): Array<[string, { count: number; mine: boolean }]> {
  const map = new Map<string, { count: number; mine: boolean }>();
  for (const r of reactions) {
    const entry = map.get(r.emoji) ?? { count: 0, mine: false };
    entry.count += 1;
    if (r.user_id === currentUserId) entry.mine = true;
    map.set(r.emoji, entry);
  }
  return Array.from(map.entries());
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

  /* ─── Edit state ────────────────────────────────────────── */
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");

  /* ─── Mention state ─────────────────────────────────────── */
  // Full roster — loaded once, used as the typeahead source. Filtering
  // happens client-side: the list is small (tens to low hundreds) and this
  // avoids a DB round trip for every keystroke.
  const [mentionableUsers, setMentionableUsers] = useState<
    Array<{ id: string; name: string; role: string | null }>
  >([]);
  // Active typeahead query (the text after `@`). `null` = dropdown closed.
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionIndex, setMentionIndex] = useState(0);
  // Typeahead selections we made; used on send to resolve display names
  // back to stable user_ids (avoids server-side name lookup ambiguity).
  const [pendingMentions, setPendingMentions] = useState<
    Array<{ name: string; user_id: string }>
  >([]);
  const inputRef = useRef<HTMLInputElement>(null);

  /* ─── Pagination state ──────────────────────────────────── */
  const [hasMore, setHasMore] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  // Captured right before we prepend older messages so useLayoutEffect
  // can restore the user's visual scroll position after the DOM grows.
  const prependAnchorRef = useRef<{
    scrollHeight: number;
    scrollTop: number;
  } | null>(null);

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
    // Reset pagination state for the new channel
    setHasMore(true);
    setLoadingOlder(false);
    prependAnchorRef.current = null;

    // Fetch the NEWEST page (descending), then reverse for chronological display.
    // The old ascending+limit query returned the oldest messages in the channel,
    // which is wrong once a channel has more than MESSAGES_PER_PAGE rows.
    const { data } = await supabase
      .from("chat_messages")
      .select("*, user:users(name, role), reactions:chat_reactions(id, message_id, user_id, emoji)")
      .eq("channel_id", channelId)
      .order("created_at", { ascending: false })
      .limit(MESSAGES_PER_PAGE);

    const msgs = ((data as ChatMessage[]) || []).reverse();
    setMessages(msgs);
    setPinnedMessages(msgs.filter((m) => m.is_pinned && !m.is_deleted));
    // If we got fewer than a full page, there's nothing older to load
    if (msgs.length < MESSAGES_PER_PAGE) setHasMore(false);
    setLoading(false);
    setTimeout(() => bottomRef.current?.scrollIntoView(), 50);
  }, []);

  /* ─── Load older messages (prepend) ─────────────────────── */
  const loadOlderMessages = useCallback(async () => {
    // Guard: already fetching, exhausted, or empty list (nothing to page back from)
    if (loadingOlder || !hasMore || messages.length === 0) return;

    const el = chatContainerRef.current;
    if (!el) return;

    // Save the scroll anchor BEFORE the fetch starts so we can restore it
    // after React re-renders with the prepended rows.
    prependAnchorRef.current = {
      scrollHeight: el.scrollHeight,
      scrollTop: el.scrollTop,
    };

    setLoadingOlder(true);

    const oldestMsg = messages[0];
    const { data } = await supabase
      .from("chat_messages")
      .select("*, user:users(name, role), reactions:chat_reactions(id, message_id, user_id, emoji)")
      .eq("channel_id", activeChannelRef.current)
      .lt("created_at", oldestMsg.created_at)
      .order("created_at", { ascending: false })
      .limit(MESSAGES_PER_PAGE);

    const older = ((data as ChatMessage[]) || []).reverse();

    if (older.length < MESSAGES_PER_PAGE) setHasMore(false);

    if (older.length > 0) {
      setMessages((prev) => [...older, ...prev]);
      // Merge any newly-discovered pinned messages into the pinned panel
      const newlyPinned = older.filter((m) => m.is_pinned && !m.is_deleted);
      if (newlyPinned.length > 0) {
        setPinnedMessages((prev) => [...newlyPinned, ...prev]);
      }
    } else {
      // No new rows — clear the anchor so useLayoutEffect doesn't run a no-op
      prependAnchorRef.current = null;
    }

    setLoadingOlder(false);
  }, [loadingOlder, hasMore, messages]);

  /* ─── Restore scroll position after prepending older messages ─── */
  useLayoutEffect(() => {
    if (!prependAnchorRef.current || !chatContainerRef.current) return;
    const el = chatContainerRef.current;
    const { scrollHeight: oldH, scrollTop: oldT } = prependAnchorRef.current;
    // New content added above → keep the user's viewport anchored to the
    // same message by compensating for the height difference.
    el.scrollTop = el.scrollHeight - oldH + oldT;
    prependAnchorRef.current = null;
  }, [messages]);

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
            .select("*, user:users(name, role), reactions:chat_reactions(id, message_id, user_id, emoji)")
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
            .select("*, user:users(name, role), reactions:chat_reactions(id, message_id, user_id, emoji)")
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
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_reactions" },
        (payload) => {
          const reaction = payload.new as ChatReaction;
          setMessages((prev) => {
            const idx = prev.findIndex((m) => m.id === reaction.message_id);
            if (idx === -1) return prev; // message not in the loaded window
            // Skip if we already have this reaction (e.g. optimistic client
            // inserted it before the realtime echo arrives).
            const existing = prev[idx].reactions ?? [];
            if (existing.some((r) => r.id === reaction.id)) return prev;
            const next = [...prev];
            next[idx] = {
              ...next[idx],
              reactions: [...existing, reaction],
            };
            return next;
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "chat_reactions" },
        (payload) => {
          // REPLICA IDENTITY FULL guarantees the full row is in `old`
          const deleted = payload.old as ChatReaction;
          setMessages((prev) => {
            const idx = prev.findIndex((m) => m.id === deleted.message_id);
            if (idx === -1) return prev;
            const next = [...prev];
            next[idx] = {
              ...next[idx],
              reactions: (next[idx].reactions ?? []).filter(
                (r) => r.id !== deleted.id
              ),
            };
            return next;
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

  /* ─── Mention roster ────────────────────────────────────── */
  // One fetch per mount. If the platform grows past a few hundred users,
  // swap this for a server-side ILIKE search triggered by the query.
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("users")
        .select("id, name, role")
        .order("name", { ascending: true });
      setMentionableUsers(
        (data ?? []) as Array<{ id: string; name: string; role: string | null }>
      );
    })();
  }, [user]);

  /* ─── Typeahead match list (derived) ─────────────────────── */
  const mentionMatches = useMemo(() => {
    if (mentionQuery === null) return [];
    const q = mentionQuery.toLowerCase();
    return mentionableUsers
      .filter(
        (u) =>
          u.id !== user?.id && // can't mention yourself
          (q === "" || u.name.toLowerCase().includes(q))
      )
      .slice(0, 8);
  }, [mentionQuery, mentionableUsers, user]);

  // Clamp the highlighted index whenever the filtered list shrinks beneath
  // the current cursor (otherwise Arrow+Enter could select a stale row).
  useEffect(() => {
    if (mentionIndex >= mentionMatches.length) setMentionIndex(0);
  }, [mentionMatches.length, mentionIndex]);

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

    // Trigger loading older messages when the user scrolls near the top.
    // 200px threshold: begins the fetch *before* the user hits the edge so
    // the next batch is usually ready by the time they arrive. Feels smoother
    // than triggering at 0 (spinner pops in under their thumb).
    if (el.scrollTop < 200 && !loadingOlder && hasMore) {
      loadOlderMessages();
    }
  }, [loadingOlder, hasMore, loadOlderMessages]);

  const scrollToBottom = () =>
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });

  const switchChannel = (channelId: string) => {
    if (channelId === activeChannelId) return;
    setActiveChannelId(channelId);
    setShowPinned(false);
    setShowEmoji(false);
    setInput("");
    // Abandon any in-progress edit when switching channels
    setEditingId(null);
    setEditDraft("");
    // Drop any pending typeahead state so the next channel starts clean
    setMentionQuery(null);
    setPendingMentions([]);
  };

  /**
   * Detect whether the caret is inside an active @-mention token.
   * An @-token opens when `@` is at start-of-line or preceded by whitespace
   * and closes on whitespace or another `@`. Returns the query string
   * (text after `@` up to the caret) or null when not in a token.
   */
  const detectMentionQuery = (value: string, caret: number): string | null => {
    const before = value.slice(0, caret);
    const m = /@([^\s@]*)$/.exec(before);
    if (!m) return null;
    // The char directly before `@` must be whitespace or start-of-string —
    // otherwise `foo@bar` email-like tokens would trigger the picker.
    const charBeforeAt = before[m.index - 1];
    if (charBeforeAt !== undefined && !/\s/.test(charBeforeAt)) return null;
    return m[1];
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = e.target.value;
    setInput(value);
    const caret = e.target.selectionStart ?? value.length;
    setMentionQuery(detectMentionQuery(value, caret));
  };

  /**
   * Replace the active @-query with the selected user's name and record the
   * resolution in pendingMentions so handleSend can create chat_mentions
   * rows with the correct user_id (avoids display-name collisions).
   */
  const applyMention = (u: { id: string; name: string }) => {
    const el = inputRef.current;
    if (!el) return;
    const caret = el.selectionStart ?? input.length;
    const before = input.slice(0, caret);
    const after = input.slice(caret);
    const m = /@([^\s@]*)$/.exec(before);
    if (!m) return;
    const atStart = m.index;
    const replacement = `@${u.name} `;
    const nextInput = before.slice(0, atStart) + replacement + after;
    const nextCaret = atStart + replacement.length;

    setInput(nextInput);
    setPendingMentions((prev) =>
      prev.some((p) => p.user_id === u.id)
        ? prev
        : [...prev, { name: u.name, user_id: u.id }]
    );
    setMentionQuery(null);

    // React re-renders before the caret can be set on the new value, so
    // defer to rAF. Also refocus in case the user clicked a match (blur'd
    // the input momentarily).
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(nextCaret, nextCaret);
    });
  };

  const handleSend = async () => {
    if (!input.trim() || !user || sending || !canPost) return;
    const content = input.trim();
    setInput("");
    setSending(true);
    setShowEmoji(false);
    setMentionQuery(null);

    // Keep only typeahead-resolved mentions whose `@Name` token still
    // appears in the final content. Covers the case where the user inserts
    // then deletes a mention before sending.
    const activeMentions = pendingMentions.filter((m) => {
      const escaped = m.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      // Whole-token match: preceded by start/whitespace, followed by end/
      // whitespace/punctuation. Prevents `@Alex` from matching `@Alexander`.
      const re = new RegExp(
        `(^|\\s)@${escaped}(?=\\s|$|[.,!?;:)])`
      );
      return re.test(content);
    });

    const { data: inserted } = await supabase
      .from("chat_messages")
      .insert({
        user_id: user.id,
        channel_id: activeChannelId,
        content,
      })
      .select("id")
      .single();

    if (inserted?.id && activeMentions.length > 0) {
      // Dedupe by user_id: someone mentioned twice in the same message
      // should only produce one notification row.
      const seen = new Set<string>();
      const rows = activeMentions
        .filter((m) => {
          if (seen.has(m.user_id)) return false;
          seen.add(m.user_id);
          return true;
        })
        .map((m) => ({
          message_id: inserted.id as string,
          mentioned_user_id: m.user_id,
          channel_id: activeChannelId,
        }));
      // Fire-and-forget: mention rows failing shouldn't block the message
      // itself, which is already persisted.
      supabase.from("chat_mentions").insert(rows);
    }

    setPendingMentions([]);
    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Typeahead keyboard navigation takes priority over message send
    if (mentionQuery !== null && mentionMatches.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setMentionIndex((i) => (i + 1) % mentionMatches.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setMentionIndex(
          (i) => (i - 1 + mentionMatches.length) % mentionMatches.length
        );
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        applyMention(mentionMatches[mentionIndex]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setMentionQuery(null);
        return;
      }
    }
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

  const startEdit = (msg: ChatMessage) => {
    setEditingId(msg.id);
    setEditDraft(msg.content);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditDraft("");
  };

  const saveEdit = async (msg: ChatMessage) => {
    const trimmed = editDraft.trim();
    // Empty or unchanged → silently cancel; avoids saving a no-op that would
    // mark a message "(edited)" for no reason.
    if (!trimmed || trimmed === msg.content) {
      cancelEdit();
      return;
    }
    await supabase
      .from("chat_messages")
      .update({ content: trimmed, edited_at: new Date().toISOString() })
      .eq("id", msg.id);
    cancelEdit();
  };

  const handleEditKeyDown = (e: React.KeyboardEvent, msg: ChatMessage) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      saveEdit(msg);
    } else if (e.key === "Escape") {
      e.preventDefault();
      cancelEdit();
    }
  };

  /* ─── Reactions ──────────────────────────────────────────── */
  const toggleReaction = async (msg: ChatMessage, emoji: string) => {
    if (!user) return;
    // Is the current user already reacting with this emoji?
    const existing = (msg.reactions ?? []).find(
      (r) => r.user_id === user.id && r.emoji === emoji
    );
    if (existing) {
      // Optimistic remove — realtime DELETE event will be a no-op
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msg.id
            ? {
                ...m,
                reactions: (m.reactions ?? []).filter(
                  (r) => r.id !== existing.id
                ),
              }
            : m
        )
      );
      await supabase
        .from("chat_reactions")
        .delete()
        .eq("id", existing.id);
    } else {
      // Let the DB assign the id; let realtime INSERT echo patch state
      await supabase.from("chat_reactions").insert({
        message_id: msg.id,
        user_id: user.id,
        emoji,
      });
    }
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
          "shrink-0 flex-col border-r border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50 transition-[width,opacity] duration-200 overflow-hidden",
          showSidebar
            ? "w-56 opacity-100 flex"
            : "w-0 opacity-0 hidden md:flex md:w-0"
        )}
      >
        {/* Sidebar header */}
        <div className="flex items-center justify-between px-3 py-3 border-b border-neutral-200 dark:border-neutral-800">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
            {t.community?.channels || "Channels"}
          </h2>
          <div className="flex items-center gap-1.5 rounded-full bg-green-50 dark:bg-green-900/20 px-2 py-0.5">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[10px] font-medium text-green-700 dark:text-green-400">
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
                    ? "bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-sm"
                    : "text-neutral-600 dark:text-neutral-400 hover:bg-white/60 dark:hover:bg-neutral-800/40"
                )}
              >
                <ChannelIcon
                  type={ch.type}
                  className={cn(
                    "h-4 w-4 shrink-0",
                    ch.type === "announcements"
                      ? "text-amber-500"
                      : "text-neutral-400 dark:text-neutral-500"
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
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-green-600 text-[10px] font-bold text-white px-1">
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
                <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
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
                        ? "bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-sm"
                        : "text-neutral-600 dark:text-neutral-400 hover:bg-white/60 dark:hover:bg-neutral-800/40"
                    )}
                  >
                    <BookOpen
                      className={cn(
                        "h-4 w-4 shrink-0",
                        isActive
                          ? "text-green-600 dark:text-green-400"
                          : "text-neutral-400 dark:text-neutral-500"
                      )}
                    />
                    <span className="flex-1 text-sm font-medium truncate">
                      {ch.name}
                    </span>
                    {unread > 0 && (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-green-600 text-[10px] font-bold text-white px-1">
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
        <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 px-4 py-3">
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Toggle sidebar */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 text-neutral-400"
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
                      ? "text-amber-500"
                      : "text-neutral-500 dark:text-neutral-400"
                  )}
                />
                <div className="min-w-0">
                  <h1 className="text-sm font-bold text-neutral-900 dark:text-white truncate">
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
                    <p className="text-[11px] text-neutral-400 dark:text-neutral-500">
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
                className="gap-1.5 text-neutral-500 h-8"
                onClick={() => setShowPinned(!showPinned)}
              >
                <Pin className="h-3.5 w-3.5" />
                {pinnedMessages.length}
              </Button>
            )}

            {/* Online indicator (mobile-friendly) */}
            <div className="flex items-center gap-1.5 rounded-full bg-green-50 dark:bg-green-900/20 px-2.5 py-1">
              <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs font-medium text-green-700 dark:text-green-400">
                {onlineCount} {isEn ? "online" : "en ligne"}
              </span>
            </div>
          </div>
        </div>

        {/* ─── Pinned Messages Panel ──────────────────────────── */}
        {showPinned && pinnedMessages.length > 0 && (
          <div className="border-b border-neutral-200 dark:border-neutral-800 bg-amber-50/50 dark:bg-amber-900/10 p-3 space-y-2">
            <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
              <Pin className="h-3 w-3" />
              {t.community?.pinnedMessages ||
                (isEn ? "Pinned Messages" : "Messages épinglés")}
            </p>
            {pinnedMessages.map((msg) => (
              <div
                key={msg.id}
                className="flex items-start gap-2 rounded-lg bg-white dark:bg-neutral-900 p-2.5 text-sm"
              >
                <span className="font-medium text-neutral-900 dark:text-white shrink-0">
                  {msg.user?.name || "User"}:
                </span>
                <div className="min-w-0 text-neutral-600 dark:text-neutral-400">
                  <ChatMarkdown content={msg.content} />
                </div>
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
              <Loader2 className="h-5 w-5 animate-spin text-neutral-400" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-neutral-400 dark:text-neutral-500">
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
            <>
              {/* Top-of-history indicators */}
              {loadingOlder && (
                <div className="flex items-center justify-center py-2">
                  <Loader2 className="h-4 w-4 animate-spin text-neutral-400" />
                </div>
              )}
              {!hasMore && !loadingOlder && (
                <div className="flex items-center justify-center py-3 text-[11px] text-neutral-400 dark:text-neutral-500">
                  <span className="px-3">
                    {isEn
                      ? "Beginning of conversation"
                      : "Début de la conversation"}
                  </span>
                </div>
              )}
              {messages.map((msg, i) => {
              const isOwn = msg.user_id === user?.id;
              const isMsgAdmin = msg.user?.role === "admin";
              const showAvatar =
                i === 0 || messages[i - 1].user_id !== msg.user_id;

              return (
                <div
                  key={msg.id}
                  className={cn(
                    "group flex items-start gap-2.5 px-2 py-1 rounded-lg transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/30",
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
                              : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300"
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
                              : "text-neutral-900 dark:text-white"
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
                          <Pin className="h-3 w-3 text-amber-500" />
                        )}
                        <span className="text-[11px] text-neutral-400 dark:text-neutral-500">
                          {formatTime(msg.created_at)}
                        </span>
                      </div>
                    )}

                    {msg.is_deleted ? (
                      <p className="text-sm italic text-neutral-400 dark:text-neutral-500">
                        {isEn
                          ? "This message was deleted"
                          : "Ce message a été supprimé"}
                      </p>
                    ) : editingId === msg.id ? (
                      <div className="flex flex-col gap-1.5 mt-1">
                        <textarea
                          autoFocus
                          value={editDraft}
                          onChange={(e) => setEditDraft(e.target.value)}
                          onKeyDown={(e) => handleEditKeyDown(e, msg)}
                          rows={Math.min(
                            6,
                            Math.max(2, editDraft.split("\n").length)
                          )}
                          maxLength={1000}
                          className="w-full rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2.5 py-1.5 text-sm text-neutral-700 dark:text-neutral-200 resize-none focus:outline-none focus:ring-2 focus:ring-green-500/40 focus:border-green-500/40"
                        />
                        <div className="flex items-center gap-2 text-[11px]">
                          <Button
                            size="sm"
                            className="h-7 px-3 text-xs"
                            onClick={() => saveEdit(msg)}
                            disabled={!editDraft.trim()}
                          >
                            {isEn ? "Save" : "Enregistrer"}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-3 text-xs"
                            onClick={cancelEdit}
                          >
                            {isEn ? "Cancel" : "Annuler"}
                          </Button>
                          <span className="text-neutral-400 dark:text-neutral-500">
                            {isEn
                              ? "Enter to save · Shift+Enter for newline · Esc to cancel"
                              : "Entrée pour enregistrer · Maj+Entrée pour nouvelle ligne · Échap pour annuler"}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-neutral-700 dark:text-neutral-300">
                        <ChatMarkdown content={msg.content} />
                        {msg.edited_at && (
                          <span
                            className="ml-1.5 text-[10px] text-neutral-400 dark:text-neutral-500"
                            title={new Date(msg.edited_at).toLocaleString(
                              isEn ? "en-US" : "fr-FR"
                            )}
                          >
                            ({isEn ? "edited" : "modifié"})
                          </span>
                        )}
                      </div>
                    )}

                    {/* Reaction chips — hidden while editing or for tombstones */}
                    {!msg.is_deleted &&
                      editingId !== msg.id &&
                      (msg.reactions?.length ?? 0) > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {groupReactions(msg.reactions ?? [], user?.id).map(
                            ([emoji, { count, mine }]) => (
                              <button
                                key={emoji}
                                onClick={() => toggleReaction(msg, emoji)}
                                className={cn(
                                  "flex items-center gap-1 rounded-full px-2 py-0.5 text-xs transition-colors border",
                                  mine
                                    ? "bg-green-50 dark:bg-green-900/20 border-green-400 dark:border-green-700 text-green-700 dark:text-green-400"
                                    : "bg-neutral-100 dark:bg-neutral-800 border-transparent text-neutral-600 dark:text-neutral-400 hover:border-neutral-300 dark:hover:border-neutral-700"
                                )}
                                aria-label={
                                  mine
                                    ? isEn
                                      ? `Remove ${emoji} reaction`
                                      : `Retirer la réaction ${emoji}`
                                    : isEn
                                    ? `React with ${emoji}`
                                    : `Réagir avec ${emoji}`
                                }
                              >
                                <span>{emoji}</span>
                                <span className="font-medium tabular-nums">
                                  {count}
                                </span>
                              </button>
                            )
                          )}
                        </div>
                      )}
                  </div>

                  {/* Actions */}
                  {!msg.is_deleted && editingId !== msg.id && (
                    <div className="shrink-0 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      {/* Quick reaction picker */}
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
                          <SmilePlus className="h-3.5 w-3.5" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="p-1">
                          <div className="flex gap-0.5">
                            {QUICK_EMOJIS.map((emoji) => (
                              <DropdownMenuItem
                                key={emoji}
                                onClick={() => toggleReaction(msg, emoji)}
                                className="h-8 w-8 p-0 flex items-center justify-center text-base cursor-pointer rounded-md"
                              >
                                {emoji}
                              </DropdownMenuItem>
                            ))}
                          </div>
                        </DropdownMenuContent>
                      </DropdownMenu>

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
                          {/* Edit — only the author can edit (admins don't
                              edit others' messages; that's a moderation
                              anti-pattern) */}
                          {isOwn && (
                            <DropdownMenuItem
                              className="gap-2 text-xs"
                              onClick={() => startEdit(msg)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              {isEn ? "Edit" : "Modifier"}
                            </DropdownMenuItem>
                          )}
                          {/* Pin — admins only */}
                          {isAdmin && (
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
                          )}
                          {/* Delete — admin on any, user on own */}
                          {(isAdmin || isOwn) && (
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
            })}
            </>
          )}
          <div ref={bottomRef} />
        </div>

        {/* ─── Scroll to bottom ───────────────────────────────── */}
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

        {/* ─── Input Area ─────────────────────────────────────── */}
        {canPost ? (
          <div className="relative border-t border-neutral-200 dark:border-neutral-800 px-4 pt-3 pb-2">
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

            {/* Mention typeahead — floats above the input row, anchored to
                the composer's left gutter. Arrow keys cycle, Enter/Tab
                inserts, Escape dismisses. */}
            {mentionQuery !== null && mentionMatches.length > 0 && (
              <div className="absolute bottom-full left-4 right-4 mb-1 z-10 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-lg overflow-hidden max-h-60 overflow-y-auto">
                <div className="px-2 py-1.5 border-b border-neutral-100 dark:border-neutral-800 text-[10px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                  {isEn ? "Mention someone" : "Mentionner quelqu'un"}
                </div>
                {mentionMatches.map((u, i) => (
                  <button
                    key={u.id}
                    onMouseDown={(e) => {
                      // onMouseDown (not onClick) so we fire before the input
                      // blur — otherwise the blur closes the dropdown first.
                      e.preventDefault();
                      applyMention(u);
                    }}
                    onMouseEnter={() => setMentionIndex(i)}
                    className={cn(
                      "w-full flex items-center gap-2 px-2.5 py-1.5 text-left text-sm transition-colors",
                      i === mentionIndex
                        ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400"
                        : "text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
                    )}
                  >
                    <Avatar className="h-6 w-6">
                      <AvatarFallback
                        className={cn(
                          "text-[10px] font-semibold",
                          u.role === "admin"
                            ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                            : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300"
                        )}
                      >
                        {getInitials(u.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="flex-1 truncate">{u.name}</span>
                    {u.role === "admin" && (
                      <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-[9px] px-1.5 py-0">
                        Admin
                      </Badge>
                    )}
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
                ref={inputRef}
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder={
                  isEn
                    ? "Type a message... (@ to mention)"
                    : "Écrire un message... (@ pour mentionner)"
                }
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
        ) : (
          <div className="border-t border-neutral-200 dark:border-neutral-800 px-4 py-3">
            <p className="text-center text-sm text-neutral-400 dark:text-neutral-500">
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

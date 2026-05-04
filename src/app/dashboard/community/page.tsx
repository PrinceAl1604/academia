"use client";

import {
  Fragment,
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
  Bell,
  AtSign,
  CheckCheck,
  Reply,
  MessageSquare,
  CornerDownRight,
  X,
  Plus,
  Search as SearchIcon,
  Crown,
  BellOff,
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
import { Illustration } from "@/components/shared/illustration";
import {
  LinkPreview,
  extractFirstUrl,
} from "@/components/community/link-preview";

/* ─── Types ───────────────────────────────────────────────── */

interface Channel {
  id: string;
  type: "general" | "announcements" | "course" | "direct";
  name: string;
  course_id: string | null;
  created_at: string;
}

/* ─── DM thread row (sidebar) ─────────────────────────────────
 * Joins a direct-type chat_channel with the OTHER participant's
 * user info — that's what we render in the DM list. The current
 * user's own participant row is filtered out client-side.
 */
interface DmThread {
  channel_id: string;
  other_user_id: string;
  other_name: string;
  other_role: string | null;
  // Most-recent message timestamp drives sort order (most recent first).
  // null when the thread has no messages yet — sort to the top under
  // "active" threads via a 1970 fallback.
  last_message_at: string | null;
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
  // Thread root ref. NULL = top-level message, non-null = reply.
  parent_message_id: string | null;
  user?: { name: string; role: string | null };
  reactions?: ChatReaction[];
  // PostgREST embedded-count aggregate. Returned as `[{ count: N }]`;
  // normalizeReplyCount() hoists the number onto `reply_count` for the
  // rest of the code to read directly.
  replies?: Array<{ count: number }>;
  reply_count?: number;
}

// ChatMention interface previously powered the in-community @-bell
// dropdown — both the surface and this type are now gone. The chat
// composer's @-typeahead operates on a simpler local shape and
// inserts directly into chat_mentions without needing a TS interface.


/* ─── Constants ───────────────────────────────────────────── */

const GENERAL_CHANNEL_ID = "00000000-0000-0000-0000-000000000001";
const MESSAGES_PER_PAGE = 50;
const QUICK_EMOJIS = ["👍", "❤️", "😂", "🔥", "🎉", "💡", "👏", "🙏"];

/* ─── Avatar color hashing ────────────────────────────────
 * Deterministic palette pick per user id. A monochrome wall of
 * "first letter on grey" was the previous look — fine for chat
 * mechanics, mute on identity. Hashing the id into one of N
 * tinted backgrounds gives instant visual recognition ("ah, the
 * teal one is replying again") without uploading photos.
 *
 * Admins still override with the red "admin" tint downstream —
 * authority signal beats per-user differentiation. */
const AVATAR_TINTS = [
  "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  "bg-violet-500/15 text-violet-700 dark:text-violet-300",
  "bg-rose-500/15 text-rose-700 dark:text-rose-300",
  "bg-teal-500/15 text-teal-700 dark:text-teal-300",
  "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300",
  "bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-300",
];

function userTintClass(id?: string | null): string {
  if (!id) return AVATAR_TINTS[0];
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0;
  }
  return AVATAR_TINTS[Math.abs(hash) % AVATAR_TINTS.length];
}

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

/**
 * Flatten PostgREST's `replies:chat_messages!parent_message_id(count)`
 * embed — which comes back as `[{ count: 3 }]` — into a plain `reply_count`
 * field. We do this once at the data-fetching boundary so the rest of the
 * render code can just read `msg.reply_count` without remembering the
 * shape of the aggregate response.
 *
 * For single-row fetches (realtime hydrations) the embed isn't used, so
 * reply_count stays undefined — treat that as "unknown, render no chip"
 * in the UI.
 */
function normalizeReplyCount(msg: ChatMessage): ChatMessage {
  if (msg.replies && msg.replies.length > 0) {
    return { ...msg, reply_count: msg.replies[0].count };
  }
  return msg;
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
  const { user, isAdmin, isPro, userName } = useAuth();
  const { t, language } = useLanguage();
  const isEn = language === "en";

  /* ─── Channel state ─────────────────────────────────────── */
  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeChannelId, setActiveChannelId] = useState(GENERAL_CHANNEL_ID);
  const [unreadCounts, setUnreadCounts] = useState<Map<string, number>>(
    new Map()
  );
  const [showSidebar, setShowSidebar] = useState(true);

  /* ─── Direct messages state ─────────────────────────────────
   * dmThreads is a sidebar-list view of the current user's DM
   * channels — joined with the OTHER participant's name/role so
   * each row can render an avatar + display name. Refreshed on
   * page mount + when realtime fires for new participation rows
   * (e.g. someone DMs you for the first time). */
  const [dmThreads, setDmThreads] = useState<DmThread[]>([]);
  const [composeMode, setComposeMode] = useState(false);
  const [dmSearchQuery, setDmSearchQuery] = useState("");
  const [dmSearchResults, setDmSearchResults] = useState<
    Array<{ id: string; name: string; email: string; role: string | null; subscription_tier: string }>
  >([]);
  const [startingDm, setStartingDm] = useState(false);
  const [dmError, setDmError] = useState<string | null>(null);

  /* ─── Chat state ────────────────────────────────────────── */
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<{ id: string; name: string }[]>([]);
  const onlineCount = onlineUsers.length;
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

  /* ─── Thread state ──────────────────────────────────────── */
  // Which thread parents are currently expanded in the UI. Kept as a Set
  // for O(1) toggle; a Map<id, boolean> would be equivalent but noisier.
  const [expandedThreads, setExpandedThreads] = useState<Set<string>>(
    new Set()
  );
  // Cached replies per parent. Populated on first expand; updated by the
  // realtime INSERT handler so open threads stay live without a re-fetch.
  const [threadReplies, setThreadReplies] = useState<
    Map<string, ChatMessage[]>
  >(new Map());
  // Tracks an in-flight fetch per parent so rapid toggle-spamming doesn't
  // kick off duplicate requests.
  const loadingThreadsRef = useRef<Set<string>>(new Set());
  // The parent whose reply composer is currently open. Only one active
  // reply draft at a time — keeps the UI tidy and state minimal.
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyDraft, setReplyDraft] = useState("");
  const [replySending, setReplySending] = useState(false);
  // Parallel mention state for the reply composer. We don't share with the
  // main composer because both can be open simultaneously (reply open while
  // user edits main input).
  const [replyMentionQuery, setReplyMentionQuery] = useState<string | null>(
    null
  );
  const [replyMentionIndex, setReplyMentionIndex] = useState(0);
  const [replyPendingMentions, setReplyPendingMentions] = useState<
    Array<{ name: string; user_id: string }>
  >([]);
  const replyInputRef = useRef<HTMLInputElement>(null);

  // unreadMentions state removed alongside the in-community @-bell.
  // Mentions are now surfaced exclusively through the topbar
  // notifications bell.

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

  // Public channels rendered in the top "/ Channels" sidebar group.
  // Excludes course channels (own group below) AND direct channels
  // (own "/ Direct messages" group, rendered with avatars not hashes).
  const coreChannels = useMemo(
    () => channels.filter((c) => c.type !== "course" && c.type !== "direct"),
    [channels]
  );
  const courseChannels = useMemo(
    () => channels.filter((c) => c.type === "course"),
    [channels]
  );
  // Free users can't initiate DMs but they can RECEIVE from admin —
  // so we still show the section to everyone, just gate the "+ New"
  // button behind Pro/admin status.
  const canStartDm = isAdmin || isPro;

  /* ─── Per-channel mute state ────────────────────────────────
   * Tracks which channels the current user has muted. Read once
   * on mount + kept live by realtime. Used to (a) render a muted
   * indicator on the sidebar row and (b) drive the mute/unmute
   * toggle action. The chat_mention + announcement triggers honor
   * this server-side too — muted channels never create notifs. */
  const [mutedChannels, setMutedChannels] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("chat_channel_mutes")
        .select("channel_id")
        .eq("user_id", user.id);
      setMutedChannels(
        new Set((data ?? []).map((r: { channel_id: string }) => r.channel_id))
      );
    })();
  }, [user?.id]);

  const toggleChannelMute = useCallback(
    async (channelId: string) => {
      if (!user) return;
      const isMuted = mutedChannels.has(channelId);
      // Optimistic update so the icon flips instantly
      setMutedChannels((prev) => {
        const next = new Set(prev);
        if (isMuted) next.delete(channelId);
        else next.add(channelId);
        return next;
      });
      if (isMuted) {
        await supabase
          .from("chat_channel_mutes")
          .delete()
          .eq("user_id", user.id)
          .eq("channel_id", channelId);
      } else {
        await supabase.from("chat_channel_mutes").insert({
          user_id: user.id,
          channel_id: channelId,
        });
      }
    },
    [user, mutedChannels]
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

  /* ─── Load DM threads ───────────────────────────────────────
   * For every direct channel the user participates in, fetch the
   * OTHER participant's profile + the channel's last-message
   * timestamp. RLS already gates which channels we can see, so we
   * don't need a redundant participation filter here. */
  const loadDmThreads = useCallback(async () => {
    if (!user) return;

    // 1. Get the channel IDs of DMs we're in (via channels state —
    //    already RLS-filtered for us).
    const dmChannelIds = channels
      .filter((c) => c.type === "direct")
      .map((c) => c.id);
    if (dmChannelIds.length === 0) {
      setDmThreads([]);
      return;
    }

    // 2. Pull all participant rows for those channels — RLS lets us
    //    see them because we're in the channel. Then filter to "the
    //    other person" client-side.
    const { data: participants } = await supabase
      .from("chat_dm_participants")
      .select("channel_id, user_id, user:users(id, name, role)")
      .in("channel_id", dmChannelIds)
      .neq("user_id", user.id);

    // 3. Pull the most recent message per channel for sort ordering.
    //    Fetch a flat list and reduce client-side; the volume per
    //    user is small (DMs are 1:1, list won't have hundreds).
    const { data: lastMsgs } = await supabase
      .from("chat_messages")
      .select("channel_id, created_at")
      .in("channel_id", dmChannelIds)
      .order("created_at", { ascending: false });

    const lastByChannel = new Map<string, string>();
    (lastMsgs ?? []).forEach((m: { channel_id: string; created_at: string }) => {
      if (!lastByChannel.has(m.channel_id)) {
        lastByChannel.set(m.channel_id, m.created_at);
      }
    });

    // Supabase's generated types model FK joins as arrays even when
    // it's effectively 1:1 (no !inner hint here). Cast through
    // unknown so we can read .user as a single object — at runtime
    // the nested embed is always one row per participant join.
    const threads: DmThread[] = (participants ?? []).map((row) => {
      const r = row as unknown as {
        channel_id: string;
        user_id: string;
        user: { id: string; name: string; role: string | null };
      };
      return {
        channel_id: r.channel_id,
        other_user_id: r.user.id,
        other_name: r.user.name,
        other_role: r.user.role,
        last_message_at: lastByChannel.get(r.channel_id) ?? null,
      };
    });
    // Sort by recency (admin pinned at top would be nice; skipped
    // for v1 — admin appears wherever last activity puts them).
    threads.sort((a, b) => {
      const aTs = a.last_message_at ?? "1970";
      const bTs = b.last_message_at ?? "1970";
      return bTs.localeCompare(aTs);
    });
    setDmThreads(threads);
  }, [user, channels]);

  useEffect(() => {
    loadDmThreads();
  }, [loadDmThreads]);

  /* ─── New DM dialog: user search + RPC handler ─────────────
   * Keeps search debounce tiny (200ms) since we filter locally on
   * the user table (small to medium). Falls back to client-side
   * substring match — Postgres `ilike` is server-side so we hit DB
   * for anything substantive. */
  const runUserSearch = useCallback(
    async (query: string) => {
      if (!user) {
        setDmSearchResults([]);
        return;
      }
      const q = query.trim();
      // Empty query → return top suggested users so the compose
      // panel populates immediately, no typing required. Non-empty
      // query → ilike search. Both cases capped at 12 for the
      // inline list (was 8 in the old modal).
      let req = supabase
        .from("users")
        .select("id, name, email, role, subscription_tier")
        .neq("id", user.id);
      if (q) {
        req = req.or(`name.ilike.%${q}%,email.ilike.%${q}%`);
      }
      const { data } = await req.limit(12);
      // Sort: admin first, then Pro members, then alphabetical
      const sorted = (data ?? []).sort(
        (a: { role: string | null; subscription_tier: string; name: string },
         b: { role: string | null; subscription_tier: string; name: string }) => {
          if (a.role === "admin" && b.role !== "admin") return -1;
          if (b.role === "admin" && a.role !== "admin") return 1;
          if (a.subscription_tier === "pro" && b.subscription_tier !== "pro") return -1;
          if (b.subscription_tier === "pro" && a.subscription_tier !== "pro") return 1;
          return a.name.localeCompare(b.name);
        }
      );
      setDmSearchResults(sorted);
    },
    [user]
  );

  // Debounced search trigger — only runs while compose is open so we
  // don't burn a query on every keystroke when the panel isn't visible.
  useEffect(() => {
    if (!composeMode) return;
    const timer = setTimeout(() => runUserSearch(dmSearchQuery), 200);
    return () => clearTimeout(timer);
  }, [composeMode, dmSearchQuery, runUserSearch]);

  const handleStartDm = useCallback(
    async (otherUserId: string) => {
      setStartingDm(true);
      setDmError(null);
      const { data, error } = await supabase.rpc("get_or_create_dm", {
        other_user_id: otherUserId,
      });
      if (error || !data) {
        setDmError(t.community?.dmCannotMessage || "Couldn't open conversation");
        setStartingDm(false);
        return;
      }
      // Channel may not yet be in our channels list (just created).
      // Refetch channels so the DM thread renders + we can switch to it.
      const { data: allChannels } = await supabase
        .from("chat_channels")
        .select("*");
      if (allChannels) {
        setChannels(allChannels as Channel[]);
      }
      setActiveChannelId(data as string);
      setComposeMode(false);
      setDmSearchQuery("");
      setDmSearchResults([]);
      setStartingDm(false);
    },
    [t.community]
  );

  /* ─── DM realtime — new participations + new messages ───────
   * When someone DMs us for the first time, a participant row is
   * inserted for our user_id. The chat_dm_participants table is in
   * the realtime publication, so we listen for that and refresh. */
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`dm_participants_${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_dm_participants",
          filter: `user_id=eq.${user.id}`,
        },
        async () => {
          // New DM thread for us — refetch the channels list so the
          // new direct channel shows up, then DM threads will reload
          // via the channels effect dependency.
          const { data: allChannels } = await supabase
            .from("chat_channels")
            .select("*");
          if (allChannels) {
            setChannels((prev) => {
              const existing = new Set(prev.map((c) => c.id));
              const additions = (allChannels as Channel[]).filter(
                (c) => !existing.has(c.id)
              );
              return additions.length > 0 ? [...prev, ...additions] : prev;
            });
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // PERF: depend on user.id (string) not user (object). Token
    // refreshes / profile updates produce a new user reference but
    // the same id — without this, the WebSocket would tear down
    // and re-establish on every refresh, churning network + state.
  }, [user?.id]);

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
        // Replies live inside threads, not in the main stream — counting
        // them here would inflate the unread badge above what the user
        // actually sees when they open the channel. Pings in threads are
        // surfaced via the separate @-mention feed instead.
        let query = supabase
          .from("chat_messages")
          .select("*", { count: "exact", head: true })
          .eq("channel_id", ch.id)
          .eq("is_deleted", false)
          .is("parent_message_id", null)
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
    // Only top-level messages in the stream (replies render inside their
    // parent's expanded thread, not as standalone rows). The
    // `replies:chat_messages!parent_message_id(count)` embed gives us the
    // reply count per message inline, avoiding a second query.
    const { data } = await supabase
      .from("chat_messages")
      .select(
        "*, user:users(name, role), reactions:chat_reactions(id, message_id, user_id, emoji), replies:chat_messages!parent_message_id(count)"
      )
      .eq("channel_id", channelId)
      .is("parent_message_id", null)
      .order("created_at", { ascending: false })
      .limit(MESSAGES_PER_PAGE);

    const msgs = ((data as ChatMessage[]) || [])
      .map(normalizeReplyCount)
      .reverse();
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
      .select(
        "*, user:users(name, role), reactions:chat_reactions(id, message_id, user_id, emoji), replies:chat_messages!parent_message_id(count)"
      )
      .eq("channel_id", activeChannelRef.current)
      .is("parent_message_id", null)
      .lt("created_at", oldestMsg.created_at)
      .order("created_at", { ascending: false })
      .limit(MESSAGES_PER_PAGE);

    const older = ((data as ChatMessage[]) || [])
      .map(normalizeReplyCount)
      .reverse();

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
            .select(
              "*, user:users(name, role), reactions:chat_reactions(id, message_id, user_id, emoji), replies:chat_messages!parent_message_id(count)"
            )
            .eq("id", payload.new.id)
            .single();
          if (!data) return;

          const msg = normalizeReplyCount(data as ChatMessage);

          // Reply path: route to the parent's thread view instead of the
          // main stream. Always bump parent's reply_count so the chip
          // counter stays accurate even when the thread is collapsed.
          if (msg.parent_message_id) {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === msg.parent_message_id
                  ? { ...m, reply_count: (m.reply_count ?? 0) + 1 }
                  : m
              )
            );
            setThreadReplies((prev) => {
              // Only populate if we've actually expanded this thread; adding
              // replies blindly would memory-leak every chat_messages insert
              // into the cache over time.
              if (!prev.has(msg.parent_message_id!)) return prev;
              const list = prev.get(msg.parent_message_id!) ?? [];
              if (list.some((r) => r.id === msg.id)) return prev; // dedup own-echo
              const next = new Map(prev);
              next.set(msg.parent_message_id!, [...list, msg]);
              return next;
            });
            return;
          }

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
          const updated = payload.new as {
            id: string;
            channel_id: string;
            parent_message_id: string | null;
          };
          if (updated.channel_id !== activeChannelRef.current) return;

          const { data } = await supabase
            .from("chat_messages")
            .select(
              "*, user:users(name, role), reactions:chat_reactions(id, message_id, user_id, emoji), replies:chat_messages!parent_message_id(count)"
            )
            .eq("id", updated.id)
            .single();
          if (!data) return;

          const msg = normalizeReplyCount(data as ChatMessage);

          // Reply edit/delete: update the thread cache and — if a reply
          // just transitioned to is_deleted — decrement the parent's
          // reply_count so the chip counter reflects live replies only.
          // Detecting the transition requires the previous cached value;
          // when the thread has never been expanded we can't tell, so we
          // skip the decrement (the count will self-correct on next page
          // load). Edit-only updates leave reply_count alone.
          if (msg.parent_message_id) {
            let justDeleted = false;
            setThreadReplies((prev) => {
              if (!prev.has(msg.parent_message_id!)) return prev;
              const list = prev.get(msg.parent_message_id!) ?? [];
              const before = list.find((r) => r.id === msg.id);
              if (before && !before.is_deleted && msg.is_deleted) {
                justDeleted = true;
              }
              const next = new Map(prev);
              next.set(
                msg.parent_message_id!,
                list.map((r) => (r.id === msg.id ? msg : r))
              );
              return next;
            });
            if (justDeleted) {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === msg.parent_message_id
                    ? {
                        ...m,
                        reply_count: Math.max(0, (m.reply_count ?? 1) - 1),
                      }
                    : m
                )
              );
            }
            return;
          }

          setMessages((prev) =>
            prev.map((m) =>
              m.id === msg.id
                ? { ...msg, reply_count: m.reply_count ?? msg.reply_count }
                : m
            )
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
    // PERF: user.id (string) not user (object) — see DM realtime
    // useEffect above for rationale.
  }, [user?.id, markAsRead]);

  /* ─── Presence ──────────────────────────────────────────── */
  useEffect(() => {
    if (!user) return;

    const presence = supabase.channel("community_presence", {
      config: { presence: { key: user.id } },
    });

    presence
      .on("presence", { event: "sync" }, () => {
        const state = presence.presenceState() as Record<
          string,
          { user_id: string; name: string }[]
        >;
        const list: { id: string; name: string }[] = [];
        for (const key of Object.keys(state)) {
          const meta = state[key]?.[0];
          if (meta) list.push({ id: meta.user_id, name: meta.name || "User" });
        }
        // Sort own user first, then alphabetical — keeps tooltip stable.
        list.sort((a, b) => {
          if (a.id === user.id) return -1;
          if (b.id === user.id) return 1;
          return a.name.localeCompare(b.name);
        });
        setOnlineUsers(list);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await presence.track({ user_id: user.id, name: userName });
        }
      });

    return () => {
      supabase.removeChannel(presence);
    };
    // PERF: user.id (string) not user (object). userName is a derived
    // string so its dep stability is fine.
  }, [user?.id, userName]);

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

  // Same filter as the main composer but keyed off the reply-composer's
  // own query state, so both dropdowns can be open simultaneously without
  // cross-contaminating highlights.
  const replyMentionMatches = useMemo(() => {
    if (replyMentionQuery === null) return [];
    const q = replyMentionQuery.toLowerCase();
    return mentionableUsers
      .filter(
        (u) =>
          u.id !== user?.id &&
          (q === "" || u.name.toLowerCase().includes(q))
      )
      .slice(0, 8);
  }, [replyMentionQuery, mentionableUsers, user]);

  /* ─── Roster names for ChatMarkdown (stable reference) ────── */
  // Memoized so ChatMarkdown doesn't rebuild its mention regex on every
  // keystroke while the user is typing in the composer.
  const mentionNames = useMemo(
    () => mentionableUsers.map((u) => u.name),
    [mentionableUsers]
  );

  // Mentions feed + its realtime subscription removed — the topbar
  // notifications bell now surfaces the same events via the
  // chat_mentions DB trigger that mirrors into the unified
  // notifications feed. One subscription instead of two. The
  // chat_mentions table itself stays (still powers the @-typeahead).

  // Clamp the highlighted index whenever the filtered list shrinks beneath
  // the current cursor (otherwise Arrow+Enter could select a stale row).
  useEffect(() => {
    if (mentionIndex >= mentionMatches.length) setMentionIndex(0);
  }, [mentionMatches.length, mentionIndex]);

  useEffect(() => {
    if (replyMentionIndex >= replyMentionMatches.length)
      setReplyMentionIndex(0);
  }, [replyMentionMatches.length, replyMentionIndex]);

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
    // If we were in compose mode, picking a channel from the sidebar
    // exits compose. composeMode + activeChannelId can co-exist on
    // re-entry but a user clicking a channel clearly wants to leave
    // the compose UI.
    setComposeMode(false);
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
    // Drop thread state: cached replies are for this channel's messages,
    // and the open reply composer is meaningless once those parents are
    // no longer visible.
    setExpandedThreads(new Set());
    setThreadReplies(new Map());
    setReplyingTo(null);
    setReplyDraft("");
    setReplyMentionQuery(null);
    setReplyPendingMentions([]);
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

  /* ─── Thread handlers ───────────────────────────────────── */

  /**
   * Fetch all non-deleted replies for a parent in chronological order.
   * We load the whole thread rather than paginating — threads are
   * typically short (< 50 messages) and pagination would complicate the
   * realtime append flow.
   */
  const fetchReplies = useCallback(async (parentId: string) => {
    if (loadingThreadsRef.current.has(parentId)) return;
    loadingThreadsRef.current.add(parentId);
    try {
      const { data } = await supabase
        .from("chat_messages")
        .select(
          "*, user:users(name, role), reactions:chat_reactions(id, message_id, user_id, emoji)"
        )
        .eq("parent_message_id", parentId)
        .order("created_at", { ascending: true });

      const replies = ((data as ChatMessage[]) || []).map(normalizeReplyCount);
      setThreadReplies((prev) => {
        const next = new Map(prev);
        next.set(parentId, replies);
        return next;
      });
    } finally {
      loadingThreadsRef.current.delete(parentId);
    }
  }, []);

  /**
   * Toggle a thread's expanded state. First expand triggers a fetch;
   * subsequent expands are instant because replies stay cached (and the
   * realtime subscription keeps them current).
   */
  const toggleThread = useCallback(
    (msg: ChatMessage) => {
      setExpandedThreads((prev) => {
        const next = new Set(prev);
        if (next.has(msg.id)) {
          next.delete(msg.id);
        } else {
          next.add(msg.id);
          // Lazy-fetch on first expand. Already-cached threads skip the
          // fetch via the loadingThreadsRef guard + state check.
          if (!threadReplies.has(msg.id)) {
            fetchReplies(msg.id);
          }
        }
        return next;
      });
    },
    [threadReplies, fetchReplies]
  );

  /**
   * Open the reply composer for a specific parent. Also auto-expands the
   * thread so the user can see existing replies while they type.
   */
  const startReply = useCallback(
    (msg: ChatMessage) => {
      setReplyingTo(msg.id);
      setReplyDraft("");
      setReplyMentionQuery(null);
      setReplyPendingMentions([]);
      setExpandedThreads((prev) => {
        if (prev.has(msg.id)) return prev;
        const next = new Set(prev);
        next.add(msg.id);
        return next;
      });
      if (!threadReplies.has(msg.id)) {
        fetchReplies(msg.id);
      }
      // Focus on next tick so the ref lands after the input mounts.
      setTimeout(() => replyInputRef.current?.focus(), 0);
    },
    [threadReplies, fetchReplies]
  );

  const cancelReply = () => {
    setReplyingTo(null);
    setReplyDraft("");
    setReplyMentionQuery(null);
    setReplyPendingMentions([]);
  };

  /** Same `@` detection rules as the main composer. */
  const handleReplyInputChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = e.target.value;
    setReplyDraft(value);
    const caret = e.target.selectionStart ?? value.length;
    setReplyMentionQuery(detectMentionQuery(value, caret));
  };

  const applyReplyMention = (u: { id: string; name: string }) => {
    const el = replyInputRef.current;
    if (!el) return;
    const caret = el.selectionStart ?? replyDraft.length;
    const before = replyDraft.slice(0, caret);
    const after = replyDraft.slice(caret);
    const m = /@([^\s@]*)$/.exec(before);
    if (!m) return;
    const atStart = m.index;
    const replacement = `@${u.name} `;
    const nextValue = before.slice(0, atStart) + replacement + after;
    const nextCaret = atStart + replacement.length;

    setReplyDraft(nextValue);
    setReplyPendingMentions((prev) =>
      prev.some((p) => p.user_id === u.id)
        ? prev
        : [...prev, { name: u.name, user_id: u.id }]
    );
    setReplyMentionQuery(null);

    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(nextCaret, nextCaret);
    });
  };

  const handleReplySend = async (parent: ChatMessage) => {
    const content = replyDraft.trim();
    if (!content || !user || replySending) return;
    setReplySending(true);
    setReplyMentionQuery(null);

    const activeMentions = replyPendingMentions.filter((m) => {
      const escaped = m.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const re = new RegExp(`(^|\\s)@${escaped}(?=\\s|$|[.,!?;:)])`);
      return re.test(content);
    });

    const { data: inserted } = await supabase
      .from("chat_messages")
      .insert({
        user_id: user.id,
        channel_id: parent.channel_id,
        content,
        parent_message_id: parent.id,
      })
      .select("id")
      .single();

    if (inserted?.id && activeMentions.length > 0) {
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
          channel_id: parent.channel_id,
        }));
      supabase.from("chat_mentions").insert(rows);
    }

    // Keep the composer open after send so the user can fire off multiple
    // replies in a row without re-clicking Reply. This matches Slack's
    // behavior and is what "thread mode" implies.
    setReplyDraft("");
    setReplyPendingMentions([]);
    setReplySending(false);
  };

  const handleReplyKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    parent: ChatMessage
  ) => {
    if (replyMentionQuery !== null && replyMentionMatches.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setReplyMentionIndex((i) => (i + 1) % replyMentionMatches.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setReplyMentionIndex(
          (i) =>
            (i - 1 + replyMentionMatches.length) % replyMentionMatches.length
        );
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        applyReplyMention(replyMentionMatches[replyMentionIndex]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setReplyMentionQuery(null);
        return;
      }
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleReplySend(parent);
    } else if (e.key === "Escape") {
      e.preventDefault();
      cancelReply();
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

  // Mention-feed handlers (openMention, markAllMentionsRead) removed
  // alongside the in-community @-bell. Mention click-throughs now
  // happen from the topbar notifications bell, which navigates to
  // the community page via the notification's `link` field.

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
  /**
   * Two timestamps fall on the same calendar day — used to decide
   * whether to render a date-divider between consecutive messages.
   */
  const sameDay = (a: string, b: string) => {
    const da = new Date(a);
    const db = new Date(b);
    return (
      da.getFullYear() === db.getFullYear() &&
      da.getMonth() === db.getMonth() &&
      da.getDate() === db.getDate()
    );
  };

  /**
   * Friendly label for the date-divider pill: "Today", "Yesterday",
   * or the full weekday + date for older messages. ClickUp pattern.
   */
  const formatDateDivider = (dateStr: string): string => {
    const d = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dStart = new Date(d);
    dStart.setHours(0, 0, 0, 0);
    const diffDays = Math.round(
      (today.getTime() - dStart.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (diffDays === 0) return isEn ? "Today" : "Aujourd'hui";
    if (diffDays === 1) return isEn ? "Yesterday" : "Hier";
    return d.toLocaleDateString(isEn ? "en-US" : "fr-FR", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: today.getFullYear() === d.getFullYear() ? undefined : "numeric",
    });
  };

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
          "shrink-0 flex-col border-r border-border bg-sidebar/40 transition-[width,opacity] duration-200 overflow-hidden",
          showSidebar
            ? "w-56 opacity-100 flex"
            : "w-0 opacity-0 hidden md:flex md:w-0"
        )}
      >
        {/* Sidebar header */}
        <div className="flex items-center justify-between px-3 py-3 border-b border-border">
          <h2 className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground/50">
            <span className="opacity-50">/</span>{" "}
            {t.community?.channels || "Channels"}
          </h2>
          <div
            className="flex items-center gap-1.5 rounded-full bg-primary/10 px-2 py-0.5"
            title={
              onlineUsers.length > 0
                ? onlineUsers.map((u) => u.name).join(", ")
                : undefined
            }
          >
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            <span className="text-[10px] font-medium text-primary tabular-nums">
              {onlineCount}
            </span>
          </div>
        </div>

        {/* Channel list */}
        <nav className="flex-1 overflow-y-auto py-2 px-1.5 space-y-0.5">
          {/* Core channels (General, Announcements).
              ClickUp-style: `#` glyph prefix for all channel rows
              instead of type-specific icons. Replaces the previous
              ChannelIcon + Megaphone mix with one consistent
              hash prefix. Announcements channels get an amber tint on
              the `#` to signal "admin-broadcast" — channel-type
              differentiation by color, not by glyph. */}
          {coreChannels.map((ch) => {
            const isActive = ch.id === activeChannelId;
            const unread = unreadCounts.get(ch.id) || 0;
            const isAnnouncements = ch.type === "announcements";
            const isMuted = mutedChannels.has(ch.id);
            return (
              <button
                key={ch.id}
                onClick={() => switchChannel(ch.id)}
                className={cn(
                  "group relative flex w-full items-center gap-2 rounded-md pl-3 pr-2.5 py-2 text-left transition-colors",
                  isActive &&
                    "before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-[2px] before:rounded-r-sm before:bg-primary",
                  isActive
                    ? "bg-sidebar-accent text-foreground"
                    : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
                  isMuted && !isActive && "opacity-60"
                )}
              >
                <span
                  className={cn(
                    "shrink-0 font-mono text-sm leading-none",
                    isAnnouncements
                      ? "text-amber-500"
                      : "text-muted-foreground/60"
                  )}
                  aria-hidden
                >
                  #
                </span>
                <span className="flex-1 text-sm font-medium truncate">
                  {ch.type === "general"
                    ? t.community?.general || "General"
                    : isAnnouncements
                    ? t.community?.announcements || "Announcements"
                    : ch.name}
                </span>
                {isMuted && (
                  <BellOff
                    className="h-3 w-3 text-muted-foreground/70 shrink-0"
                    aria-label={t.community?.channelMuted || "Muted"}
                  />
                )}
                {unread > 0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground tabular-nums px-1">
                    {unread > 99 ? "99+" : unread}
                  </span>
                )}
              </button>
            );
          })}

          {/* ─── Direct messages section ──────────────────────
               Always rendered (free users can RECEIVE from admin)
               but the "+ New" button is gated to Pro/admin via
               canStartDm. Empty state nudges initiation. */}
          <div className="pt-3 pb-1 px-2.5 flex items-center justify-between">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground/50">
              <span className="opacity-50">/</span>{" "}
              {t.community?.directMessages || "Direct messages"}
            </p>
            {canStartDm && (
              <button
                type="button"
                onClick={() => {
                  setComposeMode(true);
                  setDmSearchQuery("");
                  setDmSearchResults([]);
                  setDmError(null);
                }}
                title={t.community?.newMessage || "New message"}
                aria-label={t.community?.newMessage || "New message"}
                className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground/70 hover:bg-sidebar-accent hover:text-foreground transition-colors"
              >
                <Plus className="h-3 w-3" />
              </button>
            )}
          </div>

          {dmThreads.length === 0 ? (
            <div className="px-3 py-2 space-y-1.5">
              <p className="text-[11px] text-muted-foreground/60 leading-relaxed">
                {t.community?.noDmsYet || "No direct messages yet."}
              </p>
              {canStartDm && (
                <button
                  type="button"
                  onClick={() => {
                    setComposeMode(true);
                    setDmSearchQuery("");
                    setDmSearchResults([]);
                    setDmError(null);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-md text-[11px] font-medium text-primary hover:underline underline-offset-2"
                >
                  <Plus className="h-3 w-3" />
                  {t.community?.newMessage ||
                    (isEn ? "Start a conversation" : "Démarrer une conversation")}
                </button>
              )}
            </div>
          ) : (
            dmThreads.map((dm) => {
              const isActive = dm.channel_id === activeChannelId;
              const unread = unreadCounts.get(dm.channel_id) || 0;
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
                  onClick={() => switchChannel(dm.channel_id)}
                  className={cn(
                    "group relative flex w-full items-center gap-2 rounded-md pl-3 pr-2.5 py-2 text-left transition-colors",
                    isActive &&
                      "before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-[2px] before:rounded-r-sm before:bg-primary",
                    isActive
                      ? "bg-sidebar-accent text-foreground"
                      : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground"
                  )}
                >
                  <Avatar className="h-6 w-6 shrink-0">
                    <AvatarFallback
                      className={cn(
                        "text-[10px] font-medium",
                        isAdminThread
                          ? "bg-amber-500/15 text-amber-500"
                          : userTintClass(dm.other_user_id)
                      )}
                    >
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="flex-1 text-sm font-medium truncate">
                    {dm.other_name}
                  </span>
                  {isAdminThread && (
                    <Crown
                      className="h-3 w-3 text-amber-500 shrink-0"
                      aria-label={t.community?.dmAdminBadge || "Host"}
                    />
                  )}
                  {unread > 0 && (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground tabular-nums px-1">
                      {unread > 99 ? "99+" : unread}
                    </span>
                  )}
                </button>
              );
            })
          )}

          {/* Course channels */}
          {courseChannels.length > 0 && (
            <>
              <div className="pt-3 pb-1 px-2.5">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground/50">
                  <span className="opacity-50">/</span>{" "}
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
                    title={ch.name}
                    className={cn(
                      "group relative flex w-full items-center gap-2 rounded-md pl-3 pr-2.5 py-2 text-left transition-colors",
                      isActive &&
                        "before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-[2px] before:rounded-r-sm before:bg-primary",
                      isActive
                        ? "bg-sidebar-accent text-foreground"
                        : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground"
                    )}
                  >
                    <span
                      className="shrink-0 font-mono text-sm leading-none text-muted-foreground/60"
                      aria-hidden
                    >
                      #
                    </span>
                    <span className="flex-1 text-sm font-medium truncate">
                      {ch.name}
                    </span>
                    {unread > 0 && (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground tabular-nums px-1">
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
        {composeMode ? (
          /* ─── Inline DM Compose ──────────────────────────────
               Replaces the old modal popover. Owns the chat area
               while active: header (close + title) → search input
               → suggested-or-matching users list. Picking a user
               calls handleStartDm which transitions back to the
               normal chat with that DM channel active. */
          <>
            <div className="border-b border-border">
              <div className="max-w-3xl mx-auto w-full flex items-center gap-2 px-4 py-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 text-muted-foreground/70"
                  onClick={() => {
                    setComposeMode(false);
                    setDmSearchQuery("");
                    setDmSearchResults([]);
                    setDmError(null);
                  }}
                  aria-label={isEn ? "Close" : "Fermer"}
                >
                  <X className="h-4 w-4" />
                </Button>
                <h1 className="text-base font-semibold tracking-tight text-foreground">
                  {t.community?.newDmTitle ||
                    (isEn ? "New direct message" : "Nouveau message")}
                </h1>
              </div>
            </div>

            <div className="border-b border-border">
              <div className="max-w-3xl mx-auto w-full px-4 py-3">
                <div className="relative">
                  <SearchIcon className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/70" />
                  <Input
                    value={dmSearchQuery}
                    onChange={(e) => setDmSearchQuery(e.target.value)}
                    placeholder={
                      t.community?.newDmSearchPlaceholder ||
                      (isEn
                        ? "Search people…"
                        : "Rechercher quelqu'un…")
                    }
                    className="pl-9"
                    autoFocus
                  />
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              <div className="max-w-3xl mx-auto w-full px-4 py-3">
                {dmSearchResults.length === 0 ? (
                  <p className="text-xs text-muted-foreground/70 text-center py-12">
                    {dmSearchQuery.trim()
                      ? t.community?.newDmEmptyResults ||
                        (isEn
                          ? "No matching members."
                          : "Aucun membre correspondant.")
                      : isEn
                      ? "No members yet."
                      : "Aucun membre pour l'instant."}
                  </p>
                ) : (
                  <>
                    <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground/50 px-2 pb-2">
                      <span className="opacity-50">/</span>{" "}
                      {dmSearchQuery.trim()
                        ? isEn
                          ? "Results"
                          : "Résultats"
                        : isEn
                        ? "Suggested"
                        : "Suggestions"}
                    </p>
                    <div className="space-y-0.5">
                      {dmSearchResults.map((u) => {
                        const isAdminUser = u.role === "admin";
                        const isProUser = u.subscription_tier === "pro";
                        const initials = (u.name || u.email || "?")
                          .split(/[\s@]+/)
                          .map((s) => s[0])
                          .filter(Boolean)
                          .slice(0, 2)
                          .join("")
                          .toUpperCase();
                        return (
                          <button
                            key={u.id}
                            type="button"
                            onClick={() => handleStartDm(u.id)}
                            disabled={startingDm}
                            className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left hover:bg-muted/40 transition-colors disabled:opacity-50"
                          >
                            <Avatar className="h-9 w-9 shrink-0">
                              <AvatarFallback
                                className={cn(
                                  "text-xs font-medium",
                                  isAdminUser
                                    ? "bg-amber-500/15 text-amber-500"
                                    : userTintClass(u.id)
                                )}
                              >
                                {initials}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <p className="text-sm font-medium text-foreground truncate">
                                  {u.name || u.email.split("@")[0]}
                                </p>
                                {isAdminUser && (
                                  <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-500/15 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-amber-500">
                                    <Crown className="h-2.5 w-2.5" />
                                    {t.community?.dmAdminBadge || "Host"}
                                  </span>
                                )}
                                {!isAdminUser && isProUser && (
                                  <Badge className="bg-primary/15 text-primary text-[9px] px-1.5 py-0">
                                    Pro
                                  </Badge>
                                )}
                              </div>
                              <p className="font-mono text-[10px] text-muted-foreground/70 truncate">
                                {u.email}
                              </p>
                            </div>
                            {startingDm && (
                              <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground/70 shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
                {dmError && (
                  <p className="text-xs text-destructive px-2 pt-3">
                    {dmError}
                  </p>
                )}
              </div>
            </div>
          </>
        ) : (
        <>
        {/* ─── Chat Header ──────────────────────────────────────
             Border spans full-width for visual continuity, but the
             header content tracks the message column's max-w-3xl
             so the sidebar toggle, channel name, and online
             indicator stay aligned with the conversation below. */}
        <div className="border-b border-border">
        <div className="max-w-3xl mx-auto w-full flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Toggle sidebar */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 text-muted-foreground/70"
              onClick={() => setShowSidebar(!showSidebar)}
            >
              {showSidebar ? (
                <PanelLeftClose className="h-4 w-4" />
              ) : (
                <PanelLeft className="h-4 w-4" />
              )}
            </Button>

            {/* Channel info — ClickUp-style: `#` glyph (matching the
                sidebar) + bigger channel name as the page anchor. The
                title was previously text-sm font-bold which read as
                "secondary text" rather than "page title." */}
            {activeChannel && activeChannel.type === "direct" ? (
              // DM header: avatar + peer name + Host badge if admin.
              // Different visual model from public channels — DMs are
              // about the person, not the topic.
              (() => {
                const dm = dmThreads.find(
                  (d) => d.channel_id === activeChannel.id
                );
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
                            {t.community?.dmAdminBadge || "Host"}
                          </span>
                        )}
                      </h1>
                      <p className="text-[11px] text-muted-foreground/70">
                        {(t.community?.directMessages || "Direct messages").toLowerCase()}
                      </p>
                    </div>
                  </div>
                );
              })()
            ) : activeChannel ? (
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className={cn(
                    "shrink-0 font-mono text-lg leading-none",
                    activeChannel.type === "announcements"
                      ? "text-amber-500"
                      : "text-muted-foreground/60"
                  )}
                  aria-hidden
                >
                  #
                </span>
                <div className="min-w-0">
                  <h1 className="text-base font-semibold tracking-tight text-foreground truncate">
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
                    <p className="text-[11px] text-muted-foreground/70">
                      {t.community?.courseChat ||
                        (isEn
                          ? "Course discussion"
                          : "Discussion du cours")}
                    </p>
                  )}
                </div>
              </div>
            ) : null}
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

            {/* Per-channel mute toggle. When muted, mention + announcement
                 notifications skip this channel server-side; user still
                 sees the messages when they visit. */}
            {activeChannel && activeChannel.type !== "direct" && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={() => toggleChannelMute(activeChannel.id)}
                title={
                  mutedChannels.has(activeChannel.id)
                    ? t.community?.channelUnmute || "Unmute"
                    : t.community?.channelMute || "Mute notifications"
                }
                aria-label={
                  mutedChannels.has(activeChannel.id)
                    ? t.community?.channelUnmute || "Unmute"
                    : t.community?.channelMute || "Mute notifications"
                }
              >
                {mutedChannels.has(activeChannel.id) ? (
                  <BellOff className="h-3.5 w-3.5 text-amber-500" />
                ) : (
                  <Bell className="h-3.5 w-3.5" />
                )}
              </Button>
            )}

            {/* In-community @-mentions bell removed — duplicate of the
                 topbar notifications bell, which now surfaces the same
                 mention rows via the chat_mentions trigger that mirrors
                 into the unified notifications feed. */}

            {/* Online indicator — title shows full roster on hover.
                 Singular/plural forms use the proper localized
                 strings ("1 personne en ligne" vs "3 personnes en
                 ligne") so the count is unambiguous, not "1 en
                 ligne" which leaves users guessing what 1 means. */}
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
                <div className="min-w-0 text-muted-foreground">
                  <ChatMarkdown
                    content={msg.content}
                    mentionableNames={mentionNames}
                    currentUserName={userName ?? undefined}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ─── Messages Area ────────────────────────────────────
             Outer scrolls full-width (so the scrollbar hugs the
             viewport edge). Inner column is constrained to
             max-w-3xl ≈ 768px and centered — gives the conversation
             a comfortable measure on wide screens instead of
             stranding it against the left edge. */}
        <div
          ref={chatContainerRef}
          className="flex-1 overflow-y-auto"
          onScroll={handleScroll}
        >
        <div className="max-w-3xl mx-auto w-full px-4 py-4 space-y-1 min-h-full flex flex-col">
          {loading ? (
            <div className="flex flex-1 items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/70" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center text-muted-foreground/70">
              <div className="mb-4">
                <Illustration name="chat-empty" alt="" size="md" />
              </div>
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
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground/70" />
                </div>
              )}
              {!hasMore && !loadingOlder && (
                <div className="flex items-center justify-center py-3 text-[11px] text-muted-foreground/70">
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
              const prevMsg = i > 0 ? messages[i - 1] : null;
              const showDateDivider =
                !prevMsg || !sameDay(prevMsg.created_at, msg.created_at);
              // Avatar gutter shows ONLY for the first message in a
              // sender-cluster on the same day. After a date divider
              // the cluster naturally restarts.
              const showAvatar =
                showDateDivider ||
                !prevMsg ||
                prevMsg.user_id !== msg.user_id;

              return (
                <Fragment key={msg.id}>
                  {/* Date divider — ClickUp-style floating pill. Marks
                      day boundaries between message clusters so threads
                      that span multiple days don't blur together. */}
                  {showDateDivider && (
                    <div className="flex justify-center py-3">
                      <span className="rounded-full border border-border/60 bg-card px-3 py-1 font-mono text-[11px] font-medium text-muted-foreground tabular-nums">
                        {formatDateDivider(msg.created_at)}
                      </span>
                    </div>
                  )}
                <div
                  className={cn(
                    "group flex items-start gap-2.5 px-2 py-1 rounded-lg transition-colors hover:bg-muted/40",
                    msg.is_pinned &&
                      !msg.is_deleted &&
                      "bg-amber-50/40 dark:bg-amber-900/10",
                    // Tombstones: dim the entire row (avatar, name,
                    // body) so they don't compete with live messages
                    // for attention but stay readable for context.
                    msg.is_deleted && "opacity-50"
                  )}
                >
                  {/* Avatar — hash-tinted by user id so the same
                       person is always the same color in the feed.
                       Admins override with the red authority tint. */}
                  <div className="w-8 shrink-0">
                    {showAvatar && (
                      <Avatar className="h-8 w-8">
                        <AvatarFallback
                          className={cn(
                            "text-[11px] font-semibold",
                            isMsgAdmin
                              ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                              : userTintClass(msg.user_id)
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
                          <Pin className="h-3 w-3 text-amber-500" />
                        )}
                        <span className="text-[11px] text-muted-foreground/70">
                          {formatTime(msg.created_at)}
                        </span>
                      </div>
                    )}

                    {msg.is_deleted ? (
                      <p className="text-sm italic text-muted-foreground/70">
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
                          className="w-full rounded-lg border border-input bg-sidebar-accent px-2.5 py-1.5 text-sm text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40"
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
                          <span className="text-muted-foreground/70">
                            {isEn
                              ? "Enter to save · Shift+Enter for newline · Esc to cancel"
                              : "Entrée pour enregistrer · Maj+Entrée pour nouvelle ligne · Échap pour annuler"}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-foreground/90">
                        <ChatMarkdown
                          content={msg.content}
                          mentionableNames={mentionNames}
                          currentUserName={userName ?? undefined}
                        />
                        {msg.edited_at && (
                          <span
                            className="ml-1.5 text-[10px] text-muted-foreground/70"
                            title={new Date(msg.edited_at).toLocaleString(
                              isEn ? "en-US" : "fr-FR"
                            )}
                          >
                            ({isEn ? "edited" : "modifié"})
                          </span>
                        )}
                      </div>
                    )}

                    {/* Link preview — only show for live (non-deleted,
                        non-editing) messages. One preview per message:
                        multiple cards would dominate the thread. The
                        LinkPreview component internally handles its own
                        loading, error, and "no useful metadata" states
                        (renders null), so we don't gate on those here. */}
                    {!msg.is_deleted &&
                      editingId !== msg.id &&
                      (() => {
                        const previewUrl = extractFirstUrl(msg.content);
                        return previewUrl ? (
                          <LinkPreview url={previewUrl} />
                        ) : null;
                      })()}

                    {/* Thread: replies chip + expanded panel.
                        - The chip is visible whenever there's at least
                          one reply OR the user explicitly expanded the
                          thread via "Reply" (in which case reply_count
                          might still be 0 until they send).
                        - Clicking the chip toggles expansion; the first
                          toggle lazy-fetches the reply list. */}
                    {!msg.is_deleted &&
                      editingId !== msg.id &&
                      ((msg.reply_count ?? 0) > 0 ||
                        expandedThreads.has(msg.id)) && (
                        <button
                          onClick={() => toggleThread(msg)}
                          className="mt-1 inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium text-primary hover:bg-primary/10 transition-colors tabular-nums"
                          aria-expanded={expandedThreads.has(msg.id)}
                        >
                          <MessageSquare className="h-3 w-3" />
                          <span>
                            {(msg.reply_count ?? 0) === 1
                              ? isEn
                                ? "1 reply"
                                : "1 réponse"
                              : isEn
                              ? `${msg.reply_count ?? 0} replies`
                              : `${msg.reply_count ?? 0} réponses`}
                          </span>
                          <ChevronDown
                            className={cn(
                              "h-3 w-3 transition-transform text-primary/70",
                              expandedThreads.has(msg.id) && "rotate-180"
                            )}
                          />
                        </button>
                      )}

                    {/* Expanded thread body: replies + inline composer.
                        Indented with a left border to visually tie them
                        to the parent. Replies render with a more compact
                        layout — the parent row already carries the
                        full avatar/name/time header. */}
                    {expandedThreads.has(msg.id) && (
                      <div className="mt-1.5 ml-1 border-l-2 border-border pl-3 space-y-1">
                        {(threadReplies.get(msg.id) ?? []).length === 0 &&
                        !loadingThreadsRef.current.has(msg.id) ? (
                          <p className="text-[11px] italic text-muted-foreground/70 py-1">
                            {isEn
                              ? "No replies yet — be the first"
                              : "Aucune réponse — soyez le premier"}
                          </p>
                        ) : (
                          (threadReplies.get(msg.id) ?? []).map((reply) => {
                            const isOwnReply = reply.user_id === user?.id;
                            const isReplyAdmin = reply.user?.role === "admin";
                            return (
                              <div
                                key={reply.id}
                                className="group/reply flex items-start gap-2 py-0.5 px-1 rounded hover:bg-muted/40"
                              >
                                <Avatar className="h-6 w-6 mt-0.5">
                                  <AvatarFallback
                                    className={cn(
                                      "text-[9px] font-semibold",
                                      isReplyAdmin
                                        ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                                        : userTintClass(reply.user_id)
                                    )}
                                  >
                                    {getInitials(reply.user?.name || "")}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5 mb-0.5">
                                    <span
                                      className={cn(
                                        "text-xs font-semibold",
                                        isReplyAdmin
                                          ? "text-red-600 dark:text-red-400"
                                          : "text-foreground"
                                      )}
                                    >
                                      {reply.user?.name || "User"}
                                    </span>
                                    {isReplyAdmin && (
                                      <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-[9px] px-1 py-0">
                                        Admin
                                      </Badge>
                                    )}
                                    <span className="text-[10px] text-muted-foreground/70">
                                      {formatTime(reply.created_at)}
                                    </span>
                                  </div>

                                  {reply.is_deleted ? (
                                    <p className="text-xs italic text-muted-foreground/70">
                                      {isEn
                                        ? "This message was deleted"
                                        : "Ce message a été supprimé"}
                                    </p>
                                  ) : editingId === reply.id ? (
                                    <div className="flex flex-col gap-1.5 mt-1">
                                      <textarea
                                        autoFocus
                                        value={editDraft}
                                        onChange={(e) =>
                                          setEditDraft(e.target.value)
                                        }
                                        onKeyDown={(e) =>
                                          handleEditKeyDown(e, reply)
                                        }
                                        rows={Math.min(
                                          4,
                                          Math.max(2, editDraft.split("\n").length)
                                        )}
                                        maxLength={1000}
                                        className="w-full rounded-lg border border-input bg-sidebar-accent px-2 py-1 text-xs text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40"
                                      />
                                      <div className="flex items-center gap-1.5">
                                        <Button
                                          size="sm"
                                          className="h-6 px-2 text-[11px]"
                                          onClick={() => saveEdit(reply)}
                                          disabled={!editDraft.trim()}
                                        >
                                          {isEn ? "Save" : "Enregistrer"}
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-6 px-2 text-[11px]"
                                          onClick={cancelEdit}
                                        >
                                          {isEn ? "Cancel" : "Annuler"}
                                        </Button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="text-xs text-foreground/90">
                                      <ChatMarkdown
                                        content={reply.content}
                                        mentionableNames={mentionNames}
                                        currentUserName={userName ?? undefined}
                                      />
                                      {reply.edited_at && (
                                        <span className="ml-1.5 text-[9px] text-muted-foreground/70">
                                          ({isEn ? "edited" : "modifié"})
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>

                                {/* Reply actions (hover). Scoped to
                                    group/reply so they don't flicker on
                                    top-level message hover. */}
                                {!reply.is_deleted &&
                                  editingId !== reply.id &&
                                  (isOwnReply || isAdmin) && (
                                    <div className="shrink-0 flex items-center gap-0.5 opacity-0 group-hover/reply:opacity-100 transition-opacity">
                                      {isOwnReply && (
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-6 w-6"
                                          onClick={() => startEdit(reply)}
                                          aria-label={
                                            isEn ? "Edit reply" : "Modifier"
                                          }
                                        >
                                          <Pencil className="h-3 w-3" />
                                        </Button>
                                      )}
                                      {(isOwnReply || isAdmin) && (
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-6 w-6 text-red-500 hover:text-red-600"
                                          onClick={() => deleteMessage(reply)}
                                          aria-label={
                                            isEn ? "Delete reply" : "Supprimer"
                                          }
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </Button>
                                      )}
                                    </div>
                                  )}
                              </div>
                            );
                          })
                        )}

                        {/* Inline reply composer. Positioned relative so
                            the mention dropdown can anchor to it. */}
                        {replyingTo === msg.id && canPost && (
                          <div className="relative pt-1">
                            {replyMentionQuery !== null &&
                              replyMentionMatches.length > 0 && (
                                <div className="absolute bottom-full left-0 mb-1 w-64 max-w-[calc(100vw-2rem)] rounded-lg border border-input bg-card shadow-lg z-20 overflow-hidden">
                                  {replyMentionMatches.map((u, idx) => (
                                    <button
                                      key={u.id}
                                      type="button"
                                      // onMouseDown fires before the input's
                                      // blur, so the selection lands before
                                      // the dropdown closes.
                                      onMouseDown={(e) => {
                                        e.preventDefault();
                                        applyReplyMention(u);
                                      }}
                                      onMouseEnter={() =>
                                        setReplyMentionIndex(idx)
                                      }
                                      className={cn(
                                        "w-full flex items-center gap-2 px-2.5 py-1.5 text-left text-xs transition-colors",
                                        idx === replyMentionIndex
                                          ? "bg-primary/15 text-primary"
                                          : "text-foreground/90 hover:bg-muted/40"
                                      )}
                                    >
                                      <AtSign className="h-3 w-3 shrink-0 opacity-60" />
                                      <span className="font-medium truncate">
                                        {u.name}
                                      </span>
                                      {u.role === "admin" && (
                                        <Badge className="ml-auto bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-[9px] px-1 py-0">
                                          Admin
                                        </Badge>
                                      )}
                                    </button>
                                  ))}
                                </div>
                              )}

                            <div className="flex items-center gap-1.5">
                              <CornerDownRight className="h-3.5 w-3.5 text-muted-foreground/70 shrink-0" />
                              <input
                                ref={replyInputRef}
                                type="text"
                                value={replyDraft}
                                onChange={handleReplyInputChange}
                                onKeyDown={(e) => handleReplyKeyDown(e, msg)}
                                placeholder={
                                  isEn
                                    ? `Reply to ${msg.user?.name || "message"}…`
                                    : `Répondre à ${msg.user?.name || "le message"}…`
                                }
                                maxLength={1000}
                                disabled={replySending}
                                className="flex-1 min-w-0 rounded-md border border-input bg-sidebar-accent px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40"
                              />
                              <Button
                                size="sm"
                                className="h-7 px-2.5 text-[11px]"
                                onClick={() => handleReplySend(msg)}
                                disabled={!replyDraft.trim() || replySending}
                              >
                                {isEn ? "Reply" : "Envoyer"}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={cancelReply}
                                aria-label={isEn ? "Cancel" : "Annuler"}
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
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
                                    ? "bg-primary/10 border-primary/40 text-primary"
                                    : "bg-muted border-transparent text-muted-foreground hover:border-border"
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

                      {/* Reply — opens the inline thread composer for this
                          message. Threads have a depth cap (enforced by
                          trigger), so this button is hidden entirely on
                          rows that are themselves replies. */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => startReply(msg)}
                        aria-label={isEn ? "Reply" : "Répondre"}
                      >
                        <Reply className="h-3.5 w-3.5" />
                      </Button>

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
                </Fragment>
              );
            })}
            </>
          )}
          <div ref={bottomRef} />
        </div>
        </div>

        {/* ─── Scroll to bottom ───────────────────────────────── */}
        {showScrollBtn && (
          <div className="relative">
            <button
              onClick={scrollToBottom}
              className="absolute -top-12 left-1/2 -translate-x-1/2 flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow-lg hover:opacity-90 transition-opacity"
            >
              <ChevronDown className="h-3.5 w-3.5" />
              {isEn ? "New messages" : "Nouveaux messages"}
            </button>
          </div>
        )}

        {/* ─── Input Area ─────────────────────────────────────── */}
        {canPost ? (
          <div className="border-t border-border">
          <div className="relative max-w-3xl mx-auto w-full px-4 pt-3 pb-2">
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

            {/* Mention typeahead — floats above the input row, anchored to
                the composer's left gutter. Arrow keys cycle, Enter/Tab
                inserts, Escape dismisses. */}
            {mentionQuery !== null && mentionMatches.length > 0 && (
              <div className="absolute bottom-full left-4 right-4 mb-1 z-10 rounded-lg border border-border bg-card shadow-lg overflow-hidden max-h-60 overflow-y-auto">
                <div className="px-2 py-1.5 border-b border-border/60 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
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
                        ? "bg-primary/15 text-primary"
                        : "text-foreground/90 hover:bg-muted/50"
                    )}
                  >
                    <Avatar className="h-6 w-6">
                      <AvatarFallback
                        className={cn(
                          "text-[10px] font-semibold",
                          u.role === "admin"
                            ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                            : "bg-muted text-foreground/90"
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
                className="h-9 w-9 shrink-0 text-muted-foreground/70"
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
          </div>
        ) : (
          <div className="border-t border-border px-4 py-3">
            <p className="text-center text-sm text-muted-foreground/70">
              <Megaphone className="inline h-4 w-4 mr-1.5 -mt-0.5" />
              {t.community?.announcementsOnly ||
                (isEn
                  ? "Only admins can post in this channel"
                  : "Seuls les administrateurs peuvent publier ici")}
            </p>
          </div>
        )}
        </>
        )}
      </div>
    </div>
  );
}

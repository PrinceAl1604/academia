"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Bell,
  MessageSquare,
  AtSign,
  Calendar as CalendarIcon,
  Clock,
  XCircle,
  Pencil,
  Crown,
  Gift,
  Video,
  Megaphone,
  BookPlus,
  Sparkles,
  UserPlus,
  CheckCircle2,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/i18n/language-context";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

/**
 * NotificationBell — unified notification feed in the topbar.
 *
 * Replaces the previous fake-feed (latest students for admin, latest
 * courses for students) with a real per-user notifications table.
 * Realtime subscription means new notifications stream in within ~1
 * second of the originating event (DM sent, session started, etc.).
 *
 * The notification's title/body are rendered in the user's CURRENT
 * locale via type-keyed i18n strings + payload substitutions — the
 * row stored in Postgres is locale-agnostic, so a French user who
 * later switches to English sees the same notification re-rendered
 * in English without a backfill.
 */

type NotifType =
  | "dm_message"
  | "chat_mention"
  | "announcement"
  | "new_course"
  | "session_booked"
  | "session_reminder"
  | "session_live"
  | "session_cancelled"
  | "session_updated"
  | "pro_expiring"
  | "pro_renewed"
  | "pro_expired"
  | "referral_signup"
  | "referral_rewarded"
  | "welcome";

interface NotificationRow {
  id: string;
  type: NotifType;
  payload: Record<string, unknown>;
  link: string | null;
  read_at: string | null;
  created_at: string;
}

const PAGE_LIMIT = 20;
// Cache the unread count in localStorage so the badge renders
// instantly on next page load instead of waiting for a network call.
const COUNT_CACHE_KEY = "brightroots_notif_unread_v1";

export function NotificationBell() {
  const { user, isAuthenticated } = useAuth();
  const userId = user?.id;
  const { t, language } = useLanguage();
  const router = useRouter();

  // Hydrate badge from cache for instant first paint. Refreshed
  // from the server below, then kept live by realtime.
  const [unreadCount, setUnreadCount] = useState<number>(() => {
    if (typeof window === "undefined") return 0;
    try {
      const raw = window.localStorage.getItem(COUNT_CACHE_KEY);
      const n = raw ? parseInt(raw, 10) : 0;
      return Number.isFinite(n) && n >= 0 ? n : 0;
    } catch {
      return 0;
    }
  });
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [itemsLoaded, setItemsLoaded] = useState(false);
  const [open, setOpen] = useState(false);
  // Ref mirror of `open` so the realtime INSERT handler (a closure
  // captured at subscribe time) can read the CURRENT popover state
  // when deciding whether to fire a toast.
  const openRef = useRef(open);
  useEffect(() => {
    openRef.current = open;
  }, [open]);

  // Bell mounts before the auth state stabilizes — so realtime might
  // replay buffered events from before the user even logged in. We
  // skip toasts during the first ~2s after mount to avoid that
  // catch-up flood. Same trick avoids replaying on tab refocus.
  const armedAtRef = useRef<number>(Date.now());
  useEffect(() => {
    armedAtRef.current = Date.now();
  }, [userId]);

  // Persist count to localStorage so next mount paints instantly
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(COUNT_CACHE_KEY, String(unreadCount));
    } catch {
      // ignore
    }
  }, [unreadCount]);

  /* ─── Eager load: just the count ─────────────────────────────
   * One head-only query for the badge — much cheaper than fetching
   * 20 full rows on every page mount × every navigation. The full
   * list lazy-loads when the popover actually opens. */
  const loadCount = useCallback(async () => {
    if (!userId) return;
    const { count } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .is("read_at", null);
    setUnreadCount(count ?? 0);
  }, [userId]);

  useEffect(() => {
    if (!isAuthenticated) return;
    loadCount();
  }, [isAuthenticated, loadCount]);

  /* ─── Lazy load: full list when popover opens ────────────── */
  const loadItems = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase
      .from("notifications")
      .select("id, type, payload, link, read_at, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(PAGE_LIMIT);
    if (data) {
      setItems(data as NotificationRow[]);
      setItemsLoaded(true);
    }
  }, [userId]);

  useEffect(() => {
    if (open && !itemsLoaded) {
      loadItems();
    }
  }, [open, itemsLoaded, loadItems]);

  /* ─── Realtime — keep count + (loaded) list fresh ─────────────
   * Depends on userId (string), NOT user (object). The user object
   * gets a new reference on every token refresh / profile fetch,
   * which would tear down + rebuild the WebSocket every time. The
   * id is a stable primitive — the channel persists for the session. */
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`notifications_${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const row = payload.new as NotificationRow;
          setUnreadCount((c) => c + 1);
          setItems((prev) => {
            if (prev.length === 0) return prev; // not loaded yet
            if (prev.some((n) => n.id === row.id)) return prev;
            return [row, ...prev].slice(0, PAGE_LIMIT);
          });

          // ─── Toast for live events ────────────────────────────
          // Skip if popover is open (user already sees it) or if
          // the row is older than 5s (catch-up replay on reconnect /
          // tab refocus — already old, don't pop a toast for it).
          // Also skip during first 2s after mount (replay flood).
          const ageMs = Date.now() - new Date(row.created_at).getTime();
          const sinceArmedMs = Date.now() - armedAtRef.current;
          if (openRef.current || ageMs > 5000 || sinceArmedMs < 2000) {
            return;
          }

          const { title, body } = renderTitleBody(row, t);
          const toastId = `notif-${row.id}`;
          // Session-live gets a special "Join now" CTA — most
          // important live event, deserves the action button.
          if (row.type === "session_live") {
            toast(title, {
              id: toastId,
              description: body ?? undefined,
              action: {
                label: t.sessions?.adminJoinRoom || "Join",
                onClick: () => router.push(row.link ?? "/dashboard/sessions"),
              },
            });
          } else {
            // Generic toast — click banner navigates via the
            // notification's link.
            toast(title, {
              id: toastId,
              description: body ?? undefined,
              onAutoClose: () => {},
              action: row.link
                ? {
                    label: t.notifications?.viewAll || "Open",
                    onClick: () => router.push(row.link!),
                  }
                : undefined,
            });
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newRow = payload.new as NotificationRow;
          const oldRow = payload.old as Partial<NotificationRow>;
          // Track count change (read state)
          const wasUnread = !oldRow.read_at;
          const isUnread = !newRow.read_at;
          if (wasUnread && !isUnread) {
            setUnreadCount((c) => Math.max(0, c - 1));
          } else if (!wasUnread && isUnread) {
            setUnreadCount((c) => c + 1);
          }
          setItems((prev) =>
            prev.map((n) => (n.id === newRow.id ? newRow : n))
          );
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  /* ─── Actions ────────────────────────────────────────────── */
  const handleClickRow = useCallback(
    async (n: NotificationRow) => {
      if (!n.read_at && userId) {
        setUnreadCount((c) => Math.max(0, c - 1)); // optimistic
        await supabase
          .from("notifications")
          .update({ read_at: new Date().toISOString() })
          .eq("id", n.id);
        setItems((prev) =>
          prev.map((x) =>
            x.id === n.id
              ? { ...x, read_at: new Date().toISOString() }
              : x
          )
        );
      }
      setOpen(false);
      if (n.link) {
        router.push(n.link);
      }
    },
    [router, userId]
  );

  const handleMarkAllRead = useCallback(async () => {
    if (!userId || unreadCount === 0) return;
    const nowIso = new Date().toISOString();
    setUnreadCount(0); // optimistic
    await supabase
      .from("notifications")
      .update({ read_at: nowIso })
      .eq("user_id", userId)
      .is("read_at", null);
    setItems((prev) =>
      prev.map((n) => (n.read_at ? n : { ...n, read_at: nowIso }))
    );
  }, [userId, unreadCount]);

  if (!isAuthenticated) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="relative h-9 w-9"
            aria-label={t.notifications?.title || "Notifications"}
          />
        }
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span
            className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 font-mono text-[9px] font-bold text-primary-foreground tabular-nums ring-2 ring-background"
            aria-label={`${unreadCount} unread`}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent
        className="w-[calc(100vw-1rem)] sm:w-96 p-0"
        align="end"
        sideOffset={8}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
          <div className="space-y-0.5">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              / {t.notifications?.title || "Notifications"}
            </p>
            <h2 className="text-base font-medium tracking-tight text-foreground">
              {unreadCount > 0
                ? `${unreadCount} ${unreadCount === 1 ? "new" : "new"}`
                : t.notifications?.empty || "You're all caught up."}
            </h2>
          </div>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {t.notifications?.markAllRead || "Mark all as read"}
            </button>
          )}
        </div>

        {/* List — lazy loaded on first popover open */}
        <div className="max-h-[420px] overflow-y-auto divide-y divide-border/40">
          {!itemsLoaded ? (
            <div className="flex items-center justify-center py-10">
              <div
                className="h-5 w-5 animate-spin rounded-full border-2 border-muted border-t-primary"
                aria-label="Loading"
              />
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 px-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground/70">
                <Bell className="h-5 w-5" />
              </div>
              <p className="text-sm text-muted-foreground text-center">
                {t.notifications?.empty || "You're all caught up."}
              </p>
            </div>
          ) : (
            items.map((n) => (
              <NotificationRowItem
                key={n.id}
                n={n}
                t={t}
                language={language}
                onClick={() => handleClickRow(n)}
              />
            ))
          )}
        </div>
        {/* Footer: link to full history page */}
        {items.length > 0 && (
          <div className="border-t border-border/60 px-4 py-2.5">
            <Link
              href="/dashboard/notifications"
              onClick={() => setOpen(false)}
              className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {t.notifications?.viewAll || "View all"} →
            </Link>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

/* ─── Single row ──────────────────────────────────────────── */

function NotificationRowItem({
  n,
  t,
  language,
  onClick,
}: {
  n: NotificationRow;
  t: ReturnType<typeof useLanguage>["t"];
  language: string;
  onClick: () => void;
}) {
  const Icon = ICON_BY_TYPE[n.type] || Bell;
  const tone = TONE_BY_TYPE[n.type] || "muted";
  const { title, body } = renderTitleBody(n, t);
  const timeStr = relativeTime(n.created_at, language, t);
  const unread = !n.read_at;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40",
        unread && "bg-primary/[0.04]"
      )}
    >
      <div
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-full shrink-0 mt-0.5",
          tone === "primary" && "bg-primary/15 text-primary",
          tone === "amber" && "bg-amber-500/15 text-amber-500",
          tone === "destructive" && "bg-destructive/15 text-destructive",
          tone === "muted" && "bg-muted text-muted-foreground"
        )}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p
            className={cn(
              "text-sm leading-snug truncate",
              unread
                ? "font-medium text-foreground"
                : "text-muted-foreground"
            )}
          >
            {title}
          </p>
          {unread && (
            <span
              className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0"
              aria-label="Unread"
            />
          )}
        </div>
        {body && (
          <p className="text-xs text-muted-foreground/80 mt-0.5 line-clamp-2 leading-relaxed">
            {body}
          </p>
        )}
        <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground/60 mt-1">
          {timeStr}
        </p>
      </div>
    </button>
  );
}

/* ─── Type-specific config ────────────────────────────────── */

const ICON_BY_TYPE: Record<NotifType, React.ComponentType<{ className?: string }>> = {
  dm_message: MessageSquare,
  chat_mention: AtSign,
  announcement: Megaphone,
  new_course: BookPlus,
  session_booked: CalendarIcon,
  session_reminder: Clock,
  session_live: Video,
  session_cancelled: XCircle,
  session_updated: Pencil,
  pro_expiring: Crown,
  pro_renewed: CheckCircle2,
  pro_expired: XCircle,
  referral_signup: UserPlus,
  referral_rewarded: Gift,
  welcome: Sparkles,
};

const TONE_BY_TYPE: Record<NotifType, "primary" | "amber" | "destructive" | "muted"> = {
  dm_message: "primary",
  chat_mention: "primary",
  announcement: "amber",
  new_course: "primary",
  session_booked: "primary",
  session_reminder: "amber",
  session_live: "destructive", // red dot draws the eye for live
  session_cancelled: "destructive",
  session_updated: "amber",
  pro_expiring: "amber",
  pro_renewed: "primary",
  pro_expired: "destructive",
  referral_signup: "primary",
  referral_rewarded: "amber",
  welcome: "primary",
};

/**
 * Render a notification's title + body using the type-keyed i18n
 * templates with payload substitutions. Keeps notification text in
 * sync with the user's current locale every render — switch from
 * EN to FR and existing notifications instantly read in French.
 */
function renderTitleBody(
  n: NotificationRow,
  t: ReturnType<typeof useLanguage>["t"]
): { title: string; body: string | null } {
  const p = n.payload || {};
  const get = (k: string) => (p[k] as string | undefined) ?? "";
  const ns = t.notifications;
  if (!ns) return { title: "", body: null };

  const formatWhen = (iso: string | undefined) => {
    if (!iso) return "";
    const lang = (t.nav.signIn === "Sign In" ? "en-US" : "fr-FR");
    return new Date(iso).toLocaleString(lang, {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const sub = (s: string, vars: Record<string, string>) =>
    Object.entries(vars).reduce(
      (acc, [k, v]) => acc.replace(new RegExp(`\\{${k}\\}`, "g"), v),
      s
    );

  switch (n.type) {
    case "dm_message":
      return {
        title: sub(ns.dmMessageTitle, { sender: get("sender_name") }),
        body: get("preview")
          ? sub(ns.dmMessageBody, { preview: get("preview") })
          : null,
      };
    case "chat_mention":
      return {
        title: sub(ns.chatMentionTitle, { sender: get("sender_name") }),
        body: sub(ns.chatMentionBody, {
          channel: get("channel_name") || "—",
          preview: get("preview") || "",
        }),
      };
    case "session_booked":
      return {
        title: ns.sessionBookedTitle,
        body: sub(ns.sessionBookedBody, {
          title: get("title"),
          when: formatWhen(get("starts_at")),
        }),
      };
    case "session_reminder":
      return {
        title: sub(ns.sessionReminderTitle, { title: get("title") }),
        body: sub(ns.sessionReminderBody, {
          when: formatWhen(get("starts_at")),
          duration: String(p.duration_minutes ?? ""),
        }),
      };
    case "session_live":
      return {
        title: sub(ns.sessionLiveTitle, { title: get("title") }),
        body: ns.sessionLiveBody,
      };
    case "session_cancelled":
      return {
        title: ns.sessionCancelledTitle,
        body: sub(ns.sessionCancelledBody, { title: get("title") }),
      };
    case "session_updated":
      return {
        title: ns.sessionUpdatedTitle,
        body: sub(ns.sessionUpdatedBody, { title: get("title") }),
      };
    case "pro_expiring":
      return {
        title: sub(ns.proExpiringTitle, {
          days: String(p.days_left ?? ""),
        }),
        body: ns.proExpiringBody,
      };
    case "referral_rewarded":
      return {
        title: ns.referralRewardedTitle,
        body: ns.referralRewardedBody,
      };
    case "announcement":
      return {
        title: sub(ns.announcementTitle, {
          sender: get("sender_name"),
          channel: get("channel_name") || "—",
        }),
        body: get("preview")
          ? sub(ns.announcementBody, { preview: get("preview") })
          : null,
      };
    case "new_course":
      return {
        title: sub(ns.newCourseTitle, { title: get("title") }),
        body: ns.newCourseBody,
      };
    case "pro_renewed":
      return { title: ns.proRenewedTitle, body: ns.proRenewedBody };
    case "pro_expired":
      return { title: ns.proExpiredTitle, body: ns.proExpiredBody };
    case "referral_signup":
      return {
        title: sub(ns.referralSignupTitle, { name: get("name") || "Someone" }),
        body: ns.referralSignupBody,
      };
    case "welcome":
      return {
        title: ns.welcomeTitle,
        body: ns.welcomeBody,
      };
    default:
      return { title: "", body: null };
  }
}

/**
 * Relative-time formatter using the i18n strings. Handles "just now",
 * minutes/hours/days. Older than 7 days falls back to a date.
 */
function relativeTime(
  iso: string,
  language: string,
  t: ReturnType<typeof useLanguage>["t"]
): string {
  const ns = t.notifications;
  if (!ns) return iso;
  const elapsedMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(elapsedMs / 60000);
  const hours = Math.floor(elapsedMs / 3600000);
  const days = Math.floor(elapsedMs / 86400000);
  if (minutes < 1) return ns.timeJustNow;
  if (minutes < 60) return ns.timeMinutesAgo.replace("{n}", String(minutes));
  if (hours < 24) return ns.timeHoursAgo.replace("{n}", String(hours));
  if (days < 7) return ns.timeDaysAgo.replace("{n}", String(days));
  return new Date(iso).toLocaleDateString(
    language === "en" ? "en-US" : "fr-FR",
    { month: "short", day: "numeric" }
  );
}


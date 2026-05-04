"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
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
  | "session_booked"
  | "session_reminder"
  | "session_live"
  | "session_cancelled"
  | "session_updated"
  | "pro_expiring"
  | "referral_rewarded";

interface NotificationRow {
  id: string;
  type: NotifType;
  payload: Record<string, unknown>;
  link: string | null;
  read_at: string | null;
  created_at: string;
}

const PAGE_LIMIT = 20;

export function NotificationBell() {
  const { user, isAuthenticated } = useAuth();
  const { t, language } = useLanguage();
  const router = useRouter();
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [open, setOpen] = useState(false);

  const unreadCount = useMemo(
    () => items.filter((n) => !n.read_at).length,
    [items]
  );

  /* ─── Initial load ───────────────────────────────────────── */
  const loadNotifications = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("notifications")
      .select("id, type, payload, link, read_at, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(PAGE_LIMIT);
    if (data) setItems(data as NotificationRow[]);
  }, [user]);

  useEffect(() => {
    if (!isAuthenticated) return;
    loadNotifications();
  }, [isAuthenticated, loadNotifications]);

  /* ─── Realtime — new rows prepend, updates patch in place ── */
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`notifications_${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const row = payload.new as NotificationRow;
          setItems((prev) => {
            // Dedupe (Realtime can fire multiple times in some setups)
            if (prev.some((n) => n.id === row.id)) return prev;
            return [row, ...prev].slice(0, PAGE_LIMIT);
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const row = payload.new as NotificationRow;
          setItems((prev) =>
            prev.map((n) => (n.id === row.id ? row : n))
          );
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  /* ─── Actions ────────────────────────────────────────────── */
  const handleClickRow = useCallback(
    async (n: NotificationRow) => {
      if (!n.read_at && user) {
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
    [router, user]
  );

  const handleMarkAllRead = useCallback(async () => {
    if (!user || unreadCount === 0) return;
    const nowIso = new Date().toISOString();
    await supabase
      .from("notifications")
      .update({ read_at: nowIso })
      .eq("user_id", user.id)
      .is("read_at", null);
    setItems((prev) =>
      prev.map((n) => (n.read_at ? n : { ...n, read_at: nowIso }))
    );
  }, [user, unreadCount]);

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

        {/* List */}
        <div className="max-h-[420px] overflow-y-auto divide-y divide-border/40">
          {items.length === 0 ? (
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
  session_booked: CalendarIcon,
  session_reminder: Clock,
  session_live: Video,
  session_cancelled: XCircle,
  session_updated: Pencil,
  pro_expiring: Crown,
  referral_rewarded: Gift,
};

const TONE_BY_TYPE: Record<NotifType, "primary" | "amber" | "destructive" | "muted"> = {
  dm_message: "primary",
  chat_mention: "primary",
  session_booked: "primary",
  session_reminder: "amber",
  session_live: "destructive", // red dot draws the eye for live
  session_cancelled: "destructive",
  session_updated: "amber",
  pro_expiring: "amber",
  referral_rewarded: "amber",
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


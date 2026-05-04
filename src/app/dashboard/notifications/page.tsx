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
  Megaphone,
  BookPlus,
  Sparkles,
  UserPlus,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  CheckCheck,
  Filter,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/i18n/language-context";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

/**
 * Full notifications history at /dashboard/notifications.
 *
 * Companion to the topbar bell, which only shows the latest 20.
 * This page paginates through the full feed with a category filter.
 * Click "View all" in the bell or navigate directly. Each row
 * behaves identically to the bell row — click marks read + deep-
 * links via the notification's link field.
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

type FilterValue = "all" | "unread" | NotifType;

const PAGE_SIZE = 25;

export default function NotificationsHistoryPage() {
  const { user } = useAuth();
  const userId = user?.id;
  const { t, language } = useLanguage();
  const router = useRouter();

  const [items, setItems] = useState<NotificationRow[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterValue>("all");
  const [markingAll, setMarkingAll] = useState(false);

  const load = useCallback(
    async (resetPage = false) => {
      if (!userId) return;
      setLoading(true);
      const targetPage = resetPage ? 0 : page;
      let query = supabase
        .from("notifications")
        .select("id, type, payload, link, read_at, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .range(targetPage * PAGE_SIZE, targetPage * PAGE_SIZE + PAGE_SIZE - 1);
      if (filter === "unread") {
        query = query.is("read_at", null);
      } else if (filter !== "all") {
        query = query.eq("type", filter);
      }
      const { data } = await query;
      const rows = (data ?? []) as NotificationRow[];
      setItems(rows);
      setHasMore(rows.length === PAGE_SIZE);
      setLoading(false);
      if (resetPage) setPage(0);
    },
    [userId, page, filter]
  );

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, page, filter]);

  const handleClickRow = useCallback(
    async (n: NotificationRow) => {
      if (!n.read_at && userId) {
        await supabase
          .from("notifications")
          .update({ read_at: new Date().toISOString() })
          .eq("id", n.id);
        setItems((prev) =>
          prev.map((x) =>
            x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x
          )
        );
      }
      if (n.link) router.push(n.link);
    },
    [router, userId]
  );

  const handleMarkAllRead = useCallback(async () => {
    if (!userId) return;
    setMarkingAll(true);
    const nowIso = new Date().toISOString();
    await supabase
      .from("notifications")
      .update({ read_at: nowIso })
      .eq("user_id", userId)
      .is("read_at", null);
    setItems((prev) =>
      prev.map((n) => (n.read_at ? n : { ...n, read_at: nowIso }))
    );
    setMarkingAll(false);
  }, [userId]);

  const filterOptions = useMemo<
    { key: FilterValue; label: string }[]
  >(() => {
    const isEn = t.nav.signIn === "Sign In";
    return [
      { key: "all", label: isEn ? "All" : "Tous" },
      { key: "unread", label: isEn ? "Unread" : "Non lus" },
      {
        key: "dm_message",
        label: t.notifications?.typeLabelDmMessage || "DMs",
      },
      {
        key: "chat_mention",
        label: t.notifications?.typeLabelChatMention || "Mentions",
      },
      {
        key: "session_booked",
        label: t.notifications?.typeLabelSession || "Sessions",
      },
      {
        key: "new_course",
        label: t.notifications?.typeLabelNewCourse || "New courses",
      },
      {
        key: "announcement",
        label: t.notifications?.typeLabelAnnouncement || "Announcements",
      },
    ];
  }, [t]);

  return (
    <div className="px-4 py-8 lg:px-8 lg:py-12 max-w-4xl mx-auto space-y-8">
      {/* ── Hero ────────────────────────────────────────────── */}
      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div className="space-y-2">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            / {t.notifications?.title || "Notifications"}
          </p>
          <h1 className="text-3xl sm:text-4xl font-medium tracking-tight text-foreground">
            {t.notifications?.title || "Notifications"}
          </h1>
        </div>
        <Button
          variant="outline"
          onClick={handleMarkAllRead}
          disabled={markingAll}
          className="gap-1.5 shrink-0"
        >
          {markingAll ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <CheckCheck className="h-3.5 w-3.5" />
          )}
          {t.notifications?.markAllRead || "Mark all as read"}
        </Button>
      </header>

      {/* ── Filter chips ────────────────────────────────────── */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="h-3.5 w-3.5 text-muted-foreground/70" />
        <div className="inline-flex items-center gap-1 rounded-lg border border-border/60 bg-card p-1 flex-wrap">
          {filterOptions.map((opt) => {
            const active = filter === opt.key;
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => {
                  setFilter(opt.key);
                  setPage(0);
                }}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                  active
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── List ────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/70" />
        </div>
      ) : items.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center text-center py-16 gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground/70">
              <Bell className="h-5 w-5" />
            </div>
            <p className="text-sm text-muted-foreground">
              {t.notifications?.empty || "You're all caught up."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y divide-border/60">
              {items.map((n) => (
                <NotificationFullRow
                  key={n.id}
                  n={n}
                  t={t}
                  language={language}
                  onClick={() => handleClickRow(n)}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Pagination ──────────────────────────────────────── */}
      {!loading && items.length > 0 && (
        <div className="flex items-center justify-between gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="gap-1.5"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            {t.nav.signIn === "Sign In" ? "Previous" : "Précédent"}
          </Button>
          <span className="font-mono text-[11px] text-muted-foreground tabular-nums">
            {t.nav.signIn === "Sign In" ? "Page" : "Page"} {page + 1}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setPage((p) => p + 1)}
            disabled={!hasMore}
            className="gap-1.5"
          >
            {t.nav.signIn === "Sign In" ? "Next" : "Suivant"}
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}

/* ─── Single full-row (slightly bigger than the bell row) ───── */

function NotificationFullRow({
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
  const timeStr = absoluteTime(n.created_at, language);
  const unread = !n.read_at;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-start gap-4 px-5 py-4 text-left transition-colors hover:bg-muted/40",
        unread && "bg-primary/[0.04]"
      )}
    >
      <div
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-full shrink-0 mt-0.5",
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
              "text-sm leading-snug",
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
          <p className="text-xs text-muted-foreground/80 mt-1 leading-relaxed">
            {body}
          </p>
        )}
        <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground/60 mt-1.5">
          {timeStr}
        </p>
      </div>
    </button>
  );
}

/* ─── Type config (mirrored from notification-bell.tsx) ──────
 * Kept duplicated for now — both files render notifications. If we
 * add a third surface (e.g. mobile), extract to
 * src/lib/notifications/render.ts.
 */

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
  session_live: "destructive",
  session_cancelled: "destructive",
  session_updated: "amber",
  pro_expiring: "amber",
  pro_renewed: "primary",
  pro_expired: "destructive",
  referral_signup: "primary",
  referral_rewarded: "amber",
  welcome: "primary",
};

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
        title: sub(ns.proExpiringTitle, { days: String(p.days_left ?? "") }),
        body: ns.proExpiringBody,
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
    case "referral_rewarded":
      return { title: ns.referralRewardedTitle, body: ns.referralRewardedBody };
    case "welcome":
      return { title: ns.welcomeTitle, body: ns.welcomeBody };
    default:
      return { title: "", body: null };
  }
}

function absoluteTime(iso: string, language: string): string {
  return new Date(iso).toLocaleString(
    language === "en" ? "en-US" : "fr-FR",
    {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  );
}


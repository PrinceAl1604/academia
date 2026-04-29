"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Compass,
  BookOpen,
  Settings,
  CreditCard,
  Shield,
  BarChart3,
  KeyRound,
  FolderOpen,
  Users,
  Gift,
  LogOut,
  PanelLeftClose,
  PanelLeft,
  MessageSquare,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/i18n/language-context";
import { useSidebar } from "@/lib/sidebar-context";
import { ReferralModal } from "@/components/shared/referral-modal";

/**
 * Dashboard sidebar — Cook-OS-flavored refresh.
 *
 * Migrated from hardcoded `bg-white dark:bg-neutral-950 / bg-neutral-100`
 * etc. to the semantic `bg-sidebar / bg-sidebar-accent / border-sidebar-border`
 * tokens defined in globals.css. Means this file no longer relies on the
 * override-block translations and is ready for Phase 9's cleanup.
 *
 * The active-nav treatment combines a subtle `bg-sidebar-accent` fill
 * with a 2-px primary-green left edge — operator-console aesthetic that
 * makes the current page unmistakable without a heavy fill.
 *
 * Group labels switched to monospace + uppercase (`font-mono` + `uppercase`)
 * to fit the new design language. Reads as "section heading" rather than
 * "shouting label" because mono at 11px feels deliberate, not loud.
 */
export function DashboardSidebar() {
  const pathname = usePathname();
  const { isAdmin, userName, logout, isAuthenticated } = useAuth();
  const { t } = useLanguage();
  const { collapsed, toggle } = useSidebar();
  const [referralOpen, setReferralOpen] = useState(false);
  const [unreadChat, setUnreadChat] = useState(0);

  // Poll unread chat count every 30s
  const fetchUnread = useCallback(async () => {
    try {
      const res = await fetch("/api/chat/unread");
      if (res.ok) {
        const { count } = await res.json();
        setUnreadChat(count ?? 0);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchUnread();
    const interval = setInterval(fetchUnread, 30_000);
    return () => clearInterval(interval);
  }, [isAuthenticated, fetchUnread]);

  // ─── Navigation (grouped) ────────────────────────────────────
  type NavItem = {
    label: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
  };
  type NavGroup = { label?: string; items: NavItem[] };

  const studentNavGroups: NavGroup[] = [
    {
      items: [
        // Dashboard goes first — it's the personalized stats overview the
        // student lands on after sign-in. Browse (the catalog at `/`) is
        // discovery, conceptually one step further out.
        { label: t.dashboard.title || "Dashboard", href: "/dashboard", icon: LayoutDashboard },
        { label: t.dashboard.browse || "Browse", href: "/", icon: Compass },
        { label: t.myCourses.title || "My Courses", href: "/dashboard/courses", icon: BookOpen },
        { label: t.community?.title || "Community", href: "/dashboard/community", icon: MessageSquare, badge: unreadChat },
      ],
    },
  ];

  const adminNavGroups: NavGroup[] = [
    {
      items: [
        { label: t.admin.dashboard, href: "/admin", icon: Shield },
        { label: t.admin.analytics, href: "/admin/analytics", icon: BarChart3 },
      ],
    },
    {
      label: t.sidebar.content || "Content",
      items: [
        { label: t.sidebar.explorer, href: "/admin/explorer", icon: LayoutDashboard },
        { label: t.admin.manageCourses, href: "/admin/courses", icon: BookOpen },
        { label: t.sidebar.categories, href: "/admin/categories", icon: FolderOpen },
      ],
    },
    {
      label: t.sidebar.management || "Management",
      items: [
        { label: t.sidebar.students, href: "/admin/students", icon: Users },
        { label: t.admin.licences, href: "/admin/licences", icon: KeyRound },
        { label: t.admin.referrals, href: "/admin/referrals", icon: Gift },
      ],
    },
    {
      label: t.sidebar.engage || "Engage",
      items: [
        { label: t.community?.title || "Community", href: "/dashboard/community", icon: MessageSquare, badge: unreadChat },
      ],
    },
  ];

  const studentAccountNav: NavItem[] = [
    { label: t.subscription.title || "Subscription", href: "/dashboard/subscription", icon: CreditCard },
    { label: t.settings.title || "Settings", href: "/dashboard/settings", icon: Settings },
  ];

  const adminAccountNav: NavItem[] = [
    { label: t.settings.title || "Settings", href: "/admin/settings", icon: Settings },
  ];

  const navGroups = isAdmin ? adminNavGroups : studentNavGroups;
  const accountItems = isAdmin ? adminAccountNav : studentAccountNav;

  const initials = (userName || "U")
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase();

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 hidden h-screen flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:flex transition-[width] duration-300 ease-in-out",
        collapsed ? "w-[68px]" : "w-60"
      )}
    >
      {/* ─── Logo ──────────────────────────────────────────── */}
      <div className={cn("flex h-14 items-center shrink-0", collapsed ? "justify-center px-0" : "px-5")}>
        <Link href={isAdmin ? "/admin" : "/"} className="flex items-center overflow-hidden">
          {collapsed ? (
            // We're dark-only now, so always render the dark-bg-friendly favicon
            <img src="/favicon-dark.svg" alt="Brightroots" className="h-8 w-8 shrink-0 rounded-lg" />
          ) : (
            <img src="/logo-login-light.svg" alt="Brightroots" className="h-5" />
          )}
        </Link>
      </div>

      {/* ─── Main Navigation ───────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto py-3 px-2.5" aria-label="Main navigation">
        {navGroups.map((group, gi) => (
          <div key={gi} className={gi > 0 ? "mt-4" : ""}>
            {/* Group label (expanded) / divider (collapsed) */}
            {group.label && (
              <>
                {!collapsed && (
                  <p className="mb-1.5 px-2.5 font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                    {group.label}
                  </p>
                )}
                {collapsed && (
                  <div className="mb-1.5 mx-2.5 h-px bg-sidebar-border" />
                )}
              </>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                // `/` (Browse) and `/dashboard` (Dashboard) are exact-match
                // only — they're parents of other nav entries (`/dashboard/
                // courses`, `/dashboard/community`, etc.) and a startsWith
                // match would highlight both Dashboard AND its child route
                // simultaneously.
                const isExactOnly =
                  item.href === "/" || item.href === "/dashboard";
                const isActive = isExactOnly
                  ? pathname === item.href
                  : pathname === item.href ||
                    pathname.startsWith(item.href + "/");
                return (
                  <SidebarItem
                    key={item.href}
                    href={item.href}
                    icon={item.icon}
                    label={item.label}
                    isActive={isActive}
                    collapsed={collapsed}
                    badge={item.badge}
                  />
                );
              })}
            </div>
          </div>
        ))}

        {/* ─── Invite Friends (students only) ─────────────── */}
        {!isAdmin && (
          <div className="mt-4">
            {collapsed && <div className="mb-1.5 mx-2.5 h-px bg-sidebar-border" />}
            <button
              onClick={() => setReferralOpen(true)}
              title={collapsed ? t.referral.inviteFriends : undefined}
              className={cn(
                "group relative flex w-full items-center rounded-md transition-colors text-amber-400 hover:bg-amber-500/10 hover:text-amber-300",
                collapsed ? "justify-center p-2.5" : "gap-2.5 px-2.5 py-2"
              )}
            >
              <Gift className={cn("shrink-0", collapsed ? "h-[18px] w-[18px]" : "h-4 w-4")} />
              {!collapsed && <span className="text-sm font-medium truncate">{t.referral.inviteFriends}</span>}
              {collapsed && (
                <span className="pointer-events-none absolute left-full ml-3 z-50 hidden rounded-md border border-border/60 bg-popover px-2.5 py-1.5 text-xs font-medium text-popover-foreground shadow-xl shadow-black/30 group-hover:block whitespace-nowrap">
                  {t.referral.inviteFriends}
                </span>
              )}
            </button>
          </div>
        )}

        {/* ─── Account Section ─────────────────────────────── */}
        <div className="mt-6">
          {!collapsed && (
            <p className="mb-1.5 px-2.5 font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
              {isAdmin ? "Admin" : t.sidebar.account}
            </p>
          )}
          {collapsed && <div className="mb-1.5 mx-2.5 h-px bg-sidebar-border" />}
          <div className="space-y-0.5">
            {accountItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <SidebarItem
                  key={item.href}
                  href={item.href}
                  icon={item.icon}
                  label={item.label}
                  isActive={isActive}
                  collapsed={collapsed}
                />
              );
            })}
          </div>
        </div>
      </nav>

      {/* ─── Bottom: user + collapse toggle ────────────────── */}
      <div className="shrink-0 border-t border-sidebar-border p-2.5 space-y-1">
        {/* User profile row */}
        <button
          onClick={logout}
          className={cn(
            "flex w-full items-center gap-2.5 rounded-md p-2 text-left transition-colors hover:bg-sidebar-accent",
            collapsed ? "justify-center" : ""
          )}
          title={collapsed ? `${userName || "User"} · ${t.dashboard.signOut}` : undefined}
        >
          <Avatar className="h-7 w-7 shrink-0">
            <AvatarFallback className="bg-muted text-[11px] font-semibold text-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate leading-tight">
                  {userName || "User"}
                </p>
                <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground leading-tight mt-0.5">
                  {isAdmin ? "Admin" : t.sidebar.student}
                </p>
              </div>
              <LogOut className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            </>
          )}
        </button>

        {/* Collapse toggle */}
        <button
          onClick={toggle}
          className={cn(
            "flex w-full items-center gap-2.5 rounded-md p-2 text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground",
            collapsed ? "justify-center" : ""
          )}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          {!collapsed && <span className="text-sm">{t.sidebar.collapse}</span>}
        </button>
      </div>
      {/* Referral Modal */}
      {!isAdmin && <ReferralModal open={referralOpen} onClose={() => setReferralOpen(false)} />}
    </aside>
  );
}

/* ─── Sidebar Item ─────────────────────────────────────────── */
/**
 * A single nav row. Active state has two visual cues:
 *   1. `bg-sidebar-accent` fill — subtle, won't dominate
 *   2. 2-px primary-green left edge (via `before:` pseudo) — the
 *      "operator console" indicator that makes the current page
 *      unambiguous on the page-load scan
 *
 * In collapsed mode the left-edge bar is hidden because the rail is
 * only 68px wide and the bar would overlap the icon.
 */
function SidebarItem({
  href,
  icon: Icon,
  label,
  isActive,
  collapsed,
  badge,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  isActive: boolean;
  collapsed: boolean;
  badge?: number;
}) {
  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      title={collapsed ? label : undefined}
      className={cn(
        "group relative flex items-center rounded-md transition-colors",
        // 2px primary-green left edge when active (expanded only)
        !collapsed &&
          isActive &&
          "before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-[2px] before:rounded-r-sm before:bg-primary",
        collapsed ? "justify-center p-2.5" : "gap-2.5 pl-3 pr-2.5 py-2",
        isActive
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground"
      )}
    >
      <span className="relative shrink-0">
        <Icon className={cn(collapsed ? "h-[18px] w-[18px]" : "h-4 w-4")} />
        {/* Badge dot — collapsed mode */}
        {collapsed && !!badge && badge > 0 && (
          <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-sidebar" />
        )}
      </span>
      {!collapsed && <span className="flex-1 text-sm font-medium truncate">{label}</span>}

      {/* Badge count — expanded mode */}
      {!collapsed && !!badge && badge > 0 && (
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground tabular-nums px-1 shrink-0">
          {badge > 99 ? "99+" : badge}
        </span>
      )}

      {/* Tooltip — only in collapsed mode */}
      {collapsed && (
        <span className="pointer-events-none absolute left-full ml-3 z-50 hidden rounded-md border border-border/60 bg-popover px-2.5 py-1.5 text-xs font-medium text-popover-foreground shadow-xl shadow-black/30 group-hover:block whitespace-nowrap">
          {label}
          {!!badge && badge > 0 && (
            <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground tabular-nums px-1">
              {badge > 99 ? "99+" : badge}
            </span>
          )}
        </span>
      )}
    </Link>
  );
}

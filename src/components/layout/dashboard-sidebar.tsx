"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
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
        { label: t.dashboard.browse || "Browse", href: "/", icon: LayoutDashboard },
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
        "fixed left-0 top-0 z-40 hidden h-screen flex-col border-r border-neutral-200/70 dark:border-neutral-800 bg-white dark:bg-neutral-950 lg:flex transition-[width] duration-300 ease-in-out",
        collapsed ? "w-[68px]" : "w-60"
      )}
    >
      {/* ─── Logo ──────────────────────────────────────────── */}
      <div className={cn("flex h-14 items-center shrink-0", collapsed ? "justify-center px-0" : "px-5")}>
        <Link href={isAdmin ? "/admin" : "/"} className="flex items-center overflow-hidden">
          {collapsed ? (
            <>
              <img src="/favicon-light.svg" alt="Brightroots" className="h-8 w-8 shrink-0 rounded-lg block dark:hidden" />
              <img src="/favicon-dark.svg" alt="Brightroots" className="h-8 w-8 shrink-0 rounded-lg hidden dark:block" />
            </>
          ) : (
            <>
              <img src="/logo-login-dark.svg" alt="Brightroots" className="h-5 block dark:hidden" />
              <img src="/logo-login-light.svg" alt="Brightroots" className="h-5 hidden dark:block" />
            </>
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
                  <p className="mb-1.5 px-2.5 text-[11px] font-medium uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                    {group.label}
                  </p>
                )}
                {collapsed && (
                  <div className="mb-1.5 mx-2.5 h-px bg-neutral-200/70 dark:bg-neutral-800" />
                )}
              </>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive =
                  item.href === "/"
                    ? pathname === "/"
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
            {collapsed && <div className="mb-1.5 mx-2.5 h-px bg-neutral-200/70 dark:bg-neutral-800" />}
            <button
              onClick={() => setReferralOpen(true)}
              title={collapsed ? t.referral.inviteFriends : undefined}
              className={cn(
                "group relative flex w-full items-center rounded-lg transition-colors text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20",
                collapsed ? "justify-center p-2.5" : "gap-2.5 px-2.5 py-2"
              )}
            >
              <Gift className={cn("shrink-0", collapsed ? "h-[18px] w-[18px]" : "h-4 w-4")} />
              {!collapsed && <span className="text-sm font-medium truncate">{t.referral.inviteFriends}</span>}
              {collapsed && (
                <span className="pointer-events-none absolute left-full ml-3 z-50 hidden rounded-lg bg-neutral-800 dark:bg-neutral-700 px-2.5 py-1.5 text-xs font-medium text-white shadow-lg group-hover:block whitespace-nowrap">
                  {t.referral.inviteFriends}
                </span>
              )}
            </button>
          </div>
        )}

        {/* ─── Account Section ─────────────────────────────── */}
        <div className="mt-6">
          {!collapsed && (
            <p className="mb-1.5 px-2.5 text-[11px] font-medium uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
              {isAdmin ? "Admin" : t.sidebar.account}
            </p>
          )}
          {collapsed && <div className="mb-1.5 mx-2.5 h-px bg-neutral-200/70 dark:bg-neutral-800" />}
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
      <div className="shrink-0 border-t border-neutral-200/70 dark:border-neutral-800 p-2.5 space-y-1">
        {/* User profile row */}
        <button
          onClick={logout}
          className={cn(
            "flex w-full items-center gap-2.5 rounded-lg p-2 text-left transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800/60",
            collapsed ? "justify-center" : ""
          )}
          title={collapsed ? `${userName || "User"} · ${t.dashboard.signOut}` : undefined}
        >
          <Avatar className="h-7 w-7 shrink-0">
            <AvatarFallback className="bg-neutral-100 dark:bg-neutral-800 text-[11px] font-semibold text-neutral-600 dark:text-neutral-300">
              {initials}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200 truncate leading-tight">
                  {userName || "User"}
                </p>
                <p className="text-[11px] text-neutral-400 dark:text-neutral-500 leading-tight">
                  {isAdmin ? "Admin" : t.sidebar.student}
                </p>
              </div>
              <LogOut className="h-3.5 w-3.5 text-neutral-400 shrink-0" />
            </>
          )}
        </button>

        {/* Collapse toggle */}
        <button
          onClick={toggle}
          className={cn(
            "flex w-full items-center gap-2.5 rounded-lg p-2 text-neutral-400 dark:text-neutral-500 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800/60 hover:text-neutral-600 dark:hover:text-neutral-300",
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
        "group relative flex items-center rounded-lg transition-colors",
        collapsed ? "justify-center p-2.5" : "gap-2.5 px-2.5 py-2",
        isActive
          ? "bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white"
          : "text-neutral-500 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800/40 hover:text-neutral-800 dark:hover:text-neutral-200"
      )}
    >
      <span className="relative shrink-0">
        <Icon className={cn(collapsed ? "h-[18px] w-[18px]" : "h-4 w-4")} />
        {/* Badge dot — collapsed mode */}
        {collapsed && !!badge && badge > 0 && (
          <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-green-600 ring-2 ring-white dark:ring-neutral-950" />
        )}
      </span>
      {!collapsed && <span className="flex-1 text-sm font-medium truncate">{label}</span>}

      {/* Badge count — expanded mode */}
      {!collapsed && !!badge && badge > 0 && (
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-green-600 text-[10px] font-bold text-white px-1 shrink-0">
          {badge > 99 ? "99+" : badge}
        </span>
      )}

      {/* Tooltip — only in collapsed mode */}
      {collapsed && (
        <span className="pointer-events-none absolute left-full ml-3 z-50 hidden rounded-lg bg-neutral-800 dark:bg-neutral-700 px-2.5 py-1.5 text-xs font-medium text-white shadow-lg group-hover:block whitespace-nowrap">
          {label}
          {!!badge && badge > 0 && (
            <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-green-600 text-[9px] font-bold text-white px-1">
              {badge > 99 ? "99+" : badge}
            </span>
          )}
        </span>
      )}
    </Link>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  BookOpen,
  CreditCard,
  Shield,
  BarChart3,
  KeyRound,
  FolderOpen,
  Users,
  Gift,
  Video,
  Hash,
  ExternalLink,
  Lock,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/i18n/language-context";
import { useSidebar } from "@/lib/sidebar-context";
import { ReferralModal } from "@/components/shared/referral-modal";
import { Logo } from "@/components/shared/logo";
import { Symbol } from "@/components/shared/symbol";
import { useCommunityNav } from "@/lib/community/use-community-nav";
import type { SpaceNav } from "@/lib/community/types";

/**
 * Dashboard sidebar.
 *
 * Two modes, chosen by route:
 *  • Admin area (`/admin/*`, admins only) → the admin management nav.
 *  • Everywhere else → the Circle-style **community nav**: Space Groups →
 *    Spaces from the DB. Pro spaces show with a 🔒 for non-Pro members.
 */
export function DashboardSidebar() {
  const pathname = usePathname();
  const { isAdmin, isPro } = useAuth();
  const { t } = useLanguage();
  const { collapsed } = useSidebar();
  const [referralOpen, setReferralOpen] = useState(false);
  const { groups } = useCommunityNav();

  const adminMode = isAdmin && pathname.startsWith("/admin");
  const canSeePro = isPro || isAdmin;

  type NavItem = {
    label: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
  };
  type NavGroup = { label?: string; items: NavItem[] };

  // ─── Admin management nav (Explorer removed) ─────────────────
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
        { label: t.admin.sessions || "Live sessions", href: "/admin/sessions", icon: Video },
      ],
    },
  ];

  // ─── Account section (community mode) ────────────────────────
  const accountItems: NavItem[] = [
    { label: t.dashboard.title || "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    ...(!isAdmin
      ? [{ label: t.subscription.title || "Subscription", href: "/dashboard/subscription", icon: CreditCard }]
      : [{ label: t.admin.dashboard || "Admin", href: "/admin", icon: Shield }]),
  ];

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 hidden h-screen flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:flex transition-[width] duration-300 ease-in-out",
        collapsed ? "w-[68px]" : "w-60"
      )}
    >
      {/* ─── Logo ────────────────────────────────────────────── */}
      <div className={cn("flex h-14 items-center shrink-0", collapsed ? "justify-center px-0" : "px-5")}>
        <Link href={isAdmin && adminMode ? "/admin" : "/"} className="flex items-center overflow-hidden">
          {collapsed ? <Symbol className="h-8 w-8 shrink-0" /> : <Logo className="h-5" />}
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto py-3 px-2.5" aria-label="Main navigation">
        {adminMode ? (
          /* ─── Admin nav ─────────────────────────────────── */
          adminNavGroups.map((group, gi) => (
            <div key={gi} className={gi > 0 ? "mt-4" : ""}>
              {group.label && (
                <>
                  {!collapsed && (
                    <p className="mb-1.5 px-2.5 font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                      {group.label}
                    </p>
                  )}
                  {collapsed && <div className="mb-1.5 mx-2.5 h-px bg-sidebar-border" />}
                </>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const isExactOnly = item.href === "/admin";
                  const isActive = isExactOnly
                    ? pathname === item.href
                    : pathname === item.href || pathname.startsWith(item.href + "/");
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
          ))
        ) : (
          /* ─── Community nav (Space Groups → Spaces) ──────── */
          <>
            {groups.map((group, gi) => (
              <div key={group.id} className={gi > 0 ? "mt-4" : ""}>
                {!collapsed && (
                  <p className="mb-1.5 px-2.5 font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                    {group.emoji ? `${group.emoji} ` : ""}
                    {group.name}
                  </p>
                )}
                {collapsed && <div className="mb-1.5 mx-2.5 h-px bg-sidebar-border" />}
                <div className="space-y-0.5">
                  {group.spaces.map((space) => (
                    <SpaceItem
                      key={space.id}
                      space={space}
                      collapsed={collapsed}
                      pathname={pathname}
                      locked={space.access === "pro" && !canSeePro}
                    />
                  ))}
                </div>
              </div>
            ))}

            {/* Invite friends (members only) */}
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
                  {!collapsed && (
                    <span className="text-sm font-medium truncate">{t.referral.inviteFriends}</span>
                  )}
                </button>
              </div>
            )}

            {/* Account */}
            <div className="mt-6">
              {!collapsed && (
                <p className="mb-1.5 px-2.5 font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                  {t.sidebar.account || "Account"}
                </p>
              )}
              {collapsed && <div className="mb-1.5 mx-2.5 h-px bg-sidebar-border" />}
              <div className="space-y-0.5">
                {accountItems.map((item) => (
                  <SidebarItem
                    key={item.href}
                    href={item.href}
                    icon={item.icon}
                    label={item.label}
                    isActive={pathname === item.href}
                    collapsed={collapsed}
                  />
                ))}
              </div>
            </div>
          </>
        )}
      </nav>

      {!isAdmin && <ReferralModal open={referralOpen} onClose={() => setReferralOpen(false)} />}
    </aside>
  );
}

/* ─── Space item (community nav) ─────────────────────────────── */
/** A Space row: emoji (or Hash) + name. Link spaces open their URL; Pro
 *  spaces a non-Pro member can't open show a lock and route to the wall. */
function SpaceItem({
  space,
  collapsed,
  pathname,
  locked,
}: {
  space: SpaceNav;
  collapsed: boolean;
  pathname: string;
  locked: boolean;
}) {
  const isExternal = space.type === "link" && !locked;
  const href = isExternal ? space.link_url || "#" : `/spaces/${space.slug}`;
  const isActive = !isExternal && pathname === `/spaces/${space.slug}`;

  const inner = (
    <>
      <span className="relative flex h-[18px] w-[18px] shrink-0 items-center justify-center">
        {space.emoji ? (
          <span className="text-[15px] leading-none">{space.emoji}</span>
        ) : (
          <Hash className={collapsed ? "h-[18px] w-[18px]" : "h-4 w-4"} />
        )}
      </span>
      {!collapsed && <span className="flex-1 text-sm font-medium truncate">{space.name}</span>}
      {!collapsed && locked && <Lock className="h-3.5 w-3.5 shrink-0 opacity-60" />}
      {!collapsed && isExternal && <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-60" />}
    </>
  );

  const className = cn(
    "group relative flex items-center rounded-md transition-colors",
    !collapsed &&
      isActive &&
      "before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-[2px] before:rounded-r-sm before:bg-primary",
    collapsed ? "justify-center p-2.5" : "gap-2.5 pl-3 pr-2.5 py-2",
    isActive
      ? "bg-sidebar-accent text-sidebar-accent-foreground"
      : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground"
  );

  if (isExternal) {
    return (
      <a
        href={href}
        target={space.link_open_in_new ? "_blank" : undefined}
        rel={space.link_open_in_new ? "noopener noreferrer" : undefined}
        title={collapsed ? space.name : undefined}
        className={className}
      >
        {inner}
      </a>
    );
  }

  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      title={collapsed ? space.name : undefined}
      className={className}
    >
      {inner}
    </Link>
  );
}

/* ─── Sidebar item (icon-based) ──────────────────────────────── */
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
        {collapsed && !!badge && badge > 0 && (
          <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-sidebar" />
        )}
      </span>
      {!collapsed && <span className="flex-1 text-sm font-medium truncate">{label}</span>}

      {!collapsed && !!badge && badge > 0 && (
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground tabular-nums px-1 shrink-0">
          {badge > 99 ? "99+" : badge}
        </span>
      )}

      {collapsed && (
        <span className="pointer-events-none absolute left-full ml-3 z-50 hidden rounded-md border border-border/60 bg-popover px-2.5 py-1.5 text-xs font-medium text-popover-foreground shadow-xl shadow-black/30 group-hover:block whitespace-nowrap">
          {label}
        </span>
      )}
    </Link>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  BookOpen,
  Trophy,
  Settings,
  CreditCard,
  Shield,
  BarChart3,
  KeyRound,
  FolderOpen,
  Users,
  LogOut,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/i18n/language-context";
import { useSidebar } from "@/lib/sidebar-context";

export function DashboardSidebar() {
  const pathname = usePathname();
  const { isAdmin, userName, logout } = useAuth();
  const { t } = useLanguage();
  const isEn = t.nav.signIn === "Sign In";
  const { collapsed, toggle } = useSidebar();

  // ─── Navigation ─────────────────────────────────────────────
  const studentNav = [
    { label: t.dashboard.browse || "Browse", href: "/", icon: LayoutDashboard },
    { label: t.myCourses.title || "My Courses", href: "/dashboard/courses", icon: BookOpen },
    { label: t.certificatesPage.title || "Certificates", href: "/dashboard/certificates", icon: Trophy },
  ];

  const studentAccountNav = [
    { label: t.subscription.title || "Subscription", href: "/dashboard/subscription", icon: CreditCard },
    { label: t.settings.title || "Settings", href: "/dashboard/settings", icon: Settings },
  ];

  const adminNav = [
    { label: t.admin.dashboard, href: "/admin", icon: Shield },
    { label: isEn ? "Explorer" : "Explorateur", href: "/admin/explorer", icon: LayoutDashboard },
    { label: t.admin.manageCourses, href: "/admin/courses", icon: BookOpen },
    { label: isEn ? "Categories" : "Catégories", href: "/admin/categories", icon: FolderOpen },
    { label: t.admin.licences, href: "/admin/licences", icon: KeyRound },
    { label: isEn ? "Students" : "Étudiants", href: "/admin/students", icon: Users },
    { label: t.admin.analytics, href: "/admin/analytics", icon: BarChart3 },
  ];

  const adminAccountNav = [
    { label: t.settings.title || "Settings", href: "/admin/settings", icon: Settings },
  ];

  const navItems = isAdmin ? adminNav : studentNav;
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
        <div className="space-y-0.5">
          {navItems.map((item) => {
            const isActive = item.href === "/"
              ? pathname === "/"
              : pathname === item.href || pathname.startsWith(item.href + "/");
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

        {/* ─── Account Section ─────────────────────────────── */}
        <div className="mt-6">
          {!collapsed && (
            <p className="mb-1.5 px-2.5 text-[11px] font-medium uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
              {isAdmin ? "Admin" : (isEn ? "Account" : "Compte")}
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
          title={collapsed ? `${userName || "User"} · ${isEn ? "Sign out" : "Déconnexion"}` : undefined}
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
                  {isAdmin ? "Admin" : (isEn ? "Student" : "Étudiant")}
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
          {!collapsed && <span className="text-sm">{isEn ? "Collapse" : "Réduire"}</span>}
        </button>
      </div>
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
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  isActive: boolean;
  collapsed: boolean;
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
      <Icon className={cn("shrink-0", collapsed ? "h-[18px] w-[18px]" : "h-4 w-4")} />
      {!collapsed && <span className="text-sm font-medium truncate">{label}</span>}

      {/* Tooltip — only in collapsed mode */}
      {collapsed && (
        <span className="pointer-events-none absolute left-full ml-3 z-50 hidden rounded-lg bg-neutral-800 dark:bg-neutral-700 px-2.5 py-1.5 text-xs font-medium text-white shadow-lg group-hover:block whitespace-nowrap">
          {label}
        </span>
      )}
    </Link>
  );
}

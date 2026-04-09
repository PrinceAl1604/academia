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
  ChevronsLeft,
  ChevronsRight,
  LogOut,
  Moon,
  Sun,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/i18n/language-context";
import { useSidebar } from "@/lib/sidebar-context";
import { useState, useEffect } from "react";

export function DashboardSidebar() {
  const pathname = usePathname();
  const { isAdmin, userName, logout } = useAuth();
  const { t } = useLanguage();
  const isEn = t.nav.signIn === "Sign In";
  const { collapsed, toggle } = useSidebar();

  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    setDarkMode(document.documentElement.classList.contains("dark"));
  }, []);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle("dark");
    localStorage.setItem("theme", !darkMode ? "dark" : "light");
  };

  // ─── Student navigation ─────────────────────────────────────
  const studentNav = [
    { label: t.dashboard.browse || "Browse", href: "/", icon: LayoutDashboard },
    { label: t.myCourses.title || "My Courses", href: "/dashboard/courses", icon: BookOpen },
    { label: t.certificatesPage.title || "Certificates", href: "/dashboard/certificates", icon: Trophy },
  ];

  const studentAccountNav = [
    { label: t.subscription.title || "Subscription", href: "/dashboard/subscription", icon: CreditCard },
    { label: t.settings.title || "Settings", href: "/dashboard/settings", icon: Settings },
  ];

  // ─── Admin navigation ───────────────────────────────────────
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
        "fixed left-0 top-0 z-40 hidden h-screen flex-col border-r bg-white dark:bg-neutral-950 dark:border-neutral-800 lg:flex transition-all duration-300 ease-in-out",
        collapsed ? "w-[72px]" : "w-64"
      )}
    >
      {/* Logo + collapse toggle */}
      <div className="flex h-16 items-center border-b dark:border-neutral-800 px-4 justify-between">
        <Link href={isAdmin ? "/admin" : "/"} className="flex items-center gap-2 overflow-hidden">
          {/* Icon-only logo (always visible) */}
          <img
            src="/logo.svg"
            alt="Brightroots"
            className="h-7 w-7 shrink-0"
          />
          {/* Wordmark (hidden when collapsed) */}
          {!collapsed && (
            <img
              src="/logo-login-dark.svg"
              alt=""
              className="h-4 block dark:hidden"
            />
          )}
          {!collapsed && (
            <img
              src="/logo-login-light.svg"
              alt=""
              className="h-4 hidden dark:block"
            />
          )}
        </Link>
        <button
          onClick={toggle}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors shrink-0"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Main navigation">
        {/* Section label */}
        {!collapsed && (
          <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
            {isEn ? "Main" : "Principal"}
          </p>
        )}

        <div className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href + "/"));
            return (
              <NavItem
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

        <Separator className="my-4 dark:bg-neutral-800" />

        {/* Account section */}
        {!collapsed && (
          <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
            {isAdmin ? "Admin" : (isEn ? "Account" : "Compte")}
          </p>
        )}

        <div className="space-y-1">
          {accountItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <NavItem
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
      </nav>

      {/* Bottom section: dark mode + user profile */}
      <div className="border-t dark:border-neutral-800 p-3 space-y-2">
        {/* Dark mode toggle */}
        <div
          className={cn(
            "flex items-center rounded-lg bg-neutral-100 dark:bg-neutral-800 p-1",
            collapsed ? "justify-center" : ""
          )}
        >
          {collapsed ? (
            <button
              onClick={toggleDarkMode}
              className="flex h-8 w-8 items-center justify-center rounded-md text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors"
              aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
            >
              {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          ) : (
            <>
              <button
                onClick={() => { if (darkMode) toggleDarkMode(); }}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-medium transition-colors",
                  !darkMode
                    ? "bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm"
                    : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-700"
                )}
              >
                <Sun className="h-3.5 w-3.5" />
                Light
              </button>
              <button
                onClick={() => { if (!darkMode) toggleDarkMode(); }}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-medium transition-colors",
                  darkMode
                    ? "bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm"
                    : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-700"
                )}
              >
                <Moon className="h-3.5 w-3.5" />
                Dark
              </button>
            </>
          )}
        </div>

        {/* User profile */}
        <div
          className={cn(
            "flex items-center gap-3 rounded-lg p-2 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors cursor-pointer",
            collapsed ? "justify-center" : ""
          )}
          onClick={logout}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === "Enter") logout(); }}
          title={collapsed ? `${userName || "User"} — ${isEn ? "Sign out" : "Déconnexion"}` : undefined}
        >
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarFallback className="bg-neutral-200 dark:bg-neutral-700 text-xs font-medium dark:text-neutral-300">
              {initials}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-neutral-900 dark:text-white truncate">
                {userName || "User"}
              </p>
              <p className="text-[11px] text-neutral-400 dark:text-neutral-500 truncate">
                {isAdmin ? "Admin" : (isEn ? "Student" : "Étudiant")}
              </p>
            </div>
          )}
          {!collapsed && (
            <LogOut className="h-4 w-4 text-neutral-400 shrink-0" />
          )}
        </div>
      </div>
    </aside>
  );
}

/* ─── NavItem with hover tooltip when collapsed ─────────────── */
function NavItem({
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
      className={cn(
        "group relative flex items-center rounded-lg text-sm font-medium transition-colors",
        collapsed ? "justify-center px-0 py-2.5" : "gap-3 px-3 py-2.5",
        isActive
          ? "bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white"
          : "text-neutral-500 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 hover:text-neutral-900 dark:hover:text-white"
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {!collapsed && <span className="truncate">{label}</span>}

      {/* Tooltip on hover when collapsed */}
      {collapsed && (
        <span className="pointer-events-none absolute left-full ml-2 z-50 hidden rounded-md bg-neutral-900 dark:bg-neutral-700 px-2.5 py-1.5 text-xs font-medium text-white shadow-lg group-hover:block whitespace-nowrap">
          {label}
        </span>
      )}
    </Link>
  );
}

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Bell,
  Menu,
  Search,
  Settings,
  CreditCard,
  LayoutDashboard,
  Compass,
  BookOpen,
  MessageSquare,
  UserPlus,
  BookPlus,
  HelpCircle,
  LogOut,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePathname, useRouter } from "next/navigation";
import { LanguageToggle } from "@/components/shared/language-toggle";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/i18n/language-context";
import { useSidebar } from "@/lib/sidebar-context";
import { Logo } from "@/components/shared/logo";
import { ExpiryBanner } from "@/components/shared/expiry-banner";
import { supabase } from "@/lib/supabase";

interface Notification {
  id: string;
  type: "new_student" | "new_course";
  message: string;
  time: string;
}

/**
 * Resolve a human-readable page title from the current pathname.
 * Mirrors the ElevenLabs pattern of "page label on the left of the topbar"
 * — anchors the user in the navigation context without needing a
 * breadcrumb trail. Title falls back to empty string for routes that
 * don't have a meaningful label (auth flows, etc.).
 */
function usePageTitle(): string {
  const pathname = usePathname();
  const { t } = useLanguage();
  const isEn = t.nav.signIn === "Sign In";

  // Most-specific routes first so admin/courses/foo doesn't match /admin
  if (pathname === "/") return isEn ? "Browse" : "Explorer";
  if (pathname.startsWith("/dashboard/community")) return t.community?.title || "Community";
  if (pathname.startsWith("/dashboard/courses")) return t.myCourses.title;
  if (pathname.startsWith("/dashboard/subscription")) return t.subscription.title;
  if (pathname.startsWith("/dashboard/settings")) return t.settings.title;
  if (pathname.startsWith("/dashboard/help")) return t.help.title;
  if (pathname === "/dashboard") return t.dashboard.title || "Dashboard";
  if (pathname.startsWith("/admin/courses/new")) return isEn ? "New course" : "Nouveau cours";
  if (pathname.startsWith("/admin/courses")) return t.admin.manageCourses;
  if (pathname.startsWith("/admin/students")) return t.sidebar.students || "Students";
  if (pathname.startsWith("/admin/licences")) return t.admin.licences;
  if (pathname.startsWith("/admin/referrals")) return t.admin.referrals;
  if (pathname.startsWith("/admin/categories")) return t.sidebar.categories || "Categories";
  if (pathname.startsWith("/admin/analytics")) return t.admin.analytics;
  if (pathname.startsWith("/admin/explorer")) return t.sidebar.explorer || "Explorer";
  if (pathname.startsWith("/admin/settings")) return t.settings.title;
  if (pathname === "/admin") return t.admin.dashboard;
  if (pathname.startsWith("/courses/")) return isEn ? "Course" : "Cours";
  return "";
}

/**
 * Dashboard topbar — ElevenLabs-inspired layout.
 *
 * Left side: page title (anchors the user in nav context).
 * Right side: utility cluster — search · help · language · notifications.
 *
 * Previous design had search dominating the left side (taking flex-1)
 * with no page label, so the user had no visual anchor for "where am I?"
 * Search is now an icon-only button that expands inline when clicked,
 * matching the compact-utility pattern of ElevenLabs / Linear / Vercel
 * dashboards where search is just one of several utility icons.
 *
 * Help link added to mirror ElevenLabs' "Docs" affordance — single-click
 * access to the in-app help page rather than buried in the sidebar.
 */
export function DashboardTopbar() {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const pathname = usePathname();
  const router = useRouter();
  const { isAdmin, isAuthenticated, userName, logout } = useAuth();
  const { t } = useLanguage();
  const pageTitle = usePageTitle();
  const { collapsed, toggle } = useSidebar();
  const isEn = t.nav.signIn === "Sign In";

  // Initials for the avatar fallback. Falls back to "U" if no name available
  // (newly signed-up users before they save a name in settings).
  const initials = (userName || "U")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && searchQuery.trim()) {
      router.push(`/?q=${encodeURIComponent(searchQuery.trim())}`);
      setIsSearchOpen(false);
      setSearchQuery("");
    }
  };

  const mobileNav = [
    { label: t.dashboard.title || "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: t.dashboard.browse || "Browse", href: "/", icon: Compass },
    { label: t.myCourses.title || "My Courses", href: "/dashboard/courses", icon: BookOpen },
    { label: t.community?.title || "Community", href: "/dashboard/community", icon: MessageSquare },
    { label: t.subscription.title || "Subscription", href: "/dashboard/subscription", icon: CreditCard },
    { label: t.settings.title || "Settings", href: "/dashboard/settings", icon: Settings },
  ];

  // Load notifications and compute unread count
  useEffect(() => {
    async function loadNotifications() {
      const lastSeen = localStorage.getItem("notif_last_seen") || "1970-01-01";
      if (isAdmin) {
        const { data } = await supabase
          .from("users")
          .select("id, name, email, created_at")
          .order("created_at", { ascending: false })
          .limit(5);

        const items = (data ?? []).map((u) => ({
          id: u.id,
          type: "new_student" as const,
          message: `${u.name || u.email} joined`,
          time: new Date(u.created_at).toLocaleDateString(),
          _raw: u.created_at,
        }));
        setNotifications(items);
        setUnreadCount(items.filter((n) => n._raw > lastSeen).length);
      } else {
        const { data } = await supabase
          .from("courses")
          .select("id, title, created_at")
          .eq("is_published", true)
          .order("created_at", { ascending: false })
          .limit(5);

        const items = (data ?? []).map((c) => ({
          id: c.id,
          type: "new_course" as const,
          message: `New course: ${c.title}`,
          time: new Date(c.created_at).toLocaleDateString(),
          _raw: c.created_at,
        }));
        setNotifications(items);
        setUnreadCount(items.filter((n) => n._raw > lastSeen).length);
      }
    }
    if (isAuthenticated) loadNotifications();
  }, [isAdmin, isAuthenticated]);

  const markNotificationsRead = () => {
    localStorage.setItem("notif_last_seen", new Date().toISOString());
    setUnreadCount(0);
  };

  return (
    <>
      <ExpiryBanner />
      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-md lg:px-8">
        {/* Mobile menu — visible below lg */}
        <Sheet>
          <SheetTrigger
            className="lg:hidden"
            render={<Button variant="ghost" size="icon" className="h-9 w-9" aria-label="Open navigation menu" />}
          >
            <Menu className="h-5 w-5" />
          </SheetTrigger>
          <SheetContent side="left" className="w-[85vw] max-w-72 bg-sidebar text-sidebar-foreground p-4">
            <div className="flex items-center pb-6 pt-2">
              <Logo className="h-5" />
            </div>
            <nav className="flex flex-col gap-0.5">
              {mobileNav.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "group relative flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                      isActive &&
                        "before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-[2px] before:rounded-r-sm before:bg-primary",
                      isActive
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            {/* Mobile-only: language + auth */}
            <div className="mt-6 border-t border-sidebar-border pt-6 space-y-4">
              <div className="flex items-center justify-between px-3">
                <LanguageToggle />
              </div>
              {!isAuthenticated && (
                <div className="flex flex-col gap-2 px-3">
                  <Button variant="outline" className="w-full h-10" render={<Link href="/sign-in" />}>
                    {t.nav.signIn}
                  </Button>
                  <Button className="w-full h-10" render={<Link href="/sign-up" />}>
                    {t.dashboard.signUp}
                  </Button>
                </div>
              )}
            </div>
          </SheetContent>
        </Sheet>

        {/* ── Sidebar collapse toggle (desktop only) ───────────
             Sits to the left of the page title, mirroring the
             ElevenLabs / Linear / Vercel "panel-left icon next to
             page label" pattern. Hidden on mobile because the
             hamburger menu owns navigation there — the desktop
             sidebar simply doesn't exist on small viewports. */}
        {isAuthenticated && (
          <Button
            variant="ghost"
            size="icon"
            className="hidden lg:inline-flex h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={toggle}
            aria-label={
              collapsed
                ? isEn ? "Expand sidebar" : "Développer la barre latérale"
                : isEn ? "Collapse sidebar" : "Réduire la barre latérale"
            }
          >
            {collapsed ? (
              <PanelLeft className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </Button>
        )}

        {/* ── Page title ─────────────────────────────────────── */}
        <div className="flex-1 min-w-0">
          {pageTitle && (
            <h1 className="text-sm font-medium text-foreground truncate">
              {pageTitle}
            </h1>
          )}
        </div>

        {/* ── Right utility cluster ──────────────────────────── */}
        <div className="flex items-center gap-1">
          {/* Search — icon-only when collapsed; expands inline on click */}
          {isSearchOpen ? (
            <div className="w-56 sm:w-64">
              <Input
                placeholder={t.nav.searchCourses}
                className="h-9"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearch}
                onBlur={() => { if (!searchQuery) setIsSearchOpen(false); }}
              />
            </div>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={() => setIsSearchOpen(true)}
              aria-label={t.nav.searchCourses}
            >
              <Search className="h-4 w-4" />
            </Button>
          )}

          {/* Help — desktop only, authenticated only. Mirrors ElevenLabs'
              "Docs" affordance — one click from any page in the app. */}
          {isAuthenticated && (
            <Button
              variant="ghost"
              size="sm"
              className="h-9 hidden md:inline-flex gap-1.5 text-muted-foreground hover:text-foreground"
              render={<Link href="/dashboard/help" />}
            >
              <HelpCircle className="h-4 w-4" />
              <span>{t.help.title}</span>
            </Button>
          )}

          {/* Language toggle */}
          <div className="hidden md:block">
            <LanguageToggle />
          </div>

          {/* Notifications */}
          {isAuthenticated && (
            <Popover onOpenChange={(open) => { if (open) markNotificationsRead(); }}>
              <PopoverTrigger render={<Button variant="ghost" size="icon" className="relative h-9 w-9" aria-label="Notifications" />}>
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary ring-2 ring-background" />
                )}
              </PopoverTrigger>
              <PopoverContent className="w-[calc(100vw-1rem)] sm:w-80 p-0" align="end" sideOffset={8}>
                <div className="border-b border-border/60 px-4 py-3">
                  <p className="text-sm font-semibold text-foreground">
                    Notifications
                  </p>
                </div>
                <div className="max-h-64 overflow-y-auto divide-y divide-border/40">
                  {notifications.length === 0 ? (
                    <p className="p-4 text-sm text-muted-foreground text-center">
                      {t.nav.signIn === "Sign In" ? "No notifications" : "Aucune notification"}
                    </p>
                  ) : (
                    notifications.map((n) => (
                      <div key={n.id} className="flex items-start gap-3 px-4 py-3 hover:bg-muted/40 transition-colors">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted shrink-0 mt-0.5">
                          {n.type === "new_student" ? (
                            <UserPlus className="h-4 w-4 text-blue-400" />
                          ) : (
                            <BookPlus className="h-4 w-4 text-primary" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-foreground">{n.message}</p>
                          <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">
                            {n.time}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </PopoverContent>
            </Popover>
          )}

          {/* User menu — avatar dropdown.
              Replaces the previous sidebar-bottom profile section.
              Anchors identity globally rather than per-section, matching
              the ElevenLabs / Linear / Vercel pattern. */}
          {isAuthenticated && (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <button
                    type="button"
                    aria-label="Open user menu"
                    className="ml-1 flex shrink-0 items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  />
                }
              >
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-muted text-[11px] font-semibold text-foreground">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" sideOffset={8} className="w-56">
                {/* Header: name + role */}
                <div className="px-2 py-2">
                  <p className="text-sm font-medium text-foreground truncate leading-tight">
                    {userName || "User"}
                  </p>
                  <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">
                    {isAdmin ? "Admin" : t.sidebar.student}
                  </p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="gap-2"
                  render={<Link href={isAdmin ? "/admin/settings" : "/dashboard/settings"} />}
                >
                  <Settings className="h-4 w-4" />
                  {t.settings.title}
                </DropdownMenuItem>
                {!isAdmin && (
                  <DropdownMenuItem
                    className="gap-2"
                    render={<Link href="/dashboard/help" />}
                  >
                    <HelpCircle className="h-4 w-4" />
                    {t.help.title}
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  className="gap-2"
                  onClick={logout}
                >
                  <LogOut className="h-4 w-4" />
                  {t.dashboard.signOut}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Sign in/up (unauthenticated, desktop only — mobile uses sheet) */}
          {!isAuthenticated && (
            <div className="hidden lg:flex items-center gap-2">
              <Button variant="ghost" className="h-9 text-sm" render={<Link href="/sign-in" />}>
                {t.nav.signIn}
              </Button>
              <Button className="h-9 text-sm" render={<Link href="/sign-up" />}>
                {t.dashboard.signUp}
              </Button>
            </div>
          )}
        </div>
      </header>
    </>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Menu,
  Search,
  Settings,
  CreditCard,
  LayoutDashboard,
  Compass,
  BookOpen,
  MessageSquare,
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
import { NotificationBell } from "@/components/shared/notification-bell";

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
  const pathname = usePathname();
  const router = useRouter();
  const {
    isAdmin,
    isAuthenticated,
    userName,
    avatarUrl,
    logout,
    isPro,
    daysUntilExpiry,
    isExpiringSoon,
    isExpired,
  } = useAuth();
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
                  {/* Routed through /api/auth/sign-out so any stale
                       sb-*-auth-token cookies (left over from a prior
                       partial logout) are wiped server-side before we
                       hit /sign-in. The endpoint is idempotent — for
                       genuinely-signed-out users it's a no-op redirect. */}
                  <Button variant="outline" className="w-full h-10" render={<a href="/api/auth/sign-out" />}>
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

          {/* Notifications — real per-user feed (was a fake "latest
               students/courses" dropdown). Component owns its own
               state, realtime, and mark-read. */}
          <NotificationBell />

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
                  {avatarUrl && <AvatarImage src={avatarUrl} alt="" />}
                  <AvatarFallback className="bg-muted text-[11px] font-semibold text-foreground">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" sideOffset={8} className="w-64 p-0">
                {/* Header: name + role */}
                <div className="px-3 py-3">
                  <p className="text-sm font-medium text-foreground truncate leading-tight">
                    {userName || "User"}
                  </p>
                  <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">
                    {isAdmin ? "Admin" : t.sidebar.student}
                  </p>
                </div>

                {/* Subscription card — students only.
                    Refactoring UI applied:
                    - Plan name elevated to text-base font-semibold
                      (was text-sm font-medium) — the most important
                      element in the card, deserves the strongest weight
                    - Status dot color-codes Pro state at a glance
                      (green active / amber expiring / red expired);
                      paired with metadata text in the same color so
                      the two reinforce rather than compete
                    - Padding harmonized to the 12/16px scale
                      (px-4 py-3) — was mixing mx-2/px-3
                    - Metadata bumped 10px → 11px with tabular-nums
                      so digits scan cleanly across "30j" / "5j" / "Expiré"
                    - CTA button left as-is (bordered for Pro, primary
                      for Free) — already correct per visual hierarchy
                      principle (paying customer doesn't need a loud CTA) */}
                {!isAdmin && (
                  // Card surface uses a custom oklch value (0.24) rather
                  // than the bg-accent token (0.20). Reason: bg-accent is
                  // only 0.01 luminance above bg-popover (0.19), which is
                  // below the typical visual perception threshold —
                  // the card was rendering visually identical to the
                  // dropdown surface. The 0.24 value gives a clear 0.05
                  // luminance gap, matching the bg-card/bg-background
                  // separation elsewhere in the app. Stays local to this
                  // card so the global --accent token (used for hover
                  // states) isn't bumped along with it.
                  <div className="mx-2 mb-1 rounded-lg border border-border bg-[oklch(0.24_0_0)] px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                          {isEn ? "Plan" : "Forfait"}
                        </p>
                        <div className="mt-1 flex items-center gap-2">
                          {/* Status dot — green active / amber expiring /
                              red expired / muted for free. Sized the
                              same h-1.5 w-1.5 to read as "indicator"
                              not "graphic." */}
                          {isPro && (
                            <span
                              className={cn(
                                "h-1.5 w-1.5 rounded-full shrink-0",
                                isExpired
                                  ? "bg-destructive"
                                  : isExpiringSoon
                                    ? "bg-amber-500"
                                    : "bg-primary"
                              )}
                              aria-hidden
                            />
                          )}
                          <p className="text-base font-semibold tracking-tight text-foreground leading-none">
                            {isPro ? "Pro" : "Free"}
                          </p>
                        </div>
                        {/* Status line: expiry for Pro, value prop for Free */}
                        {isPro ? (
                          isExpired ? (
                            <p className="mt-1.5 font-mono text-[11px] text-destructive tabular-nums">
                              {isEn ? "Expired" : "Expiré"}
                            </p>
                          ) : daysUntilExpiry !== null ? (
                            <p
                              className={cn(
                                "mt-1.5 font-mono text-[11px] tabular-nums",
                                isExpiringSoon
                                  ? "text-amber-500"
                                  : "text-muted-foreground"
                              )}
                            >
                              {isEn
                                ? `${daysUntilExpiry}d remaining`
                                : `${daysUntilExpiry}j restants`}
                            </p>
                          ) : null
                        ) : (
                          <p className="mt-1.5 text-[11px] text-muted-foreground leading-snug">
                            {isEn
                              ? "Unlock all courses"
                              : "Débloquez tous les cours"}
                          </p>
                        )}
                      </div>
                      <Link
                        href="/dashboard/subscription"
                        className={cn(
                          "shrink-0 mt-0.5 rounded-md px-3 py-1.5 font-medium text-[11px] transition-colors",
                          isPro
                            ? "border border-border/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                            : "bg-primary text-primary-foreground hover:bg-primary/90"
                        )}
                      >
                        {isPro
                          ? isEn ? "Manage" : "Gérer"
                          : isEn ? "Upgrade" : "Passer Pro"}
                      </Link>
                    </div>
                  </div>
                )}

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

          {/* Sign in/up (unauthenticated, desktop only — mobile uses sheet).
               Sign-in routed through /api/auth/sign-out — see mobile sheet
               version above for rationale. */}
          {!isAuthenticated && (
            <div className="hidden lg:flex items-center gap-2">
              <Button variant="ghost" className="h-9 text-sm" render={<a href="/api/auth/sign-out" />}>
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

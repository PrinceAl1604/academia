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
  Bell,
  Menu,
  Search,
  Settings,
  CreditCard,
  LayoutDashboard,
  BookOpen,
  MessageSquare,
  UserPlus,
  BookPlus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePathname, useRouter } from "next/navigation";
import { LanguageToggle } from "@/components/shared/language-toggle";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/i18n/language-context";
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
 * Dashboard topbar — Cook-OS-flavored refresh.
 *
 * Migrated from hardcoded `bg-white dark:bg-neutral-950` etc. to
 * semantic `bg-background border-border` tokens.
 *
 * The dark-mode toggle has been removed entirely. The app is force-dark
 * via `<html class="dark">` in the root layout; allowing a toggle here
 * could remove that class and break the entire theme. The Sun / Moon
 * icons and `toggleDarkMode` handler are gone with it.
 */
export function DashboardTopbar() {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const pathname = usePathname();
  const router = useRouter();
  const { isAdmin, isAuthenticated } = useAuth();
  const { t } = useLanguage();

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && searchQuery.trim()) {
      router.push(`/?q=${encodeURIComponent(searchQuery.trim())}`);
      setIsSearchOpen(false);
      setSearchQuery("");
    }
  };

  const mobileNav = [
    { label: t.dashboard.browse || "Browse", href: "/", icon: LayoutDashboard },
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
      <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b border-border bg-background/80 px-4 backdrop-blur-md lg:px-8">
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

        {/* Search */}
        <div className="flex-1">
          {isSearchOpen ? (
            <div className="w-full max-w-md">
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
              className="gap-2 text-muted-foreground hover:text-foreground"
              onClick={() => setIsSearchOpen(true)}
              aria-label={t.nav.searchCourses}
            >
              <Search className="h-4 w-4" />
              <span className="hidden sm:inline">{t.nav.searchCourses}</span>
            </Button>
          )}
        </div>

        {/* Desktop-only actions: language toggle */}
        <div className="hidden lg:flex items-center gap-2">
          <LanguageToggle />
        </div>

        {/* Always-visible actions: notifications + profile (or auth buttons on desktop) */}
        <div className="flex items-center gap-2">
          {isAuthenticated ? (
            <>
              {/* Notification Popover */}
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
            </>
          ) : (
            /* Desktop-only sign-in/sign-up — mobile uses the hamburger sheet */
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

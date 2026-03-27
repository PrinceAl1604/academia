"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  LogOut,
  CreditCard,
  LayoutDashboard,
  BookOpen,
  Trophy,
  UserPlus,
  BookPlus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";
import { LanguageToggle } from "@/components/shared/language-toggle";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/i18n/language-context";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/shared/logo";
import { ExpiryBanner } from "@/components/shared/expiry-banner";
import { supabase } from "@/lib/supabase";

interface Notification {
  id: string;
  type: "new_student" | "new_course";
  message: string;
  time: string;
}

export function DashboardTopbar() {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const pathname = usePathname();
  const { isAdmin, isAuthenticated, userName, logout } = useAuth();
  const { t } = useLanguage();

  const mobileNav = [
    { label: t.dashboard.browse || "Browse", href: "/", icon: LayoutDashboard },
    { label: t.myCourses.title || "My Courses", href: "/dashboard/courses", icon: BookOpen },
    { label: t.certificatesPage.title || "Certificates", href: "/dashboard/certificates", icon: Trophy },
    { label: t.subscription.title || "Subscription", href: "/dashboard/subscription", icon: CreditCard },
    { label: t.settings.title || "Settings", href: "/dashboard/settings", icon: Settings },
  ];

  // Load notifications
  useEffect(() => {
    async function loadNotifications() {
      if (isAdmin) {
        // Admin: show recent signups
        const { data } = await supabase
          .from("users")
          .select("id, name, email, created_at")
          .order("created_at", { ascending: false })
          .limit(5);

        setNotifications(
          (data ?? []).map((u) => ({
            id: u.id,
            type: "new_student" as const,
            message: `${u.name || u.email} joined`,
            time: new Date(u.created_at).toLocaleDateString(),
          }))
        );
      } else {
        // Student: show recent courses
        const { data } = await supabase
          .from("courses")
          .select("id, title, created_at")
          .eq("is_published", true)
          .order("created_at", { ascending: false })
          .limit(5);

        setNotifications(
          (data ?? []).map((c) => ({
            id: c.id,
            type: "new_course" as const,
            message: `New course: ${c.title}`,
            time: new Date(c.created_at).toLocaleDateString(),
          }))
        );
      }
    }
    if (isAuthenticated) loadNotifications();
  }, [isAdmin, isAuthenticated]);

  // Load dark mode from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("theme");
    if (saved === "dark") {
      document.documentElement.classList.add("dark");
    }
  }, []);

  return (
    <>
    <ExpiryBanner />
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-white/80 px-4 backdrop-blur-md lg:px-8">
      {/* Mobile menu */}
      <Sheet>
        <SheetTrigger
          className="lg:hidden"
          render={<Button variant="ghost" size="icon" className="h-9 w-9" />}
        >
          <Menu className="h-5 w-5" />
        </SheetTrigger>
        <SheetContent side="left" className="w-72">
          <div className="flex items-center pb-6 pt-4">
            <Logo className="h-5" />
          </div>
          <nav className="flex flex-col gap-1">
            {mobileNav.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-neutral-100 text-neutral-900"
                      : "text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </SheetContent>
      </Sheet>

      {/* Search */}
      <div className="flex-1">
        {isSearchOpen ? (
          <div className="max-w-md">
            <Input
              placeholder={t.nav.searchCourses}
              className="h-9"
              autoFocus
              onBlur={() => setIsSearchOpen(false)}
            />
          </div>
        ) : (
          <Button
            variant="ghost"
            className="gap-2 text-neutral-500"
            onClick={() => setIsSearchOpen(true)}
          >
            <Search className="h-4 w-4" />
            <span className="hidden sm:inline">{t.nav.searchCourses}</span>
          </Button>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <LanguageToggle />

        {isAuthenticated ? (
          <>
            {/* Notification Popover */}
            <Popover>
              <PopoverTrigger render={<Button variant="ghost" size="icon" className="relative h-9 w-9" />}>
                <Bell className="h-4 w-4" />
                {notifications.length > 0 && (
                  <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500" />
                )}
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0" align="end" sideOffset={8}>
                <div className="border-b px-4 py-3">
                  <p className="text-sm font-semibold text-neutral-900">
                    {t.nav.signIn === "Sign In" ? "Notifications" : "Notifications"}
                  </p>
                </div>
                <div className="max-h-64 overflow-y-auto divide-y">
                  {notifications.length === 0 ? (
                    <p className="p-4 text-sm text-neutral-500 text-center">
                      {t.nav.signIn === "Sign In" ? "No notifications" : "Aucune notification"}
                    </p>
                  ) : (
                    notifications.map((n) => (
                      <div key={n.id} className="flex items-start gap-3 px-4 py-3 hover:bg-neutral-50">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100 shrink-0 mt-0.5">
                          {n.type === "new_student" ? (
                            <UserPlus className="h-4 w-4 text-blue-500" />
                          ) : (
                            <BookPlus className="h-4 w-4 text-green-500" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-neutral-700">{n.message}</p>
                          <p className="text-xs text-neutral-400 mt-0.5">{n.time}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </PopoverContent>
            </Popover>

            {/* Profile Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger
                render={<Button variant="ghost" className="h-9 gap-2 pl-2 pr-3" />}
              >
                <Avatar className="h-7 w-7">
                  <AvatarFallback className="bg-neutral-200 text-xs font-medium">
                    {(userName || "U")
                      .split(" ")
                      .map((n: string) => n[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden text-sm font-medium sm:inline">
                  {(userName || "User").split(" ")[0]}
                </span>
                {isAdmin && (
                  <Badge className="bg-red-100 text-red-700">Admin</Badge>
                )}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem render={<Link href={isAdmin ? "/admin/settings" : "/dashboard/settings"} />} className="gap-2">
                  <Settings className="h-4 w-4" />
                  {t.settings.title}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="gap-2 text-red-600" onClick={logout}>
                  <LogOut className="h-4 w-4" />
                  {t.dashboard.signOut}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        ) : (
          <div className="flex items-center gap-2">
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

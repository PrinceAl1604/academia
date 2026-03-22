"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  GraduationCap,
  LayoutDashboard,
  BookOpen,
  Trophy,
  Settings,
  User,
  LogOut,
  CreditCard,
  HelpCircle,
  Shield,
  BarChart3,
  KeyRound,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { currentUser } from "@/data/mock";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/i18n/language-context";

const mainNav = [
  { label: "Browse", href: "/", icon: LayoutDashboard },
  { label: "My Courses", href: "/dashboard/courses", icon: BookOpen },
  { label: "Certificates", href: "/dashboard/certificates", icon: Trophy },
];

const settingsNav = [
  { label: "Profile", href: "/dashboard/profile", icon: User },
  { label: "Subscription", href: "/dashboard/subscription", icon: CreditCard },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
  { label: "Help", href: "/dashboard/help", icon: HelpCircle },
];

export function DashboardSidebar() {
  const pathname = usePathname();
  const { isAdmin, isActivated, logout, userName } = useAuth();
  const { t } = useLanguage();

  const adminNav = [
    { label: t.admin.dashboard, href: "/admin", icon: Shield },
    { label: t.admin.manageCourses, href: "/admin/courses", icon: BookOpen },
    { label: t.admin.licences, href: "/admin/licences", icon: KeyRound },
    { label: t.admin.analytics, href: "/admin/analytics", icon: BarChart3 },
  ];

  return (
    <aside className="fixed left-0 top-0 z-40 hidden h-screen w-64 flex-col border-r bg-white lg:flex">
      {/* Logo - wordmark only */}
      <div className="flex h-16 items-center border-b px-6">
        <Link href="/" className="flex items-center">
          <img src="/logo.svg" alt="Academia" className="h-5" />
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <div className="space-y-1">
          {mainNav.map((item) => {
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
        </div>

        {isAdmin && (
          <>
            <Separator className="my-4" />
            <p className="mb-2 px-3 text-xs font-medium uppercase tracking-wider text-neutral-400">
              Admin
            </p>
            <div className="space-y-1">
              {adminNav.map((item) => {
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
            </div>
          </>
        )}

        <Separator className="my-4" />

        <p className="mb-2 px-3 text-xs font-medium uppercase tracking-wider text-neutral-400">
          Account
        </p>
        <div className="space-y-1">
          {settingsNav.map((item) => {
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
        </div>
      </nav>

      {/* User section */}
      <div className="border-t p-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarFallback className="bg-neutral-200 text-sm font-medium">
              {(userName || currentUser.name)
                .split(" ")
                .map((n: string) => n[0])
                .join("")}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 truncate">
            <p className="text-sm font-medium text-neutral-900">
              {userName || currentUser.name}
            </p>
            <div className="flex items-center gap-1.5">
              <p className="text-xs text-neutral-500">{isActivated ? "Pro Plan" : "Free Plan"}</p>
              {isAdmin && (
                <Badge className="h-4 bg-red-100 px-1.5 text-[10px] text-red-700">
                  Admin
                </Badge>
              )}
            </div>
          </div>
          <button
            onClick={logout}
            className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
            title="Log out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}

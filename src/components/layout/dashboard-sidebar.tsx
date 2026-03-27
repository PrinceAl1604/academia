"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  BookOpen,
  Trophy,
  Settings,
  LogOut,
  CreditCard,
  Shield,
  BarChart3,
  KeyRound,
  FolderOpen,
  Users,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/i18n/language-context";
import { Logo } from "@/components/shared/logo";

export function DashboardSidebar() {
  const pathname = usePathname();
  const { isAdmin, isAuthenticated, isPro, logout, userName } = useAuth();
  const { t } = useLanguage();
  const isEn = t.nav.signIn === "Sign In";

  // ─── Student navigation ───────────────────────────────────────────────
  const studentNav = [
    { label: t.dashboard.browse || "Browse", href: "/", icon: LayoutDashboard },
    { label: t.myCourses.title || "My Courses", href: "/dashboard/courses", icon: BookOpen },
    { label: t.certificatesPage.title || "Certificates", href: "/dashboard/certificates", icon: Trophy },
  ];

  const studentAccountNav = [
    { label: t.subscription.title || "Subscription", href: "/dashboard/subscription", icon: CreditCard },
    { label: t.settings.title || "Settings", href: "/dashboard/settings", icon: Settings },
  ];

  // ─── Admin navigation ─────────────────────────────────────────────────
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

  return (
    <aside className="fixed left-0 top-0 z-40 hidden h-screen w-64 flex-col border-r bg-white lg:flex">
      {/* Logo */}
      <div className="flex h-16 items-center border-b px-6">
        <Link href={isAdmin ? "/admin" : "/"} className="flex items-center">
          <Logo className="h-5" />
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {/* Main nav */}
        <div className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
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

        <Separator className="my-4" />

        {/* Account nav */}
        <p className="mb-2 px-3 text-xs font-medium uppercase tracking-wider text-neutral-400">
          {isAdmin ? "Admin" : (t.nav.signIn === "Sign In" ? "Account" : "Compte")}
        </p>
        <div className="space-y-1">
          {accountItems.map((item) => {
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

    </aside>
  );
}

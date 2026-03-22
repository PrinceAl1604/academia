"use client";

import { useState } from "react";
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
  Bell,
  Menu,
  Search,
  User,
  Settings,
  LogOut,
  CreditCard,
  BookOpen,
  LayoutDashboard,
  Trophy,
  HelpCircle,
  GraduationCap,
} from "lucide-react";
import { currentUser } from "@/data/mock";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";
import { LanguageToggle } from "@/components/shared/language-toggle";
import { useAuth } from "@/lib/auth-context";
import { Badge } from "@/components/ui/badge";

const mobileNav = [
  { label: "Browse", href: "/", icon: LayoutDashboard },
  { label: "My Courses", href: "/dashboard/courses", icon: BookOpen },
  { label: "Certificates", href: "/dashboard/certificates", icon: Trophy },
  { label: "Profile", href: "/dashboard/profile", icon: User },
  { label: "Subscription", href: "/dashboard/subscription", icon: CreditCard },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
  { label: "Help", href: "/dashboard/help", icon: HelpCircle },
];

export function DashboardTopbar() {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const pathname = usePathname();
  const { isAdmin } = useAuth();

  return (
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
          <div className="flex items-center gap-2.5 pb-6 pt-4">
            <img src="/favicon.svg" alt="" className="h-8 w-8" />
            <img src="/logo.svg" alt="Academia" className="h-4" />
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
              placeholder="Search your courses..."
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
            <span className="hidden sm:inline">Search courses...</span>
          </Button>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <LanguageToggle />
        <Button variant="ghost" size="icon" className="relative h-9 w-9">
          <Bell className="h-4 w-4" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button variant="ghost" className="h-9 gap-2 pl-2 pr-3" />}
          >
            <Avatar className="h-7 w-7">
              <AvatarFallback className="bg-neutral-200 text-xs font-medium">
                {currentUser.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")}
              </AvatarFallback>
            </Avatar>
            <span className="hidden text-sm font-medium sm:inline">
              {currentUser.name.split(" ")[0]}
            </span>
            {isAdmin && (
              <Badge className="bg-red-100 text-red-700">Admin</Badge>
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem render={<Link href="/dashboard/profile" />} className="gap-2">
              <User className="h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem render={<Link href="/dashboard/settings" />} className="gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuItem render={<Link href="/dashboard/subscription" />} className="gap-2">
              <CreditCard className="h-4 w-4" />
              Subscription
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2 text-red-600">
              <LogOut className="h-4 w-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

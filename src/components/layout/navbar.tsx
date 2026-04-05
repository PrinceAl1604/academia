"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  GraduationCap,
  Menu,
  Search,
  X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/lib/i18n/language-context";
import { LanguageToggle } from "@/components/shared/language-toggle";

export function Navbar() {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const { t } = useLanguage();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-neutral-200 dark:border-neutral-800 bg-white/80 dark:bg-neutral-950/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center">
          <img src="/logo.svg" alt="Academia" className="h-5" />
        </Link>

        {/* Desktop Nav — hidden on mobile */}
        <nav className="hidden items-center gap-8 lg:flex">
          <Link
            href="/courses"
            className="text-sm font-medium text-neutral-600 dark:text-neutral-400 transition-colors hover:text-neutral-900 dark:hover:text-white"
          >
            {t.nav.courses}
          </Link>
          <Link
            href="/pricing"
            className="text-sm font-medium text-neutral-600 dark:text-neutral-400 transition-colors hover:text-neutral-900 dark:hover:text-white"
          >
            {t.nav.pricing}
          </Link>
          <Link
            href="/about"
            className="text-sm font-medium text-neutral-600 dark:text-neutral-400 transition-colors hover:text-neutral-900 dark:hover:text-white"
          >
            {t.nav.about}
          </Link>
        </nav>

        {/* Desktop Actions — hidden on mobile */}
        <div className="hidden items-center gap-3 lg:flex">
          {isSearchOpen ? (
            <div className="flex items-center gap-2">
              <Input
                placeholder={t.nav.searchCourses}
                className="h-9 w-48 lg:w-64"
                autoFocus
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                onClick={() => setIsSearchOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={() => setIsSearchOpen(true)}
            >
              <Search className="h-4 w-4" />
            </Button>
          )}
          <LanguageToggle />
          <Button variant="ghost" render={<Link href="/sign-in" />}>
            {t.nav.activateKey}
          </Button>
          <Button render={<Link href="/sign-up" />}>
            {t.nav.getStarted}
          </Button>
        </div>

        {/* Mobile: search icon + hamburger — visible below lg */}
        <div className="flex items-center gap-1 lg:hidden">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={() => setIsSearchOpen(!isSearchOpen)}
          >
            {isSearchOpen ? <X className="h-4 w-4" /> : <Search className="h-4 w-4" />}
          </Button>

          <Sheet>
            <SheetTrigger
              render={<Button variant="ghost" size="icon" className="h-9 w-9" />}
            >
              <Menu className="h-5 w-5" />
            </SheetTrigger>
            <SheetContent side="right" className="w-[85vw] max-w-80">
              <div className="flex flex-col gap-6 pt-8">
                <Input placeholder={t.nav.searchCourses} className="h-10" />
                <nav className="flex flex-col gap-4">
                  <Link
                    href="/courses"
                    className="text-lg font-medium text-neutral-900 dark:text-white"
                  >
                    {t.nav.courses}
                  </Link>
                  <Link
                    href="/pricing"
                    className="text-lg font-medium text-neutral-900 dark:text-white"
                  >
                    {t.nav.pricing}
                  </Link>
                  <Link
                    href="/about"
                    className="text-lg font-medium text-neutral-900 dark:text-white"
                  >
                    {t.nav.about}
                  </Link>
                </nav>
                <LanguageToggle />
                <div className="flex flex-col gap-3 pt-4">
                  <Button variant="outline" render={<Link href="/sign-in" />} className="w-full h-11">
                    {t.nav.signIn}
                  </Button>
                  <Button render={<Link href="/sign-up" />} className="w-full h-11">
                    {t.nav.getStarted}
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {/* Mobile search bar — expands below header when search is open */}
        {isSearchOpen && (
          <div className="absolute left-0 top-16 w-full border-b bg-white dark:bg-neutral-950 px-4 py-3 lg:hidden">
            <Input
              placeholder={t.nav.searchCourses}
              className="h-10 w-full"
              autoFocus
              onBlur={() => setIsSearchOpen(false)}
            />
          </div>
        )}
      </div>
    </header>
  );
}

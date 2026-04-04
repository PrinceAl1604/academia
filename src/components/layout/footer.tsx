"use client";

import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useLanguage } from "@/lib/i18n/language-context";

export function Footer() {
  const { t } = useLanguage();

  const footerLinks = {
    [t.footer.platform]: [
      { label: t.footer.allCourses, href: "/courses" },
      { label: t.footer.pricing, href: "/pricing" },
      { label: t.footer.forTeams, href: "/teams" },
      { label: t.footer.certificatesLink, href: "/certificates" },
    ],
    [t.footer.resources]: [
      { label: t.footer.blog, href: "/blog" },
      { label: t.footer.communityLink, href: "/community" },
      { label: t.footer.helpCenter, href: "/help" },
      { label: t.footer.careers, href: "/careers" },
    ],
    [t.footer.legal]: [
      { label: t.footer.privacy, href: "/privacy" },
      { label: t.footer.terms, href: "/terms" },
      { label: t.footer.cookies, href: "/cookies" },
    ],
  };

  return (
    <footer className="border-t bg-neutral-50">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-4 md:gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-neutral-900">
                <GraduationCap className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold">Academia</span>
            </Link>
            <p className="mt-4 text-sm leading-relaxed text-neutral-500">
              {t.footer.tagline}
            </p>
          </div>

          {/* Links */}
          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h3 className="text-sm font-semibold text-neutral-900">
                {title}
              </h3>
              <ul className="mt-4 space-y-3">
                {links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-neutral-500 transition-colors hover:text-neutral-900"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <Separator className="my-8" />

        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-sm text-neutral-500">
            &copy; {new Date().getFullYear()} Academia. {t.footer.rights}
          </p>
          <div className="flex gap-6">
            <Link href="#" className="text-sm text-neutral-500 hover:text-neutral-900">
              Twitter
            </Link>
            <Link href="#" className="text-sm text-neutral-500 hover:text-neutral-900">
              LinkedIn
            </Link>
            <Link href="#" className="text-sm text-neutral-500 hover:text-neutral-900">
              YouTube
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

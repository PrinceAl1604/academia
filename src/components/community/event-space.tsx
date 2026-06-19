"use client";

import Link from "next/link";
import { CalendarCheck } from "lucide-react";
import { useLanguage } from "@/lib/i18n/language-context";

/**
 * Phase-1a event space — surfaces the existing live-sessions area. The full
 * in-space events/calendar (RSVP, paywall, go-live) is Phase 3.
 */
export function EventSpace({ name, emoji }: { name: string; emoji: string | null }) {
  const { t } = useLanguage();
  const isEn = t.nav.signIn === "Sign In";

  return (
    <main className="mx-auto max-w-3xl px-5 py-10">
      <header className="mb-8 flex items-center gap-3">
        <span className="text-3xl leading-none">{emoji ?? "📅"}</span>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{name}</h1>
      </header>

      <div className="rounded-2xl border border-border bg-card p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <CalendarCheck className="h-5 w-5" />
        </div>
        <p className="mx-auto max-w-sm text-sm text-muted-foreground">
          {isEn
            ? "Browse and book upcoming live sessions."
            : "Consulte et réserve les prochaines sessions en direct."}
        </p>
        <Link
          href="/dashboard/sessions"
          className="mt-6 inline-flex rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
        >
          {isEn ? "View live sessions →" : "Voir les sessions →"}
        </Link>
      </div>
    </main>
  );
}

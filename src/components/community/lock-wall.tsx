"use client";

import Link from "next/link";
import { Lock } from "lucide-react";
import { useLanguage } from "@/lib/i18n/language-context";

/**
 * Shown when a non-Pro member opens a `pro` space. The space is visible in
 * the nav (so they know it exists) but the content is blocked here, with a
 * path to unlock via the existing subscription / licence flow.
 */
export function LockWall({ name, emoji }: { name: string; emoji: string | null }) {
  const { t } = useLanguage();
  const isEn = t.nav.signIn === "Sign In";

  return (
    <main className="mx-auto max-w-2xl px-5 py-16">
      <header className="mb-8 flex items-center gap-3">
        <span className="text-3xl leading-none">{emoji ?? "🔒"}</span>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{name}</h1>
      </header>

      <div className="rounded-2xl border border-border bg-card p-10 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Lock className="h-5 w-5" />
        </div>
        <h2 className="text-lg font-semibold text-foreground">
          {isEn ? "Pro members only" : "Réservé aux membres Pro"}
        </h2>
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
          {isEn
            ? "Unlock this space with a Pro licence key or subscription."
            : "Débloque cet espace avec une clé de licence Pro ou un abonnement."}
        </p>
        <Link
          href="/dashboard/subscription"
          className="mt-6 inline-flex rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
        >
          {isEn ? "Unlock with Pro" : "Débloquer avec Pro"}
        </Link>
      </div>
    </main>
  );
}

"use client";

import Link from "next/link";
import { useLanguage } from "@/lib/i18n/language-context";
import type { Space } from "@/lib/community/types";

/**
 * Phase-0 space renderer. Shows the space header; for `page` spaces with
 * content it renders the text, otherwise a typed placeholder pointing at
 * the existing surface (catalog / sessions). Full per-type rendering
 * (course lists, event calendars, rich Welcome) lands in Phase 1.
 */
export function SpaceStub({ space }: { space: Space }) {
  const { t } = useLanguage();
  const isEn = t.nav.signIn === "Sign In";
  const content = (space.config as { content_md?: string }).content_md;

  return (
    <main className="mx-auto max-w-3xl px-5 py-10">
      <header className="mb-8 flex items-center gap-3">
        <span className="text-3xl leading-none">{space.emoji ?? "📄"}</span>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{space.name}</h1>
      </header>

      {space.type === "page" && content ? (
        <article className="whitespace-pre-wrap text-base leading-relaxed text-foreground/90">
          {content}
        </article>
      ) : (
        <div className="rounded-xl border border-dashed border-border bg-muted/30 p-8 text-center">
          <p className="text-sm text-muted-foreground">
            {space.type === "course"
              ? isEn
                ? "This space will showcase courses."
                : "Cet espace présentera les cours."
              : space.type === "event"
                ? isEn
                  ? "This space will list upcoming events."
                  : "Cet espace listera les événements à venir."
                : isEn
                  ? "Welcome — content coming soon."
                  : "Bienvenue — le contenu arrive bientôt."}
          </p>

          {space.type === "course" && (
            <Link
              href="/"
              className="mt-4 inline-flex text-sm font-medium text-primary hover:underline"
            >
              {isEn ? "Browse courses →" : "Parcourir les cours →"}
            </Link>
          )}
          {space.type === "event" && (
            <Link
              href="/dashboard/sessions"
              className="mt-4 inline-flex text-sm font-medium text-primary hover:underline"
            >
              {isEn ? "View live sessions →" : "Voir les sessions →"}
            </Link>
          )}
        </div>
      )}
    </main>
  );
}

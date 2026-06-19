"use client";

import { Download, FileText } from "lucide-react";
import { useLanguage } from "@/lib/i18n/language-context";
import type { SpaceDocument } from "@/lib/community/types";

type SignedDocument = SpaceDocument & { url: string | null };

function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Member-facing `document` space — a download list of admin-uploaded files.
 * The signed URLs are generated server-side (after the space's access check),
 * so reaching this view already means the viewer is authorized.
 */
export function DocumentSpace({
  name,
  emoji,
  documents,
}: {
  name: string;
  emoji: string | null;
  documents: SignedDocument[];
}) {
  const { t } = useLanguage();
  const isEn = t.nav.signIn === "Sign In";

  return (
    <main className="mx-auto max-w-3xl px-5 py-10">
      <header className="mb-8 flex items-center gap-3">
        <span className="text-3xl leading-none">{emoji ?? "📎"}</span>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{name}</h1>
      </header>

      {documents.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
          <FileText className="mx-auto h-8 w-8 text-muted-foreground/50" />
          <p className="mx-auto mt-3 max-w-sm text-sm text-muted-foreground">
            {isEn ? "No documents here yet." : "Aucun document pour l'instant."}
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {documents.map((doc) => (
            <li key={doc.path}>
              <a
                href={doc.url ?? "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-3 rounded-xl border border-border/60 bg-card px-4 py-3 transition-colors hover:border-border hover:bg-accent/40"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <FileText className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{doc.name}</p>
                  <p className="font-mono text-[11px] tabular-nums text-muted-foreground/70">
                    {humanSize(doc.size)}
                  </p>
                </div>
                <Download className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" />
              </a>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

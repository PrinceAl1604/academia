"use client";

import Image from "next/image";
import { MessageCircle } from "lucide-react";
import { useLanguage } from "@/lib/i18n/language-context";
import type { Space, PageConfig } from "@/lib/community/types";

/** Turn a YouTube/Vimeo watch URL into an embeddable URL (null if unknown). */
function getEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    if (host === "youtu.be") return `https://www.youtube.com/embed/${u.pathname.slice(1)}`;
    if (host === "youtube.com" || host === "m.youtube.com") {
      const v = u.searchParams.get("v");
      if (v) return `https://www.youtube.com/embed/${v}`;
      if (u.pathname.startsWith("/embed/")) return u.toString();
    }
    if (host === "vimeo.com") {
      const id = u.pathname.split("/").filter(Boolean)[0];
      if (id) return `https://player.vimeo.com/video/${id}`;
    }
  } catch {
    /* not a URL */
  }
  return null;
}

/** Minimal inline render: paragraphs + **bold** (full markdown lands in 1b). */
function renderContent(md: string) {
  return md.split("\n").map((line, i) =>
    line.trim() === "" ? (
      <div key={i} className="h-3" />
    ) : (
      <p key={i} className="text-base leading-relaxed text-foreground/90">
        {line.split(/(\*\*[^*]+\*\*)/g).map((part, j) =>
          part.startsWith("**") && part.endsWith("**") ? (
            <strong key={j} className="font-semibold text-foreground">
              {part.slice(2, -2)}
            </strong>
          ) : (
            <span key={j}>{part}</span>
          )
        )}
      </p>
    )
  );
}

/**
 * Renders a `page` space (e.g. the Welcome page): cover image, video embed,
 * rich-ish text, and the "Join the WhatsApp community" CTA. Used both at the
 * Home route and at /spaces/[slug] for page-type spaces.
 */
export function PageSpaceView({
  space,
  whatsappUrl,
}: {
  space: Space;
  whatsappUrl: string | null;
}) {
  const { t } = useLanguage();
  const isEn = t.nav.signIn === "Sign In";
  const cfg = space.config as PageConfig;
  const embed = cfg.video_url ? getEmbedUrl(cfg.video_url) : null;

  return (
    <main className="mx-auto max-w-3xl px-5 py-10">
      <header className="mb-6 flex items-center gap-3">
        <span className="text-3xl leading-none">{space.emoji ?? "👋"}</span>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{space.name}</h1>
      </header>

      {cfg.cover_url && (
        <div className="relative mb-6 aspect-video w-full overflow-hidden rounded-2xl border border-border">
          <Image
            src={cfg.cover_url}
            alt=""
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 768px"
          />
        </div>
      )}

      {embed && (
        <div className="mb-6 aspect-video w-full overflow-hidden rounded-2xl border border-border">
          <iframe
            src={embed}
            title={space.name}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      )}

      {cfg.content_md && <div className="space-y-1">{renderContent(cfg.content_md)}</div>}

      {whatsappUrl && (
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-8 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
        >
          <MessageCircle className="h-4 w-4" />
          {isEn ? "Join the WhatsApp community" : "Rejoindre la communauté WhatsApp"}
        </a>
      )}
    </main>
  );
}

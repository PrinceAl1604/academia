"use client";

import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

interface CachedPreview {
  url: string;
  title: string | null;
  description: string | null;
  image_url: string | null;
  site_name: string | null;
  status: "ok" | "error" | "blocked";
  fetched_at: string;
}

/* ─── Module-level request cache ──────────────────────────────── */

/**
 * In-memory cache of in-flight and completed preview fetches, keyed by
 * URL. Two benefits over a per-component state:
 *
 *   1) Deduplication: if 12 students post the same YouTube link,
 *      rendering all 12 LinkPreview instances triggers ONE network
 *      request. Subsequent mounts resolve immediately from the cache.
 *   2) Survives unmount: scrolling a message off-screen then back on
 *      doesn't re-fetch — we already have the Promise.
 *
 * The cache is per-page-load (no persistence); staleness is enforced
 * server-side via the `link_previews.fetched_at` TTL.
 */
const previewCache = new Map<string, Promise<CachedPreview | null>>();

async function getPreview(url: string): Promise<CachedPreview | null> {
  const existing = previewCache.get(url);
  if (existing) return existing;

  const promise = (async () => {
    try {
      const res = await fetch("/api/chat/link-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      if (!res.ok) return null;
      const data = (await res.json()) as { preview?: CachedPreview };
      return data.preview ?? null;
    } catch {
      // Network error — don't cache, so a future remount can retry.
      previewCache.delete(url);
      return null;
    }
  })();

  previewCache.set(url, promise);
  return promise;
}

/* ─── Component ───────────────────────────────────────────────── */

interface LinkPreviewProps {
  url: string;
  className?: string;
}

export function LinkPreview({ url, className }: LinkPreviewProps) {
  const [preview, setPreview] = useState<CachedPreview | null | undefined>(
    // `undefined` = loading, `null` = tried and nothing worth showing
    undefined
  );
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getPreview(url).then((p) => {
      if (!cancelled) setPreview(p);
    });
    return () => {
      cancelled = true;
    };
  }, [url]);

  // Loading — render a muted skeleton to reserve the vertical space so
  // the message list doesn't jump when the preview lands. Short enough
  // that the skeleton doesn't dominate.
  if (preview === undefined) {
    return (
      <div
        className={cn(
          "mt-1.5 flex gap-2 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/40 p-2 max-w-md animate-pulse",
          className
        )}
      >
        <div className="h-14 w-14 shrink-0 rounded bg-neutral-200 dark:bg-neutral-800" />
        <div className="flex-1 space-y-1.5">
          <div className="h-3 w-3/4 rounded bg-neutral-200 dark:bg-neutral-800" />
          <div className="h-2 w-full rounded bg-neutral-200 dark:bg-neutral-800" />
        </div>
      </div>
    );
  }

  // Null or status error or no useful data → render nothing. A failed or
  // metadata-less preview would just be a card with "example.com" and
  // nothing else, which is less informative than the link itself.
  if (
    preview === null ||
    preview.status !== "ok" ||
    (!preview.title && !preview.description && !preview.image_url)
  ) {
    return null;
  }

  const showImage = preview.image_url && !imgFailed;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className={cn(
        "mt-1.5 flex gap-2 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/40 p-2 max-w-md hover:border-neutral-300 dark:hover:border-neutral-700 hover:bg-neutral-100/60 dark:hover:bg-neutral-900/70 transition-colors group",
        className
      )}
    >
      {showImage && (
        // eslint-disable-next-line @next/next/no-img-element -- external
        // og:image URLs are arbitrary; next/image would require config'ing
        // remotePatterns for every domain students might link to.
        <img
          src={preview.image_url!}
          alt=""
          className="h-14 w-14 shrink-0 rounded object-cover bg-neutral-200 dark:bg-neutral-800"
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setImgFailed(true)}
        />
      )}
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        {preview.site_name && (
          <div className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-neutral-400 dark:text-neutral-500 truncate">
            <ExternalLink className="h-2.5 w-2.5 shrink-0" />
            <span className="truncate">{preview.site_name}</span>
          </div>
        )}
        {preview.title && (
          <p className="text-xs font-semibold text-neutral-900 dark:text-white line-clamp-1 group-hover:text-green-700 dark:group-hover:text-green-400 transition-colors">
            {preview.title}
          </p>
        )}
        {preview.description && (
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400 line-clamp-2">
            {preview.description}
          </p>
        )}
      </div>
    </a>
  );
}

/* ─── URL extraction helper ──────────────────────────────────── */

/**
 * Grab the first http(s) URL from a chat message. Strips trailing
 * punctuation (comma, period, closing paren) that's almost always
 * part of surrounding prose, not the URL itself.
 *
 * Returns null when no URL is found so callers can skip rendering the
 * preview component entirely (no wasted mount).
 */
export function extractFirstUrl(content: string): string | null {
  const m = /https?:\/\/[^\s<>"']+/i.exec(content);
  if (!m) return null;
  // Trim trailing punctuation that's almost certainly not part of the URL
  let url = m[0];
  while (/[.,!?;:)\]}]$/.test(url)) url = url.slice(0, -1);
  // Balance parens: if the URL has more closers than openers, drop the
  // extras — common for "see (https://foo.com/bar)" where `)` belongs
  // to the prose parenthetical, not the URL.
  let opens = 0;
  for (const ch of url) {
    if (ch === "(") opens++;
    else if (ch === ")") opens--;
  }
  while (opens < 0 && url.endsWith(")")) {
    url = url.slice(0, -1);
    opens++;
  }
  return url || null;
}

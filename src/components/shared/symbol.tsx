"use client";

/**
 * Symbol — Brightroots mark only (no wordmark).
 *
 * Use this in tight horizontal contexts where the full Logo's wordmark
 * would be cropped or illegible:
 *   - Collapsed sidebar rail (~68px wide)
 *   - Avatar-sized brand placement (32-40px)
 *   - Favicon (16-192px squares)
 *   - Loading splash on narrow viewports
 *
 * For anywhere with horizontal room for the wordmark, use <Logo />.
 */
export function Symbol({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <img
      src="/symbol.svg"
      alt="Brightroots"
      className={className}
    />
  );
}

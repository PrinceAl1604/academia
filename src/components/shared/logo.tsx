"use client";

/**
 * Logo — full Brightroots wordmark + symbol.
 *
 * Single asset (`/logo.svg`) since the app is force-dark; the previous
 * dual light/dark variants were a pre-Phase-1 hangover when the app
 * had both modes.
 *
 * Use this in places that have horizontal room for the wordmark
 * (sidebar expanded, auth pages, mobile sheet header). For tight or
 * collapsed contexts (collapsed sidebar rail, favicon, very small
 * sizes), use <Symbol /> instead.
 */
export function Logo({ className = "h-5" }: { className?: string }) {
  return (
    <img
      src="/logo.svg"
      alt="Brightroots"
      className={className}
    />
  );
}

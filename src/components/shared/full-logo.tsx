"use client";

/**
 * Full Brightroots logo (icon + wordmark) — used only on auth pages.
 * Uses the dark text version which is visible on the light auth background.
 */
export function FullLogo({ className = "h-7" }: { className?: string }) {
  return (
    <img
      src="/logo-login.svg"
      alt="Brightroots"
      className={className}
    />
  );
}

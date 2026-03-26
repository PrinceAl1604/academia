"use client";

/**
 * Full Brightroots logo (icon + wordmark) — used only on auth pages.
 * Auth pages have a light background (#faf9f7), so always use dark text version.
 */
export function FullLogo({ className = "h-7" }: { className?: string }) {
  return (
    <img
      src="/logo-login-dark.svg"
      alt="Brightroots"
      className={className}
    />
  );
}

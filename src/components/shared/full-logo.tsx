"use client";

/**
 * Full Brightroots logo (icon + wordmark) — used only on auth pages.
 * Switches between light and dark mode versions.
 */
export function FullLogo({ className = "h-8" }: { className?: string }) {
  return (
    <>
      <img
        src="/logo-login-light.svg"
        alt="Brightroots"
        className={`${className} block dark:hidden`}
      />
      <img
        src="/logo-login-dark.svg"
        alt="Brightroots"
        className={`${className} hidden dark:block`}
      />
    </>
  );
}

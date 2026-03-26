"use client";

/**
 * Logo component for sidebar/navbar — full Brightroots logo (icon + wordmark).
 * Uses dark text version for light mode, light text for dark mode.
 */
export function Logo({ className = "h-5" }: { className?: string }) {
  return (
    <>
      <img
        src="/logo-login.svg"
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

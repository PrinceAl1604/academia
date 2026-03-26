"use client";

/**
 * Logo component for sidebar/navbar — full Brightroots logo (icon + wordmark).
 * - Light mode: dark text version (logo-login-dark.svg — fill="#333333")
 * - Dark mode: white text version (logo-login-light.svg — fill="white")
 */
export function Logo({ className = "h-5" }: { className?: string }) {
  return (
    <>
      <img
        src="/logo-login-dark.svg"
        alt="Brightroots"
        className={`${className} block dark:hidden`}
      />
      <img
        src="/logo-login-light.svg"
        alt="Brightroots"
        className={`${className} hidden dark:block`}
      />
    </>
  );
}

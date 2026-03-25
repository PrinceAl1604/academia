"use client";

/**
 * Logo component that switches between dark and light versions.
 * - Light mode: shows black logo (logo-dark.svg)
 * - Dark mode: shows white logo (logo-light.svg)
 */
export function Logo({ className = "h-5" }: { className?: string }) {
  return (
    <>
      <img
        src="/logo-dark.svg"
        alt="Brightroots"
        className={`${className} block dark:hidden`}
      />
      <img
        src="/logo-light.svg"
        alt="Brightroots"
        className={`${className} hidden dark:block`}
      />
    </>
  );
}

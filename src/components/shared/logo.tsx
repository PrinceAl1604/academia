"use client";

/**
 * Logo component — uses the Brightroots logo SVG.
 * Shows the same logo in both light and dark modes
 * (the SVG itself handles the color via its internal styling).
 */
export function Logo({ className = "h-5" }: { className?: string }) {
  return (
    <>
      <img
        src="/logo-brightroots.svg"
        alt="Brightroots"
        className={`${className} block dark:hidden`}
      />
      <img
        src="/logo-brightroots.svg"
        alt="Brightroots"
        className={`${className} hidden dark:block`}
      />
    </>
  );
}

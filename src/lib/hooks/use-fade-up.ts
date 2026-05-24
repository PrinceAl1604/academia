"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Returns a ref + boolean that flips `true` once the element scrolls
 * into the viewport. Designed for one-shot scroll-fade-up animations
 * on landing-page sections — once visible, the observer disconnects
 * so further scrolling doesn't re-trigger.
 *
 * Accessibility: if the user has `prefers-reduced-motion: reduce`
 * (system-level setting for vestibular disorders, battery saving,
 * or just preference), the boolean is set to `true` immediately so
 * the content renders in its final state without animation. The
 * caller's transition classes still apply but their starting state
 * is skipped.
 *
 * SSR-safe: the IntersectionObserver lives inside useEffect, so it
 * never runs on the server. Initial state is `false` everywhere —
 * the client hydration then flips it instantly for above-fold
 * content via the `rootMargin: -100px` rule (anything that's 100px
 * into the viewport from the bottom edge is considered visible).
 *
 * Usage:
 *   const [ref, inView] = useFadeUp<HTMLElement>();
 *   return (
 *     <section
 *       ref={ref}
 *       className={cn(
 *         "transition-all duration-700 ease-out",
 *         inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
 *       )}
 *     >...</section>
 *   );
 */
export function useFadeUp<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Respect OS-level reduced-motion preference. Skip the observer
    // entirely and render in the final state on first paint.
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          // One-shot: don't re-animate when the user scrolls back up.
          observer.disconnect();
        }
      },
      {
        // Fire as soon as ~10% of the section enters the viewport.
        // The negative bottom margin makes elements trigger slightly
        // BEFORE they're fully on screen, which feels more natural
        // (the animation completes as the user finishes scrolling
        // to the section rather than starting late).
        threshold: 0.1,
        rootMargin: "0px 0px -100px 0px",
      }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return [ref, inView] as const;
}

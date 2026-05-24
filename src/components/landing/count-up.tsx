"use client";

import { useEffect, useState } from "react";
import { useFadeUp } from "@/lib/hooks/use-fade-up";

interface CountUpProps {
  /** Target value the counter animates toward. */
  end: number;
  /** Locale-aware thousands separator. Defaults to fr-FR (space)
   *  when the page language is fr, en-US (comma) otherwise. */
  locale?: string;
  /** Suffix appended after the number — `+`, `%`, etc. */
  suffix?: string;
  /** Animation duration in ms. 1500 feels right for 0→10000 range. */
  duration?: number;
}

/**
 * Animated number counter. Stays at 0 until scrolled into view, then
 * tweens to `end` via requestAnimationFrame using an ease-out-cubic
 * curve (fast start, gentle settle).
 *
 * Why ease-out-cubic vs linear: linear feels mechanical and the eye
 * doesn't believe the number is "settling" on the final value. Cubic
 * ease-out front-loads the change — the visitor sees rapid motion
 * first (catches attention) then a slowdown (signals "this is the
 * real value"). Same curve used in the rest of the page's transitions.
 *
 * Reduced-motion: useFadeUp returns `inView=true` instantly when the
 * user prefers reduced motion, so the effect below skips the tween
 * and snaps directly to `end`.
 */
export function CountUp({
  end,
  locale = "en-US",
  suffix = "",
  duration = 1500,
}: CountUpProps) {
  const [ref, inView] = useFadeUp<HTMLSpanElement>();
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!inView) return;

    // If reduced-motion is on, useFadeUp already flipped inView to
    // true on mount. We respect the same signal here by snapping
    // straight to `end` instead of tweening.
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setCurrent(end);
      return;
    }

    let rafId: number;
    const startedAt = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startedAt;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic — `1 - (1-x)^3`
      const eased = 1 - Math.pow(1 - progress, 3);
      setCurrent(Math.round(eased * end));
      if (progress < 1) {
        rafId = requestAnimationFrame(tick);
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [inView, end, duration]);

  return (
    <span ref={ref}>
      {current.toLocaleString(locale)}
      {suffix}
    </span>
  );
}

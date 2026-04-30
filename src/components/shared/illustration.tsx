"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

interface IllustrationProps {
  /** SVG path under public/illustrations/, e.g. "no-courses" → /illustrations/no-courses.svg */
  name: string;
  /** Accessible alt text. Pass empty string for decorative-only illustrations. */
  alt: string;
  /**
   * Render size. unDraw illustrations are flat SVGs that scale crisply,
   * but they're designed to read at 200px+. Anything smaller looks thin.
   *  - sm: 160 (empty-state in cards)
   *  - md: 240 (default — empty states, dashboard moments)
   *  - lg: 360 (hero, auth side panels)
   *  - xl: 480 (full-bleed onboarding moments)
   */
  size?: "sm" | "md" | "lg" | "xl";
  /** Extra classes — typically just margin tweaks. */
  className?: string;
  /** Set true on above-the-fold illustrations for priority loading. */
  priority?: boolean;
}

const SIZES: Record<NonNullable<IllustrationProps["size"]>, number> = {
  sm: 160,
  md: 240,
  lg: 360,
  xl: 480,
};

/**
 * Illustration — wraps an unDraw SVG with consistent sizing + tone.
 *
 * Why this component exists:
 *   • Single source of truth for dimensions — illustrations stay
 *     visually proportional across pages instead of every consumer
 *     guessing at width/height
 *   • The `opacity-90` mute is applied here, not at each call site,
 *     so all illustrations share the same "weight" against the dark
 *     background. unDraw at 100% opacity reads as too punchy on a
 *     near-black surface; 90% lets the surface tone do its work.
 *   • Decorative illustrations should pass alt="" so screen readers
 *     skip them — the component doesn't enforce that, but the prop
 *     being required nudges callers to think about it.
 *
 * Usage:
 *   <Illustration name="no-courses" alt="" size="md" />
 *   → renders /illustrations/no-courses.svg at 240×240, muted to 90%
 *
 * To add a new illustration:
 *   1. Visit undraw.co, find the SVG you want
 *   2. Set the color picker to #269e5f (your --primary forest green)
 *   3. Download the SVG
 *   4. Save it as public/illustrations/<kebab-name>.svg
 *   5. Reference by `name="<kebab-name>"` (no extension, no leading slash)
 */
export function Illustration({
  name,
  alt,
  size = "md",
  className,
  priority = false,
}: IllustrationProps) {
  const dim = SIZES[size];
  return (
    <Image
      src={`/illustrations/${name}.svg`}
      alt={alt}
      width={dim}
      height={dim}
      // Inline style sets max-width/height; Next/Image otherwise fixes the
      // aspect to 1:1 which clips wide unDraw illustrations.
      style={{ maxWidth: dim, height: "auto" }}
      className={cn("opacity-90", className)}
      priority={priority}
      aria-hidden={alt === "" ? true : undefined}
    />
  );
}

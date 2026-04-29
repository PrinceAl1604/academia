"use client";

import { useRef, useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { CourseCard } from "./course-card";
import { CourseRow } from "@/lib/api";
import { Button } from "@/components/ui/button";

interface CourseCarouselProps {
  title: string;
  subtitle: string;
  courses: CourseRow[];
  locked?: (course: CourseRow) => boolean;
}

/**
 * CourseCarousel — Cook-OS-flavored refresh.
 *
 * Section header now has a mono-uppercase preheader matching the
 * broader page typography ("/ Section name") then a tight headline.
 * The subtitle is mono + tabular-nums so figure counts align nicely
 * across consecutive rails.
 *
 * Scroll buttons migrated to the shadcn `Button` primitive (icon-sm
 * variant) so they pick up the same hover/focus treatments as
 * everything else in the design system. Previously they were
 * custom-rolled with hardcoded neutrals.
 */
export function CourseCarousel({
  title,
  subtitle,
  courses,
  locked,
}: CourseCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 4);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 4);
  };

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    el?.addEventListener("scroll", checkScroll);
    return () => el?.removeEventListener("scroll", checkScroll);
  }, []);

  const scroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const amount = 340;
    scrollRef.current.scrollBy({
      left: direction === "left" ? -amount : amount,
      behavior: "smooth",
    });
  };

  return (
    <section className="mb-12" role="region" aria-label={title}>
      {/* Header */}
      <div className="flex items-end justify-between mb-5">
        <div className="space-y-0.5">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            / {title}
          </p>
          <h2 className="text-lg font-medium tracking-tight text-foreground">
            {title}
          </h2>
          <p className="font-mono text-[11px] text-muted-foreground tabular-nums">
            {subtitle}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => scroll("left")}
            disabled={!canScrollLeft}
            aria-label="Scroll left"
            className="text-muted-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => scroll("right")}
            disabled={!canScrollRight}
            aria-label="Scroll right"
            className="text-muted-foreground"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Scrollable row */}
      <div
        ref={scrollRef}
        className="flex gap-3 sm:gap-4 overflow-x-auto pb-2 scrollbar-hide"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {courses.map((course, idx) => (
          <CourseCard
            key={course.id}
            course={course}
            index={idx}
            locked={locked ? locked(course) : false}
          />
        ))}
      </div>
    </section>
  );
}

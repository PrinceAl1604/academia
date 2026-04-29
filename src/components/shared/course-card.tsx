"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { CourseRow } from "@/lib/api";
import { MembershipPopover } from "./upgrade-popover";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/i18n/language-context";
import { useProgress } from "@/lib/progress-context";
import { cn } from "@/lib/utils";

interface CourseCardProps {
  course: CourseRow;
  index?: number;
  locked?: boolean;
  variant?: "default" | "compact";
}

/**
 * CourseCard — Cook-OS-flavored refresh.
 *
 * Migrated from `bg-white dark:bg-neutral-900 border-neutral-200/60` to
 * semantic `bg-card border-border/60`. The colored gradient thumbnail
 * (kept for visual variety across cards) gets translated to dark
 * variants by the override block in globals.css until Phase 9 cleanup.
 *
 * Type changes:
 *   • Index badge becomes a mono-tabular figure ("01", "02", "03")
 *     instead of a generic numbered pill
 *   • Category chip uses Badge variant="mono" — outlined, no fill
 *   • Title is medium weight (was semibold) — pairs with the broader
 *     page typography
 *   • Duration label uses `font-mono tabular-nums` for figure alignment
 *
 * Hover state goes from `hover:shadow-md` to `hover:border-border` —
 * shadows feel out of place on the dark theme; a brighter border edge
 * is the equivalent affordance.
 */

// Soft gradient backgrounds for thumbnails — kept colorful for visual
// variety since the rest of the card is restrained. The override block
// in globals.css remaps the *-100 starting tones to muted dark
// equivalents so they don't fight the dark theme.
const gradients = [
  "from-orange-100 via-rose-100 to-amber-100",
  "from-blue-100 via-indigo-100 to-purple-100",
  "from-emerald-100 via-teal-100 to-cyan-100",
  "from-pink-100 via-fuchsia-100 to-purple-100",
  "from-amber-100 via-yellow-100 to-orange-100",
  "from-sky-100 via-blue-100 to-indigo-100",
];

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function CourseCard({
  course,
  index = 0,
  locked = false,
  variant = "default",
}: CourseCardProps) {
  const { isAuthenticated } = useAuth();
  const { t } = useLanguage();
  const { progress } = useProgress();
  const router = useRouter();
  const gradient = gradients[hashCode(course.id) % gradients.length];
  const categoryName = course.category?.name ?? "General";
  const totalLessons = course.total_lessons ?? 0;
  const durationLabel = `${course.duration_hours ?? 0} ${t.courseCard.hours}`;

  const progressValue = locked ? 0 : (progress[course.id] ?? 0);

  const handleClick = (e: React.MouseEvent) => {
    if (!isAuthenticated) {
      e.preventDefault();
      router.push("/sign-in");
      return;
    }
    if (locked) {
      e.preventDefault();
    }
  };

  if (variant === "compact") {
    const compactCard = (
      <div
        className={cn(
          "group relative rounded-xl border border-border/60 bg-card transition-colors hover:border-border",
          locked && "opacity-70"
        )}
      >
        <div className="flex gap-3 p-3">
          <div
            className={cn(
              "relative h-16 w-24 flex-shrink-0 overflow-hidden rounded-lg bg-gradient-to-br",
              gradient
            )}
          >
            {(course.cover_url || course.thumbnail_url) && (
              <Image
                src={(course.cover_url || course.thumbnail_url)!}
                alt={course.title}
                fill
                sizes="96px"
                className="object-cover"
              />
            )}
            {locked && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
                <Lock className="h-4 w-4 text-white" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-foreground truncate tracking-tight">
              {course.title}
            </h3>
            <p className="mt-0.5 font-mono text-[11px] text-muted-foreground tabular-nums">
              {totalLessons} {totalLessons === 1 ? t.courseCard.class : t.courseCard.classes}
            </p>
          </div>
        </div>
      </div>
    );

    if (locked) {
      return <MembershipPopover>{compactCard}</MembershipPopover>;
    }

    return (
      <Link href={`/courses/${course.slug}`} className="block" onClick={handleClick}>
        {compactCard}
      </Link>
    );
  }

  // Format index as "01", "02", ..., "10", "11" — pads with leading zero
  // for figure parity in the mono-figure aesthetic.
  const indexLabel = String(index + 1).padStart(2, "0");

  const defaultCard = (
    <div
      className={cn(
        "group relative w-[280px] sm:w-[320px] flex-shrink-0 rounded-xl border border-border/60 bg-card transition-colors hover:border-border",
        locked && "opacity-70"
      )}
    >
      {/* Header: index + category chip */}
      <div className="flex items-center gap-2 px-4 pt-3 pb-2">
        <span className="font-mono text-[11px] font-medium text-muted-foreground tabular-nums">
          {indexLabel}
        </span>
        <span className="inline-flex items-center rounded-md border border-border/60 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          {categoryName}
        </span>
        {locked && <Lock className="ml-auto h-3.5 w-3.5 text-muted-foreground" />}
      </div>

      {/* Thumbnail */}
      <div className="px-4">
        <div
          className={cn(
            "relative aspect-[16/10] w-full overflow-hidden rounded-lg bg-gradient-to-br",
            gradient
          )}
        >
          {(course.cover_url || course.thumbnail_url) ? (
            <Image
              src={(course.cover_url || course.thumbnail_url)!}
              alt={course.title}
              fill
              sizes="(max-width: 640px) 280px, 320px"
              className="object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center p-4">
              <div className="w-full space-y-2 rounded-lg bg-white/60 p-3 backdrop-blur-sm">
                <div className="h-2 w-3/4 rounded-full bg-neutral-300/50" />
                <div className="h-2 w-1/2 rounded-full bg-neutral-300/50" />
                <div className="h-2 w-2/3 rounded-full bg-neutral-300/50" />
              </div>
            </div>
          )}
          {locked && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
              <Lock className="h-6 w-6 text-white" />
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pt-3 pb-4">
        <h3 className="text-sm font-medium text-foreground leading-snug tracking-tight">
          {course.title}
        </h3>
        <p className="mt-1 font-mono text-[11px] text-muted-foreground tabular-nums">
          {totalLessons} {totalLessons === 1 ? t.courseCard.class : t.courseCard.classes}
        </p>

        {/* Progress bar */}
        <div className="mt-3 flex items-center gap-2">
          <span className="font-mono text-[11px] font-medium text-muted-foreground tabular-nums">
            {durationLabel}
          </span>
          <Progress value={progressValue} className="h-1 flex-1" />
        </div>
      </div>
    </div>
  );

  if (locked) {
    return <MembershipPopover>{defaultCard}</MembershipPopover>;
  }

  return (
    <Link href={`/courses/${course.slug}`} className="block" onClick={handleClick}>
      {defaultCard}
    </Link>
  );
}

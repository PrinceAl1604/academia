"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Course } from "@/types";
import { MembershipPopover } from "./upgrade-popover";
import { useAuth } from "@/lib/auth-context";

interface CourseCardProps {
  course: Course;
  index?: number;
  locked?: boolean;
  variant?: "default" | "compact";
}

// Soft gradient backgrounds for thumbnails
const gradients = [
  "from-orange-100 via-rose-100 to-amber-100",
  "from-blue-100 via-indigo-100 to-purple-100",
  "from-emerald-100 via-teal-100 to-cyan-100",
  "from-pink-100 via-fuchsia-100 to-purple-100",
  "from-amber-100 via-yellow-100 to-orange-100",
  "from-sky-100 via-blue-100 to-indigo-100",
];

export function CourseCard({
  course,
  index = 0,
  locked = false,
  variant = "default",
}: CourseCardProps) {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const gradient = gradients[parseInt(course.id) % gradients.length];
  const totalLessons = course.curriculum.reduce(
    (acc, mod) => acc + mod.lessons.length,
    0
  );

  const progressValue = locked ? 0 : (parseInt(course.id) * 17) % 100;

  const handleClick = (e: React.MouseEvent) => {
    if (!isAuthenticated) {
      e.preventDefault();
      router.push("/sign-in");
      return;
    }
    if (locked) {
      e.preventDefault();
      // Popover handles this
    }
  };

  if (variant === "compact") {
    const compactCard = (
      <div
        className={`group relative rounded-xl border border-neutral-200/60 bg-white transition-all hover:shadow-md ${
          locked ? "opacity-70" : ""
        }`}
      >
        <div className="flex gap-3 p-3">
          <div
            className={`relative h-16 w-24 flex-shrink-0 overflow-hidden rounded-lg bg-gradient-to-br ${gradient}`}
          >
            {locked && (
              <div className="absolute inset-0 flex items-center justify-center bg-neutral-900/30 rounded-lg">
                <Lock className="h-4 w-4 text-white" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-neutral-900 truncate">
              {course.title}
            </h3>
            <p className="mt-0.5 text-xs text-neutral-500">
              {totalLessons} {totalLessons === 1 ? "class" : "classes"}
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

  const defaultCard = (
    <div
      className={`group relative w-[320px] flex-shrink-0 rounded-xl border border-neutral-200/60 bg-white transition-all hover:shadow-md ${
        locked ? "opacity-70" : ""
      }`}
    >
      {/* Header with number + category tag */}
      <div className="flex items-center gap-2 px-4 pt-3 pb-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-neutral-100 text-xs font-semibold text-neutral-600">
          {index + 1}
        </span>
        <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-600">
          {course.category}
        </span>
        {locked && <Lock className="ml-auto h-3.5 w-3.5 text-neutral-400" />}
      </div>

      {/* Thumbnail */}
      <div className="px-4">
        <div
          className={`relative aspect-[16/10] w-full overflow-hidden rounded-lg bg-gradient-to-br ${gradient}`}
        >
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="w-full space-y-2 rounded-lg bg-white/60 p-3 backdrop-blur-sm">
              <div className="h-2 w-3/4 rounded-full bg-neutral-300/50" />
              <div className="h-2 w-1/2 rounded-full bg-neutral-300/50" />
              <div className="h-2 w-2/3 rounded-full bg-neutral-300/50" />
            </div>
          </div>
          {locked && (
            <div className="absolute inset-0 flex items-center justify-center bg-neutral-900/30 rounded-lg">
              <Lock className="h-6 w-6 text-white" />
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pt-3 pb-4">
        <h3 className="text-sm font-semibold text-neutral-900 leading-snug">
          {course.title}
        </h3>
        <p className="mt-1 text-xs text-neutral-500">
          {totalLessons} {totalLessons === 1 ? "class" : "classes"}
        </p>

        {/* Progress bar */}
        <div className="mt-3 flex items-center gap-2">
          <span className="text-[11px] font-medium text-neutral-400 tabular-nums">
            {course.duration}
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

export default function GlobalLoading() {
  return (
    <div className="min-h-screen bg-neutral-50/50 dark:bg-neutral-950">
      {/* Topbar skeleton */}
      <div className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-white/80 dark:bg-neutral-950/80 px-4 backdrop-blur-md lg:px-8">
        <div className="h-5 w-24 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
        <div className="flex-1" />
        <div className="h-8 w-8 animate-pulse rounded-full bg-neutral-200 dark:bg-neutral-800" />
        <div className="h-8 w-8 animate-pulse rounded-full bg-neutral-200 dark:bg-neutral-800" />
      </div>

      {/* Content skeleton */}
      <div className="lg:pl-64">
        <div className="p-4 lg:p-8 space-y-8">
          {/* Title */}
          <div className="space-y-2">
            <div className="h-8 w-48 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
            <div className="h-4 w-72 animate-pulse rounded bg-neutral-100 dark:bg-neutral-800/60" />
          </div>

          {/* Category pills */}
          <div className="flex gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-8 animate-pulse rounded-full bg-neutral-200 dark:bg-neutral-800"
                style={{ width: `${60 + i * 20}px` }}
              />
            ))}
          </div>

          {/* Course card skeletons */}
          <div className="space-y-3">
            <div className="h-5 w-36 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
            <div className="flex gap-4 overflow-hidden">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="w-[280px] shrink-0 rounded-xl border border-neutral-200/60 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 space-y-3"
                >
                  <div className="flex gap-2">
                    <div className="h-6 w-6 animate-pulse rounded-full bg-neutral-200 dark:bg-neutral-800" />
                    <div className="h-6 w-20 animate-pulse rounded-full bg-neutral-100 dark:bg-neutral-800/60" />
                  </div>
                  <div className="aspect-[16/10] w-full animate-pulse rounded-lg bg-neutral-200 dark:bg-neutral-800" />
                  <div className="h-4 w-3/4 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
                  <div className="h-3 w-1/2 animate-pulse rounded bg-neutral-100 dark:bg-neutral-800/60" />
                  <div className="h-1 w-full animate-pulse rounded-full bg-neutral-200 dark:bg-neutral-800" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

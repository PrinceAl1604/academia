/**
 * Admin route segment loading skeleton.
 *
 * Next.js 16 renders this INSTANTLY when the user navigates to any
 * /admin/* route, while the actual page component fetches its data.
 * Replaces the per-page <Loader2 /> spinner with a layout-stable
 * skeleton that matches the page's actual structure — eliminates
 * the "blank screen → content jump" perception.
 */
export default function AdminLoading() {
  return (
    <div className="px-4 py-8 lg:px-8 lg:py-12 max-w-6xl mx-auto space-y-8 animate-pulse">
      {/* Hero skeleton */}
      <header className="space-y-2">
        <div className="h-3 w-24 rounded bg-muted/60" />
        <div className="h-9 w-2/3 sm:w-1/2 rounded bg-muted/60" />
        <div className="h-4 w-3/4 rounded bg-muted/40" />
      </header>

      {/* Generic content block skeleton */}
      <div className="space-y-3">
        <div className="h-12 rounded-xl bg-muted/30" />
        <div className="h-12 rounded-xl bg-muted/30" />
        <div className="h-12 rounded-xl bg-muted/30" />
      </div>
    </div>
  );
}

/**
 * Loading skeleton for /dashboard and its child routes. Same idea
 * as admin/loading.tsx — Next.js renders this immediately on
 * navigation while the page component fetches its data.
 */
export default function DashboardLoading() {
  return (
    <div className="px-4 py-8 lg:px-8 lg:py-12 max-w-6xl mx-auto space-y-10 animate-pulse">
      {/* Hero greeting skeleton */}
      <header className="space-y-2">
        <div className="h-3 w-24 rounded bg-muted/60" />
        <div className="h-9 w-2/3 sm:w-1/2 rounded bg-muted/60" />
        <div className="h-4 w-3/4 rounded bg-muted/40" />
      </header>

      {/* Stats row skeleton */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="h-20 rounded-xl bg-muted/30" />
        <div className="h-20 rounded-xl bg-muted/30" />
      </div>

      {/* Course cards skeleton */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="h-64 rounded-xl bg-muted/30" />
        <div className="h-64 rounded-xl bg-muted/30" />
        <div className="h-64 rounded-xl bg-muted/30" />
      </div>
    </div>
  );
}

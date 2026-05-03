/**
 * Loading skeleton for /admin/sessions and its child routes.
 * Mirrors the actual list layout (hero + 3 row cards) so users see
 * shape immediately instead of a blank screen during route fetches.
 */
export default function AdminSessionsLoading() {
  return (
    <div className="px-4 py-8 lg:px-8 lg:py-12 max-w-6xl mx-auto space-y-8 animate-pulse">
      <header className="flex items-end justify-between gap-4">
        <div className="space-y-2 flex-1">
          <div className="h-3 w-24 rounded bg-muted/60" />
          <div className="h-9 w-2/3 sm:w-1/3 rounded bg-muted/60" />
          <div className="h-4 w-3/4 rounded bg-muted/40" />
        </div>
        <div className="h-9 w-28 rounded-lg bg-muted/40" />
      </header>

      <div className="rounded-xl border border-border/60 bg-card divide-y divide-border/60">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="grid grid-cols-1 lg:grid-cols-[1fr_140px_180px_100px_100px_88px] items-center gap-4 px-5 py-4"
          >
            <div className="space-y-1">
              <div className="h-4 w-3/4 rounded bg-muted/50" />
              <div className="h-3 w-1/2 rounded bg-muted/30" />
            </div>
            <div className="h-3 w-20 rounded bg-muted/30" />
            <div className="h-3 w-32 rounded bg-muted/30" />
            <div className="h-3 w-12 rounded bg-muted/30 lg:ml-auto" />
            <div className="h-5 w-16 rounded-full bg-muted/30 lg:ml-auto" />
            <div className="h-7 w-16 rounded-md bg-muted/30 lg:ml-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}

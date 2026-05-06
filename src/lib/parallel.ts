/**
 * Bounded-concurrency Promise.all replacement.
 *
 * Use when you need to run an async operation (network call, DB write,
 * email send) for every item in a list, but `Promise.all` would either:
 *   1. Stampede and trip a rate limit (Resend = 10/s, Daily = 5/s), or
 *   2. Sequentially `await` in a for-loop, eating wall-clock time and
 *      risking Vercel's serverless function timeout (10s on hobby).
 *
 * `mapWithConcurrency(items, limit, fn)` keeps at most `limit` workers
 * in flight at a time, returns results in input order, and never throws
 * — failed items resolve to the value returned by `fn`'s catch path.
 *
 * Implementation note: simple worker-pool pattern. Each worker pulls
 * the next index from a shared cursor, awaits, writes the result.
 * No external dependency (p-limit etc.) — small enough to inline.
 */
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const n = items.length;
  if (n === 0) return [];
  const lim = Math.max(1, Math.min(limit, n));
  const results = new Array<R>(n);
  let cursor = 0;

  async function worker() {
    while (true) {
      const i = cursor++;
      if (i >= n) return;
      results[i] = await fn(items[i], i);
    }
  }

  const workers = Array.from({ length: lim }, worker);
  await Promise.all(workers);
  return results;
}

/**
 * Same shape as mapWithConcurrency, but returns `Settled<R>` so callers
 * can distinguish errors from successes without each `fn` having to
 * implement its own try/catch wrapper.
 */
export type Settled<R> =
  | { ok: true; value: R }
  | { ok: false; error: unknown };

export function settledMap<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<Settled<R>[]> {
  return mapWithConcurrency<T, Settled<R>>(items, limit, async (item, i) => {
    try {
      return { ok: true, value: await fn(item, i) };
    } catch (error) {
      return { ok: false, error };
    }
  });
}

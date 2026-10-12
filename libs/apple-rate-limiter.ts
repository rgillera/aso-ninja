// Serializes all Apple API calls server-wide so only one goes out at a time,
// with a minimum gap between them. Prevents 403 rate-limit errors when many
// users add uncached keywords simultaneously.
//
// Works within a single Node.js process (single server / VPS deployment).
// On multi-instance deployments each instance has its own queue, which still
// reduces burst load significantly.

// Apple's iTunes search endpoint trips an undocumented ~20/min-per-IP limit
// (same figure liveSearch.ts's own client-side queue is paced against —
// keep these two in sync). 1000ms let requests out 3x faster than that, so
// a run of any real length was guaranteed to 403 itself almost immediately.
const GAP_MS = 3500;

// App Store search autocomplete (search.itunes.apple.com hints) is a
// different host from the iTunes search API and doesn't share its ~20/min
// limit — a ~180-request run at 400ms gaps went through without a single
// error — so it gets its own, much shorter-gapped queue instead of waiting
// behind search requests. See libs/keyword-autocomplete.ts.
const HINTS_GAP_MS = 500;

export function createQueue(gapMs: number) {
  let chain: Promise<void> = Promise.resolve();
  return function enqueue<T>(fn: () => Promise<T>): Promise<T> {
    const result: Promise<T> = chain.then(() => fn());
    // Advance the chain whether fn succeeds or fails, then wait the gap.
    chain = result.then(
      () => new Promise<void>((r) => setTimeout(r, gapMs)),
      () => new Promise<void>((r) => setTimeout(r, gapMs)),
    );
    return result;
  };
}

export const enqueueAppleRequest = createQueue(GAP_MS);
export const enqueueAppleHintsRequest = createQueue(HINTS_GAP_MS);

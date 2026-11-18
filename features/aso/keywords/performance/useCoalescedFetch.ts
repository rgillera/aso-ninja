import { useEffect, useRef } from "react";

type Options<T> = {
  enabled: boolean;
  /** What is being loaded (app, keyword list, competitor set). A change is a
   *  fresh load: shows loading and ignores any older response still in flight. */
  scope: string;
  /** Bumped when the same data should be reloaded quietly (a rank check landed). */
  refreshKey: number;
  load: () => Promise<T>;
  onData: (data: T) => void;
  onLoading: (loading: boolean) => void;
  /** A fresh load failed. A failed quiet refresh keeps what's on screen. */
  onFreshError?: () => void;
};

// Loads data for a scope and reloads it when refreshKey changes, for data
// that's expensive to compute (hundreds of keywords) and gets refresh
// requests in bursts (a rank-check batch bumps refreshKey once per keyword,
// every few seconds, for up to an hour).
//
// - Quiet refreshes wait 2s for the burst to pause, and at most one request
//   runs at a time: a refresh asked for mid-request runs once when it
//   finishes, instead of piling up concurrent queries.
// - A response for the current scope is always applied, never discarded
//   because a newer refresh was asked for. Discarding them left the Search
//   Visibility chart on "Loading" for a whole batch whenever its query took
//   longer than the gap between two rank checks.
export function useCoalescedFetch<T>(options: Options<T>) {
  const latest = useRef(options);
  useEffect(() => { latest.current = options; });

  const state = useRef({ scope: null as string | null, generation: 0, inFlight: false, pending: false });

  const { enabled, scope, refreshKey } = options;
  useEffect(() => {
    if (!enabled) return;
    const s = state.current;
    const fresh = s.scope !== scope;

    const run = (isFresh: boolean) => {
      const generation = s.generation;
      s.inFlight = true;
      s.pending = false;
      latest.current.load()
        .then((data) => { if (generation === s.generation) latest.current.onData(data); })
        .catch(() => { if (generation === s.generation && isFresh) latest.current.onFreshError?.(); })
        .finally(() => {
          if (generation !== s.generation) return;
          s.inFlight = false;
          latest.current.onLoading(false);
          if (s.pending) run(false);
        });
    };

    const t = setTimeout(() => {
      if (fresh) {
        s.scope = scope;
        s.generation += 1;
        latest.current.onLoading(true);
        run(true);
      } else if (s.inFlight) {
        s.pending = true;
      } else {
        run(false);
      }
    }, fresh ? 300 : 2000);
    return () => clearTimeout(t);
  }, [enabled, scope, refreshKey]);
}

/** fetch() that rejects on a non-2xx response instead of parsing an error body as data. */
export async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${url} ${res.status}`);
  return res.json() as Promise<T>;
}

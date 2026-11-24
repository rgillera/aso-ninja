"use server";

import { searchAppStore } from "@/libs/store/appstore";
import { searchPlayStore, lookupPlayStore } from "@/libs/store/googleplay";
import type { AppSearchResult } from "@/libs/contracts";

export type SearchStoreResult = {
  results: AppSearchResult[];
  iosUnavailable: boolean;
};

// Alternates between the two lists so both stores are represented near the
// front of the results — a plain concat would let a large iOS result set
// push every Android result past the UI's collapsed preview slice.
function interleave<T>(a: T[], b: T[]): T[] {
  const merged: T[] = [];
  const max = Math.max(a.length, b.length);
  for (let i = 0; i < max; i++) {
    if (i < a.length) merged.push(a[i]);
    if (i < b.length) merged.push(b[i]);
  }
  return merged;
}

// How many top iOS results get a direct Play lookup. Each is one extra
// request, so this stays small; the app being searched for is almost always
// among the first few iOS hits.
const PLAY_PROBE_COUNT = 3;

// Play's search ranking is per country and can leave an app out entirely even
// when its exact name is the query (e.g. "MyTripSharing" in IT returns 15
// other apps). Many apps share one bundle id across stores, so look up the top
// iOS results' bundle ids on Play directly and add any that exist there.
// Play's detail lookup answers for any country, so it can't confirm
// availability by itself; the candidates come from this country's App Store
// results, which is what keeps unavailable apps out in practice.
async function sameBundleOnPlay(
  iosResults: AppSearchResult[],
  androidResults: AppSearchResult[],
  country: string
): Promise<AppSearchResult[]> {
  const known = new Set(androidResults.map((r) => r.bundleId));
  const candidates = [...new Set(iosResults.slice(0, PLAY_PROBE_COUNT).map((r) => r.bundleId))]
    .filter((id) => id && !known.has(id));
  const found = await Promise.all(candidates.map((id) => lookupPlayStore(id, country)));
  return found.filter((r): r is AppSearchResult => r !== null);
}

export async function searchStoreApps(query: string, country: string): Promise<SearchStoreResult> {
  if (!query.trim()) return { results: [], iosUnavailable: false };
  const [ios, android] = await Promise.allSettled([
    searchAppStore(query, country),
    searchPlayStore(query, country),
  ]);
  const iosResults     = ios.status === "fulfilled" && ios.value !== null ? ios.value : [];
  const iosUnavailable = ios.status === "rejected" || (ios.status === "fulfilled" && ios.value === null);
  const searched = android.status === "fulfilled" ? android.value : [];
  const androidResults = [...(await sameBundleOnPlay(iosResults, searched, country)), ...searched];
  return {
    results: interleave(iosResults, androidResults).slice(0, 24),
    iosUnavailable,
  };
}

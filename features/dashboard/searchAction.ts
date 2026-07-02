"use server";

import { searchAppStore } from "@/libs/store/appstore";
import { searchPlayStore } from "@/libs/store/googleplay";
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

export async function searchStoreApps(query: string, country: string): Promise<SearchStoreResult> {
  if (!query.trim()) return { results: [], iosUnavailable: false };
  const [ios, android] = await Promise.allSettled([
    searchAppStore(query, country),
    searchPlayStore(query, country),
  ]);
  const iosResults     = ios.status === "fulfilled" && ios.value !== null ? ios.value : [];
  const iosUnavailable = ios.status === "rejected" || (ios.status === "fulfilled" && ios.value === null);
  const androidResults = android.status === "fulfilled" ? android.value : [];
  return {
    results: interleave(iosResults, androidResults).slice(0, 24),
    iosUnavailable,
  };
}

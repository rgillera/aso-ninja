"use server";

import { searchAppStore } from "@/libs/store/appstore";
import { searchPlayStore } from "@/libs/store/googleplay";
import type { AppSearchResult } from "@/libs/contracts";

export type SearchStoreResult = {
  results: AppSearchResult[];
  iosUnavailable: boolean;
};

export async function searchStoreApps(query: string): Promise<SearchStoreResult> {
  if (!query.trim()) return { results: [], iosUnavailable: false };
  const [ios, android] = await Promise.allSettled([
    searchAppStore(query, "US"),
    searchPlayStore(query, "US"),
  ]);
  const iosResults     = ios.status === "fulfilled" && ios.value !== null ? ios.value : [];
  const iosUnavailable = ios.status === "rejected" || (ios.status === "fulfilled" && ios.value === null);
  const androidResults = android.status === "fulfilled" ? android.value : [];
  return {
    results: [...iosResults, ...androidResults].slice(0, 24),
    iosUnavailable,
  };
}

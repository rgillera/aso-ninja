"use server";

import { searchAppStore } from "@/libs/store/appstore";
import { searchPlayStore } from "@/libs/store/googleplay";
import type { AppSearchResult } from "@/libs/contracts";

export async function searchStoreApps(query: string): Promise<AppSearchResult[]> {
  if (!query.trim()) return [];
  const [ios, android] = await Promise.allSettled([
    searchAppStore(query, "US"),
    searchPlayStore(query, "US"),
  ]);
  const iosResults     = ios.status     === "fulfilled" ? ios.value     : [];
  const androidResults = android.status === "fulfilled" ? android.value : [];
  return [...iosResults, ...androidResults].slice(0, 24);
}

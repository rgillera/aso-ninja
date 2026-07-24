"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SavedKeyword } from "@/app/api/keywords/list/route";
import type { PerformanceSnapshotResult } from "@/app/api/keywords/performance-snapshots/route";
import { RankingList } from "@/features/mobile/RankingList";
import { NavigationDrawer } from "@/features/mobile/NavigationDrawer";
import { PullToRefresh } from "@/features/mobile/PullToRefresh";
import { countryFlag } from "@/libs/countries";

const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days — matches DashboardShell.tsx

export function MobileMonitor({
  workspaceId,
  appId,
  appName,
  appIconUrl,
  store,
  storeId,
  country,
}: {
  workspaceId: string;
  appId: string;
  appName: string;
  appIconUrl: string | null;
  store: string;
  storeId: string | null;
  country: string | null;
}) {
  const [keywords, setKeywords] = useState<SavedKeyword[] | null>(null);
  const [snapshots, setSnapshots] = useState<PerformanceSnapshotResult>({});
  const mountedRef = useRef(true);

  // Remembers this pick the same way DashboardShell.tsx does, so the next
  // visit to /mobile skips both pickers straight to this app.
  useEffect(() => {
    document.cookie = `lastAppId=${appId}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
    document.cookie = `lastWorkspaceId=${workspaceId}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
  }, [appId, workspaceId]);

  // Shared by the initial load and the pull-to-refresh gesture (see
  // features/mobile/PullToRefresh.tsx) so there's one fetch path, not two.
  const fetchRankings = useCallback(async () => {
    const { keywords: kws } = (await fetch(`/api/keywords/list?appId=${appId}`).then((r) => r.json())) as {
      keywords: SavedKeyword[];
    };
    if (!mountedRef.current) return;
    setKeywords(kws ?? []);

    if (kws?.length && storeId && country) {
      const params = new URLSearchParams({
        terms: kws.map((k) => k.term).join(","),
        store,
        country,
        storeId,
      });
      const data = (await fetch(
        `/api/keywords/performance-snapshots?${params}`
      ).then((r) => r.json())) as PerformanceSnapshotResult;
      if (mountedRef.current) setSnapshots(data);
    }
  }, [appId, store, storeId, country]);

  useEffect(() => {
    mountedRef.current = true;
    fetchRankings();
    return () => {
      mountedRef.current = false;
    };
  }, [fetchRankings]);

  return (
    <main className="mx-auto max-w-md">
      <header className="flex items-center gap-4 border-b border-white/[0.06] px-5 py-6">
        <NavigationDrawer workspaceId={workspaceId} appId={appId} />
        {appIconUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={appIconUrl} alt="" className="size-12 rounded-xl" />
        ) : null}
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-medium text-gray-100">{appName}</h1>
          <p className="mt-0.5 text-sm text-gray-600">
            {country ? `${countryFlag(country)} ${country} · ` : ""}Keyword rankings
          </p>
        </div>
      </header>

      <PullToRefresh onRefresh={fetchRankings}>
        {keywords === null ? (
          <p className="px-4 py-8 text-center text-sm text-gray-500">Loading…</p>
        ) : (
          <RankingList key={appId} keywords={keywords} snapshots={snapshots} />
        )}
      </PullToRefresh>
    </main>
  );
}

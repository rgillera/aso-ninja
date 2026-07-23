"use client";

import { useEffect, useState } from "react";
import type { SavedKeyword } from "@/app/api/keywords/list/route";
import type { PerformanceSnapshotResult } from "@/app/api/keywords/performance-snapshots/route";
import { RankingList } from "@/features/mobile/RankingList";
import { NavigationDrawer } from "@/features/mobile/NavigationDrawer";
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

  // Remembers this pick the same way DashboardShell.tsx does, so the next
  // visit to /mobile skips both pickers straight to this app.
  useEffect(() => {
    document.cookie = `lastAppId=${appId}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
    document.cookie = `lastWorkspaceId=${workspaceId}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
  }, [appId, workspaceId]);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/keywords/list?appId=${appId}`)
      .then((r) => r.json())
      .then(({ keywords: kws }: { keywords: SavedKeyword[] }) => {
        if (cancelled) return;
        setKeywords(kws ?? []);

        if (kws?.length && storeId && country) {
          const params = new URLSearchParams({
            terms: kws.map((k) => k.term).join(","),
            store,
            country,
            storeId,
          });
          fetch(`/api/keywords/performance-snapshots?${params}`)
            .then((r) => r.json())
            .then((data: PerformanceSnapshotResult) => {
              if (!cancelled) setSnapshots(data);
            });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [appId, store, storeId, country]);

  return (
    <main className="mx-auto max-w-md">
      <header className="flex items-center gap-3 border-b border-white/[0.06] px-4 py-4">
        <NavigationDrawer workspaceId={workspaceId} appId={appId} />
        {appIconUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={appIconUrl} alt="" className="size-9 rounded-lg" />
        ) : null}
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-sm font-medium text-gray-100">{appName}</h1>
          <p className="text-xs text-gray-600">
            {country ? `${countryFlag(country)} ${country} · ` : ""}Keyword rankings
          </p>
        </div>
      </header>

      {keywords === null ? (
        <p className="px-4 py-8 text-center text-sm text-gray-500">Loading…</p>
      ) : (
        <RankingList key={appId} keywords={keywords} snapshots={snapshots} />
      )}
    </main>
  );
}

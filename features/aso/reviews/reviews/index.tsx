"use client";

import { useEffect, useRef, useState } from "react";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { AppHeader } from "@/features/aso/AppHeader";
import { useActiveApp } from "@/features/dashboard/ActiveAppContext";
import { StatCards } from "./StatCards";
import { ReviewDistributionChart } from "./ReviewDistributionChart";
import { ReviewsTable } from "./ReviewsTable";
import { GrowthTable } from "./GrowthTable";
import type { ReviewsResult } from "./types";

function NoAppSelected() {
  return (
    <div className="h-full flex items-center justify-center bg-[#111318]">
      <div className="text-center">
        <MagnifyingGlassIcon className="size-10 text-gray-700 mx-auto mb-4" />
        <p className="text-sm font-medium text-gray-400">No apps yet</p>
        <p className="mt-1 text-sm text-gray-600">Use the search bar above to find an app.</p>
      </div>
    </div>
  );
}

const DAYS_OF_HISTORY = 90;

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export default function ReviewsDashboardPage() {
  const activeApp = useActiveApp();
  const [result, setResult] = useState<ReviewsResult | null>(null);
  const [loading, setLoading] = useState(false);

  const today = new Date();
  const defaultFrom = new Date(today);
  defaultFrom.setDate(today.getDate() - DAYS_OF_HISTORY);
  const [from, setFrom] = useState(isoDate(defaultFrom));
  const [to, setTo] = useState(isoDate(today));

  const loadedKey = useRef<string | undefined>(undefined);

  useEffect(() => {
    const appId = activeApp?.id;
    if (!appId) return;
    const key = `${appId}:${activeApp?.store}:${activeApp?.country}:${from}:${to}`;
    if (loadedKey.current === key) return;
    loadedKey.current = key;

    const t = setTimeout(() => {
      setLoading(true);
      const params = new URLSearchParams({
        appId,
        store: activeApp?.store ?? "ios",
        country: activeApp?.country ?? "us",
        storeId: activeApp?.store_id ?? "",
        bundleId: activeApp?.bundle_id ?? "",
        from,
        to,
      });
      fetch(`/api/reviews/list?${params}`)
        .then((r) => r.json())
        .then((data: ReviewsResult) => setResult(data))
        .catch(() => setResult(null))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(t);
  }, [activeApp?.id, activeApp?.store, activeApp?.country, activeApp?.store_id, activeApp?.bundle_id, from, to]);

  if (!activeApp) return <NoAppSelected />;

  return (
    <main className="h-full overflow-y-auto bg-[#111318]">
      <AppHeader app={activeApp} title="Reviews" />

      <div className="p-6 space-y-5">
        {loading && !result ? (
          <div className="flex h-40 items-center justify-center text-xs text-gray-500">Loading reviews…</div>
        ) : (
          <>
            <StatCards stats={result?.stats ?? { avgRating: null, avgRatingDeltaPct: null, totalNew: 0, totalNewDeltaPct: null, starDistribution: { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 } }} />

            <div className="rounded-xl bg-[#1a1d24] ring-1 ring-white/[0.07]">
              <ReviewDistributionChart
                series={result?.series ?? []}
                from={from}
                to={to}
                onFromChange={setFrom}
                onToChange={setTo}
              />
            </div>

            <ReviewsTable reviews={result?.reviews ?? []} />

            <GrowthTable rows={result?.growth ?? []} from={from} to={to} />
          </>
        )}
      </div>
    </main>
  );
}

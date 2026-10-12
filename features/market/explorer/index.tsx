"use client";

import { useEffect, useState } from "react";
import { InformationCircleIcon, ExclamationTriangleIcon, MagnifyingGlassCircleIcon } from "@heroicons/react/24/outline";
import { usePlanSlug } from "@/features/dashboard/PlanContext";
import { FeatureLocked } from "@/features/subscription/FeatureLocked";
import { isPlanAtLeast } from "@/features/subscription/planTiers";
import { ExplorerFilters } from "./ExplorerFilters";
import { ExplorerTable } from "./ExplorerTable";
import { DEFAULT_FILTERS, MAJOR_MARKET_COUNTRIES, OTHER_MARKET_COUNTRIES, type Filters, type ChartApp } from "./types";
import type { MarketExplorerResult } from "@/app/api/market/explorer/route";

export default function AppExplorerPage() {
  const planSlug = usePlanSlug();
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [apps, setApps] = useState<ChartApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Locked view below ignores loading/apps/error entirely, so skip the fetch outright.
    if (!isPlanAtLeast(planSlug, "pro")) return;
    setLoading(true);
    setError(null);

    const controller = new AbortController();

    // Apple's chart feed caps at 100 real results, Play's at 200 — both
    // fetched in full up front, so paging through the table is instant and
    // needs no further requests (see ExplorerTable's client-side pagination).
    function fetchOne(store: "ios" | "android", country: string): Promise<MarketExplorerResult & { error?: string }> {
      const params = new URLSearchParams({
        store,
        country,
        device: filters.device === "all" ? "iphone" : filters.device,
        chart: filters.chart,
        limit: store === "android" ? "200" : "100",
      });
      // Category ids are a different id space per store, so it's only sent
      // when a single store is selected (the UI disables the picker for "all").
      if (filters.category !== "all" && filters.store !== "all") params.set("category", filters.category);
      return fetch(`/api/market/explorer?${params}`, { signal: controller.signal }).then((r) => r.json());
    }

    const stores: ("ios" | "android")[] = filters.store === "all" ? ["ios", "android"] : [filters.store];
    // "major"/"other" are curated, bounded sets (see MAJOR_MARKET_COUNTRIES /
    // OTHER_MARKET_COUNTRIES) rather than a literal "every country" option.
    const countries =
      filters.country === "major" ? MAJOR_MARKET_COUNTRIES
      : filters.country === "other" ? OTHER_MARKET_COUNTRIES
      : [filters.country];

    // "All Stores"/"All Countries" have no single-request equivalent
    // server-side — fan out across every store × country combination in
    // parallel and merge. Only errors out if every request fails; a partial
    // result (some markets down) still renders what came back.
    Promise.all(stores.flatMap((store) => countries.map((country) => fetchOne(store, country))))
      .then((results) => {
        const lists = results.map((r) => r.apps ?? []);
        // Round-robin by rank position across every combo instead of
        // concatenating list-by-list — a plain concat would put every iOS
        // result (up to ~1000 rows across 10 countries) ahead of the first
        // Android row, burying Android several pages deep with no sort
        // applied. This keeps each list's internal rank order but interleaves
        // stores/countries so page one is a mix from the start.
        const maxLen = Math.max(0, ...lists.map((l) => l.length));
        // The same app routinely tops the charts in several countries at
        // once (e.g. ChatGPT #1 in both US and GB), so merging multiple
        // countries produces the same storeId more than once — dedupe here,
        // keeping the first (best-ranked, thanks to the round-robin above)
        // occurrence rather than showing it as a duplicate row. Estimates
        // are per country, so a duplicate's downloads/revenue are added onto
        // the kept row: those columns read as totals across the selected
        // markets.
        const seen = new Map<string, number>();
        const merged: ChartApp[] = [];
        for (let i = 0; i < maxLen; i++) {
          for (const list of lists) {
            const app = list[i];
            if (!app) continue;
            const key = `${app.store}:${app.storeId}`;
            const existing = seen.get(key);
            if (existing !== undefined) {
              const kept = merged[existing];
              if (app.estimate && kept.estimate) {
                const sum = (a: number | null, b: number | null) => (a === null && b === null ? null : (a ?? 0) + (b ?? 0));
                merged[existing] = {
                  ...kept,
                  estimate: {
                    downloads: sum(kept.estimate.downloads, app.estimate.downloads),
                    revenue: sum(kept.estimate.revenue, app.estimate.revenue),
                    downloadsBasis: "Total across the selected countries",
                    revenueBasis: "Total across the selected countries",
                  },
                };
              } else if (app.estimate) {
                merged[existing] = { ...kept, estimate: app.estimate };
              }
              continue;
            }
            seen.set(key, merged.length);
            merged.push(app);
          }
        }
        if (merged.length === 0 && results.every((r) => r.error)) {
          setError(results[0].error ?? "Couldn't load the chart data.");
          setApps([]);
          return;
        }
        setApps(merged);
      })
      .catch((e) => { if (e.name !== "AbortError") setError("Couldn't load the chart data."); })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [filters.store, filters.country, filters.device, filters.chart, filters.category, planSlug]);

  if (!isPlanAtLeast(planSlug, "pro")) {
    return (
      <div className="h-full flex flex-col overflow-hidden bg-[#111318] light:bg-[#f5f6f8]">
        <div className="flex items-center gap-2 px-6 pt-6">
          <h1 className="text-xl font-semibold text-white light:text-gray-900">App Explorer</h1>
        </div>
        <FeatureLocked
          minPlan="pro"
          icon={MagnifyingGlassCircleIcon}
          title="App Explorer is a Pro feature"
          description="Upgrade to Pro or above to browse live App Store and Google Play charts."
          benefits={[
            "Browse live Top Free, Paid, and Grossing charts for iOS and Android",
            "Spot newly trending and newly discovered apps in your category",
            "Track competitor apps straight from the charts into your workspace",
            "See estimated downloads and revenue for each app",
          ]}
        />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden bg-[#111318] light:bg-[#f5f6f8]">
      <div className="flex items-center gap-2 px-6 pt-6">
        <h1 className="text-xl font-semibold text-white light:text-gray-900">App Explorer</h1>
        <InformationCircleIcon className="size-4 text-gray-600 light:text-gray-400" title="Ranked from Apple's and Google's public top-charts feeds (capped at 100 and 200 apps respectively, neither store exposes more). Est. downloads and revenue are rough models from chart ranks and public rating counts, not reported figures." />
      </div>

      <div className="flex-1 overflow-y-auto">
        <ExplorerFilters filters={filters} onChange={(patch) => setFilters((prev) => ({ ...prev, ...patch }))} />

        {error ? (
          <div className="mx-6 mb-6 rounded-xl bg-[#1a1d24] light:bg-white flex flex-col items-center justify-center py-16 text-center">
            <ExclamationTriangleIcon className="size-8 text-amber-500 light:text-amber-700/70 mb-3" />
            <p className="text-sm font-medium text-gray-400 light:text-gray-600">{error}</p>
          </div>
        ) : (
          <ExplorerTable apps={apps} loading={loading} country={filters.country} />
        )}
      </div>
    </div>
  );
}

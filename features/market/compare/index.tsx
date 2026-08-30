"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { InformationCircleIcon, ScaleIcon } from "@heroicons/react/24/outline";
import { usePlanSlug } from "@/features/dashboard/PlanContext";
import { FeatureLocked } from "@/features/subscription/FeatureLocked";
import { isPlanAtLeast } from "@/features/subscription/planTiers";
import type { AppSearchResult } from "@/libs/contracts";
import type { MarketCompareResult } from "@/app/api/market/compare/route";
import { AiInsights } from "./AiInsights";
import { AppPicker } from "./AppPicker";
import { CompareTable } from "./CompareTable";
import { CountryDropdown } from "./CountryDropdown";
import { compareKey, MAX_COMPARE_APPS, type CompareApp } from "./types";

const DEFAULT_COUNTRY = "US";

export default function CompareAppsPage() {
  const planSlug = usePlanSlug();
  const [country, setCountry] = useState(DEFAULT_COUNTRY);
  const [apps, setApps] = useState<CompareApp[]>([]);

  // fetchStoreData never reads component state directly (identity comes
  // from its argument, updates go through the setApps functional form), so
  // it's a stable reference — safe to depend on from any effect below
  // without retriggering it.
  const fetchStoreData = useCallback((app: Pick<CompareApp, "store" | "storeId" | "bundleId">, forCountry: string) => {
    const key = compareKey(app.store, app.storeId);
    const params = new URLSearchParams({ store: app.store, storeId: app.storeId, bundleId: app.bundleId, country: forCountry });
    fetch(`/api/market/compare?${params}`)
      .then((r) => r.json())
      .then((data: MarketCompareResult) => {
        setApps((prev) => prev.map((a) =>
          compareKey(a.store, a.storeId) === key ? { ...a, storeData: data.storeData, loading: false, failed: !data.storeData } : a
        ));
      })
      .catch(() => {
        setApps((prev) => prev.map((a) => (compareKey(a.store, a.storeId) === key ? { ...a, loading: false, failed: true } : a)));
      });
  }, []);

  function addApp(result: AppSearchResult) {
    const key = compareKey(result.store, result.storeId);
    setApps((prev) => {
      if (prev.length >= MAX_COMPARE_APPS || prev.some((a) => compareKey(a.store, a.storeId) === key)) return prev;
      return [...prev, { ...result, storeData: null, loading: true, failed: false }];
    });
    fetchStoreData(result, country);
  }

  function removeApp(key: string) {
    setApps((prev) => prev.filter((a) => compareKey(a.store, a.storeId) !== key));
  }

  // Metadata (rating, screenshots, subtitle...) is storefront-specific, so
  // switching country re-fetches every added app instead of leaving stale
  // data from the previous market on screen. Reads the current list via a
  // ref (kept in sync below) rather than closing over `apps` directly, so
  // this effect only needs to depend on `country` itself.
  const appsRef = useRef<CompareApp[]>([]);
  useEffect(() => { appsRef.current = apps; }, [apps]);

  const skipNextCountryEffect = useRef(true);
  useEffect(() => {
    if (skipNextCountryEffect.current) { skipNextCountryEffect.current = false; return; }
    const current = appsRef.current;
    if (current.length === 0) return;
    setApps((prev) => prev.map((a) => ({ ...a, loading: true, failed: false })));
    current.forEach((a) => fetchStoreData(a, country));
  }, [country, fetchStoreData]);

  if (!isPlanAtLeast(planSlug, "pro")) {
    return (
      <div className="h-full flex flex-col overflow-hidden bg-[#111318]">
        <div className="flex items-center gap-2 px-6 pt-6">
          <h1 className="text-xl font-semibold text-white">Compare Apps</h1>
        </div>
        <FeatureLocked
          minPlan="pro"
          icon={ScaleIcon}
          title="Compare Apps is a Pro feature"
          description="Upgrade to Pro or above to compare any apps side by side across stores."
          benefits={[
            "Line up ratings, screenshots, and content details across up to 4 apps",
            "See who leads on rating, screenshot count, and freshness at a glance",
            "Works across App Store and Google Play, in any storefront country",
          ]}
        />
      </div>
    );
  }

  const addedKeys = new Set(apps.map((a) => compareKey(a.store, a.storeId)));
  const atLimit = apps.length >= MAX_COMPARE_APPS;

  return (
    <div className="h-full flex flex-col overflow-hidden bg-[#111318]">
      <div className="flex items-center gap-2 px-6 pt-6">
        <h1 className="text-xl font-semibold text-white">Compare Apps</h1>
        <InformationCircleIcon className="size-4 text-gray-600" title="Metadata is scraped live from each app's public store listing in the selected storefront country. No download or revenue figures: neither store discloses those for apps you don't own." />
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-wrap items-start gap-2 px-6 pt-4">
          <CountryDropdown country={country} defaultCountry={DEFAULT_COUNTRY} onChange={setCountry} />
        </div>

        <AppPicker country={country} addedKeys={addedKeys} atLimit={atLimit} onAdd={addApp} />

        {apps.length === 0 ? (
          <div className="mx-6 my-6 rounded-xl bg-[#1a1d24] ring-1 ring-white/[0.07] flex flex-col items-center justify-center py-16 text-center">
            <ScaleIcon className="size-8 text-gray-700 mb-3" />
            <p className="text-sm font-medium text-gray-400">Search for apps above to start comparing</p>
            <p className="text-xs text-gray-600 mt-1">Add at least 2 apps — up to {MAX_COMPARE_APPS} at a time</p>
          </div>
        ) : (
          <>
            {apps.length === 1 && (
              <p className="px-6 mt-4 text-xs text-gray-600">Add one more app to compare.</p>
            )}
            <div className="mt-4">
              <CompareTable apps={apps} country={country} onRemove={removeApp} />
            </div>
            {apps.length >= 2 && <AiInsights apps={apps} />}
          </>
        )}
      </div>
    </div>
  );
}

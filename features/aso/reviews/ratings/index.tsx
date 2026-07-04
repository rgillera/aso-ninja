"use client";

import { useEffect, useRef, useState } from "react";
import { MagnifyingGlassIcon, StarIcon } from "@heroicons/react/24/outline";
import { AppHeader } from "@/features/aso/AppHeader";
import { useActiveApp } from "@/features/dashboard/ActiveAppContext";
import { usePlanSlug } from "@/features/dashboard/PlanContext";
import { FeatureLocked } from "@/features/subscription/FeatureLocked";
import { isPlanAtLeast } from "@/features/subscription/planTiers";
import { CurrentRatingCard } from "./CurrentRatingCard";
import { CategoryRatingCard } from "./CategoryRatingCard";
import { AssessYourApp } from "./AssessYourApp";
import { RatingsGainedChart } from "./RatingsGainedChart";
import type { RatingsResult } from "./types";

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

export default function RatingsDashboardPage() {
  const activeApp = useActiveApp();
  const planSlug  = usePlanSlug();
  const isLocked  = !isPlanAtLeast(planSlug, "pro");
  const [result, setResult] = useState<RatingsResult | null>(null);
  const [loading, setLoading] = useState(false);

  const loadedKey = useRef<string | undefined>(undefined);

  useEffect(() => {
    const appId = activeApp?.id;
    if (!appId || isLocked) return;
    const key = `${appId}:${activeApp?.store}:${activeApp?.country}`;
    if (loadedKey.current === key) return;
    loadedKey.current = key;

    const t = setTimeout(() => {
      setLoading(true);
      const to = new Date();
      const from = new Date(to);
      from.setDate(to.getDate() - DAYS_OF_HISTORY);
      const params = new URLSearchParams({
        appId,
        store: activeApp?.store ?? "ios",
        country: activeApp?.country ?? "us",
        storeId: activeApp?.store_id ?? "",
        bundleId: activeApp?.bundle_id ?? "",
        from: from.toISOString().slice(0, 10),
        to: to.toISOString().slice(0, 10),
      });
      fetch(`/api/reviews/ratings?${params}`)
        .then((r) => r.json())
        .then((data: RatingsResult) => setResult(data))
        .catch(() => setResult(null))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(t);
  }, [activeApp?.id, activeApp?.store, activeApp?.country, activeApp?.store_id, activeApp?.bundle_id, isLocked]);

  if (!activeApp) return <NoAppSelected />;

  if (isLocked) {
    return (
      <main className="h-full overflow-y-auto bg-[#111318]">
        <AppHeader app={activeApp} title="Ratings" />
        <FeatureLocked
          minPlan="pro"
          icon={StarIcon}
          title="Ratings is a Pro feature"
          description="Upgrade to Pro or above to track your app's rating trends over time."
          benefits={[
            "See your rating trend and star breakdown over the last 90 days",
            "Compare your rating against your category's average",
            "Get AI suggestions to help lift a low rating",
          ]}
        />
      </main>
    );
  }

  return (
    <main className="h-full overflow-y-auto bg-[#111318]">
      <AppHeader app={activeApp} title="Ratings" />

      <div className="p-6 space-y-5">
        {loading && !result ? (
          <div className="flex h-40 items-center justify-center text-xs text-gray-500">Loading ratings…</div>
        ) : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <CurrentRatingCard
                store={activeApp.store}
                rating={result?.current.rating ?? null}
                ratingCount={result?.current.ratingCount ?? null}
                ratingHistogram={result?.current.ratingHistogram ?? null}
              />
              <CategoryRatingCard
                rating={result?.current.rating ?? null}
                category={result?.category ?? null}
              />
            </div>

            <AssessYourApp
              rating={result?.current.rating ?? null}
              ratingCount={result?.current.ratingCount ?? null}
            />

            <div className="rounded-xl bg-[#1a1d24] ring-1 ring-white/[0.07]">
              <RatingsGainedChart
                series={result?.series ?? []}
                hasStarBreakdown={!!result?.current.ratingHistogram}
              />
            </div>
          </>
        )}
      </div>
    </main>
  );
}

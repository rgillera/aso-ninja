"use client";

import { useEffect, useMemo, useState } from "react";
import { BanknotesIcon, InformationCircleIcon, MagnifyingGlassIcon, DevicePhoneMobileIcon } from "@heroicons/react/24/outline";
import { AppHeader } from "@/features/aso/AppHeader";
import { useActiveApp } from "@/features/dashboard/ActiveAppContext";
import { usePlanSlug } from "@/features/dashboard/PlanContext";
import { useWorkspaceId } from "@/features/dashboard/WorkspaceContext";
import { FeatureLocked } from "@/features/subscription/FeatureLocked";
import { isPlanAtLeast } from "@/features/subscription/planTiers";
import { BidSuggestionsTable } from "./BidSuggestionsTable";
import { suggestBid, type BidSuggestion } from "./types";
import type { SavedKeyword } from "@/app/api/keywords/list/route";

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

export default function BidSuggestionsPage() {
  const activeApp = useActiveApp();
  const planSlug = usePlanSlug();
  const workspaceId = useWorkspaceId();
  const locked = !isPlanAtLeast(planSlug, "pro");

  const [keywords, setKeywords] = useState<SavedKeyword[]>([]);
  const [loading, setLoading] = useState(false);

  // Reuses /api/keywords/list — the same tracked-keyword data Keyword
  // Research reads — rather than a new endpoint, since bid tiers are pure
  // client-side math over volume/rank/relevancy/opportunity already there.
  useEffect(() => {
    if (!activeApp || locked || activeApp.store !== "ios") return;

    const listUrl = activeApp.id
      ? `/api/keywords/list?appId=${activeApp.id}`
      : workspaceId && activeApp.bundle_id
        ? `/api/keywords/list?workspaceId=${workspaceId}&bundleId=${activeApp.bundle_id}&store=${activeApp.store}&country=${activeApp.country ?? "us"}`
        : null;

    if (!listUrl) return;

    setLoading(true);
    fetch(listUrl)
      .then((r) => r.json())
      .then(({ keywords: saved }: { keywords: SavedKeyword[] }) => setKeywords(saved ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [activeApp?.id, activeApp?.bundle_id, activeApp?.store, activeApp?.country, workspaceId, locked]);

  const suggestions: BidSuggestion[] = useMemo(
    () => keywords.map((k) => ({ term: k.term, keyword: k, ...suggestBid(k) })),
    [keywords]
  );

  if (!activeApp) return <NoAppSelected />;

  if (locked) {
    return (
      <div className="h-full flex flex-col overflow-hidden bg-[#111318]">
        <AppHeader app={activeApp} title="Bid Suggestions" />
        <FeatureLocked
          minPlan="pro"
          icon={BanknotesIcon}
          title="ASA Intelligence is a Pro feature"
          description="Upgrade to Pro or above to see suggested Apple Search Ads bid tiers for your tracked keywords."
          benefits={[
            "Prioritize which tracked keywords are worth bidding on",
            "Spot keywords you already own organically, so you don't overspend",
            "Built from the same volume, rank, and relevancy data as Keyword Research",
          ]}
        />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden bg-[#111318]">
      <AppHeader app={activeApp} title="Bid Suggestions" />
      <div className="flex items-center gap-1.5 px-6 pt-3 text-xs text-gray-500">
        <InformationCircleIcon className="size-3.5 text-gray-600 shrink-0" />
        Suggested tiers only, not live Apple Search Ads auction data.
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeApp.store !== "ios" ? (
          <div className="mx-6 my-6 rounded-xl bg-[#1a1d24] ring-1 ring-white/[0.07] flex flex-col items-center justify-center py-16 text-center">
            <DevicePhoneMobileIcon className="size-8 text-gray-700 mb-3" />
            <p className="text-sm font-medium text-gray-400">ASA Intelligence is only available for iOS apps</p>
            <p className="text-xs text-gray-600 mt-1">Apple Search Ads doesn&apos;t apply to Android listings.</p>
          </div>
        ) : loading ? (
          <div className="mx-6 my-6 rounded-xl bg-[#1a1d24] ring-1 ring-white/[0.07] flex items-center justify-center py-16">
            <p className="text-sm text-gray-500">Loading…</p>
          </div>
        ) : keywords.length === 0 ? (
          <div className="mx-6 my-6 rounded-xl bg-[#1a1d24] ring-1 ring-white/[0.07] flex flex-col items-center justify-center py-16 text-center">
            <BanknotesIcon className="size-8 text-gray-700 mb-3" />
            <p className="text-sm font-medium text-gray-400">No tracked keywords yet</p>
            <p className="text-xs text-gray-600 mt-1">
              <a href="/dashboard/keywords" className="text-indigo-400 hover:text-indigo-300 transition-colors">
                Track keywords in Keyword Research
              </a>{" "}
              to see ASA bid suggestions here.
            </p>
          </div>
        ) : (
          <div className="mt-4">
            <BidSuggestionsTable rows={suggestions} />
          </div>
        )}
      </div>
    </div>
  );
}

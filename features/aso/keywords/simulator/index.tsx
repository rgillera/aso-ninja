"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { MagnifyingGlassIcon, BeakerIcon } from "@heroicons/react/24/outline";
import { AppHeader } from "@/features/aso/AppHeader";
import { useActiveApp, useActiveAppResolving, ActiveAppLoading } from "@/features/dashboard/ActiveAppContext";
import { useWorkspaceId } from "@/features/dashboard/WorkspaceContext";
import { usePlanSlug } from "@/features/dashboard/PlanContext";
import { isPlanAtLeast } from "@/features/subscription/planTiers";
import { FeatureLocked } from "@/features/subscription/FeatureLocked";
import { MetadataSection } from "@/features/aso/metadata/preview/MetadataFieldCard";
import { SimulatedCoverageTable } from "./SimulatedCoverageTable";
import { keywordCoverage, COVERAGE_STRENGTH } from "./coverage";
import type { SavedKeyword, SimulatorRow } from "./types";

function NoAppSelected() {
  const resolving = useActiveAppResolving();
  if (resolving) return <ActiveAppLoading />;
  return (
    <div className="h-full flex items-center justify-center bg-[#0e0e10] light:bg-[#f7f7f8]">
      <div className="text-center">
        <MagnifyingGlassIcon className="size-10 text-gray-700 light:text-gray-300 mx-auto mb-4" />
        <p className="text-sm font-medium text-gray-400 light:text-gray-600">No apps yet</p>
        <p className="mt-1 text-sm text-gray-600 light:text-gray-400">Use the search bar above to find an app.</p>
      </div>
    </div>
  );
}

export default function KeywordSimulator() {
  const activeApp = useActiveApp();
  const workspaceId = useWorkspaceId();
  const planSlug = usePlanSlug();
  const isLocked = !isPlanAtLeast(planSlug, "pro_plus");

  const [storeSubtitle, setStoreSubtitle] = useState("");
  const [keywords, setKeywords] = useState<SavedKeyword[]>([]);
  const [loadingKeywords, setLoadingKeywords] = useState(true);

  const [hypotheticalTitle, setHypotheticalTitle] = useState("");
  const [hypotheticalSubtitle, setHypotheticalSubtitle] = useState("");

  // Keyed on bundle_id rather than the internal id: a previewed-but-not-yet-
  // followed app never gets an `id` from ActiveAppContext, so gating on it
  // would skip loading entirely for apps that aren't tracked yet — Keyword
  // Simulator should still render for those, just with an empty keyword table
  // (same "No tracked keywords yet" state a followed app with none shows).
  const loadedAppKey = useRef<string | undefined>(undefined);
  useEffect(() => {
    const key = activeApp?.id ?? activeApp?.bundle_id;
    if (!key || isLocked || loadedAppKey.current === key) return;
    loadedAppKey.current = key;

    setHypotheticalTitle(activeApp?.name ?? "");
    setHypotheticalSubtitle("");
    setStoreSubtitle("");
    setKeywords([]);
    setLoadingKeywords(true);

    const storeDataParams = new URLSearchParams({
      store: activeApp?.store ?? "ios",
      storeId: activeApp?.store_id ?? "",
      bundleId: activeApp?.bundle_id ?? "",
      country: activeApp?.country ?? "us",
    });
    fetch(`/api/apps/store-data?${storeDataParams}`)
      .then((r) => r.json())
      .then((data: { subtitle: string }) => {
        setStoreSubtitle(data.subtitle ?? "");
        setHypotheticalSubtitle(data.subtitle ?? "");
      })
      .catch(() => {});

    const kwParams = activeApp?.id
      ? new URLSearchParams({ appId: activeApp.id })
      : new URLSearchParams({
          workspaceId: workspaceId ?? "",
          bundleId: activeApp?.bundle_id ?? "",
          store: activeApp?.store ?? "ios",
          country: activeApp?.country ?? "us",
        });
    fetch(`/api/keywords/list?${kwParams}`)
      .then((r) => r.json())
      .then((data: { keywords: SavedKeyword[] }) => setKeywords(data.keywords ?? []))
      .finally(() => setLoadingKeywords(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeApp?.id, activeApp?.bundle_id, isLocked]);

  const originalTitle = activeApp?.name ?? "";
  const hasChanges = hypotheticalTitle !== originalTitle || hypotheticalSubtitle !== storeSubtitle;

  function handleClearAll() {
    setHypotheticalTitle(originalTitle);
    setHypotheticalSubtitle(storeSubtitle);
  }

  // Pure text matching against the current vs. edited fields, so it updates
  // live as the user types: no store search, no AI, no scoring pool.
  const rows: SimulatorRow[] = useMemo(() => keywords.map((k) => ({
    term: k.term,
    volume: k.volume,
    rank: k.rank,
    relevancy: k.relevancy,
    currentCoverage: keywordCoverage(k.term, originalTitle, storeSubtitle),
    simulatedCoverage: keywordCoverage(k.term, hypotheticalTitle, hypotheticalSubtitle),
  })), [keywords, originalTitle, storeSubtitle, hypotheticalTitle, hypotheticalSubtitle]);

  const summary = useMemo(() => {
    let stronger = 0, weaker = 0;
    for (const r of rows) {
      const delta = COVERAGE_STRENGTH[r.simulatedCoverage] - COVERAGE_STRENGTH[r.currentCoverage];
      if (delta > 0) stronger++;
      else if (delta < 0) weaker++;
    }
    return { stronger, weaker };
  }, [rows]);

  if (isLocked) {
    return (
      <div className="h-full flex flex-col overflow-hidden bg-[#0e0e10] light:bg-[#f7f7f8]">
        <AppHeader app={activeApp ?? null} title="Keyword Simulator" />
        <FeatureLocked
          minPlan="pro_plus"
          icon={BeakerIcon}
          title="Keyword Simulator is a Pro+ feature"
          description="Upgrade to Pro+ or above to preview which of your tracked keywords a title or subtitle change would add to or drop from your listing, before you publish it."
          benefits={[
            "Try a new title & subtitle against your already-tracked keywords",
            "See which keywords you'd gain or lose, next to their volume, rank and relevancy",
          ]}
        />
      </div>
    );
  }

  if (!activeApp) {
    return <NoAppSelected />;
  }

  const subtitleLabel = activeApp.store === "android" ? "Short Description" : "Subtitle";
  const limits = activeApp.store === "android"
    ? { title: 30, subtitle: 80 }
    : { title: 30, subtitle: 30 };

  return (
    <div className="h-full flex flex-col overflow-hidden bg-[#0e0e10] light:bg-[#f7f7f8]">
      <AppHeader app={activeApp} title="Keyword Simulator" />

      <div className="flex flex-1 flex-col overflow-y-auto lg:flex-row lg:overflow-hidden">
        {/* Left: hypothetical title/subtitle */}
        <div className="flex flex-col lg:w-[380px] lg:shrink-0 lg:overflow-y-auto lg:border-r lg:border-white/[0.07] light:border-black/[0.08]">
          <div className="shrink-0 flex items-center justify-between px-6 py-3.5 border-b border-white/[0.07] light:border-black/[0.08] bg-[#0e0e10] light:bg-[#f7f7f8]">
            <p className="text-sm font-medium text-white light:text-gray-900">Try a new title &amp; subtitle</p>
            <button onClick={handleClearAll} className="text-xs text-gray-500 hover:text-gray-300 light:hover:text-gray-700 transition-colors">Clear all</button>
          </div>
          <div className="flex-1 p-6 space-y-4 bg-[#0e0e10] light:bg-[#f7f7f8]">
            <MetadataSection
              title="App Name"
              value={hypotheticalTitle}
              limit={limits.title}
              placeholder="Enter app name…"
              originalValue={originalTitle}
              onChange={setHypotheticalTitle}
            />
            <MetadataSection
              title={activeApp.store === "android" ? subtitleLabel : "App Subtitle"}
              value={hypotheticalSubtitle}
              limit={limits.subtitle}
              placeholder={activeApp.store === "android" ? "Enter short description…" : "Enter subtitle…"}
              rows={activeApp.store === "android" ? 3 : 2}
              originalValue={storeSubtitle}
              onChange={setHypotheticalSubtitle}
            />
            <p className="text-xs text-gray-600 light:text-gray-400">
              Edit the title or {subtitleLabel.toLowerCase()} to see which tracked keywords you&rsquo;d gain or lose. The store ranks you on the words in these fields, and the title counts most. Nothing here is saved or published.
            </p>
          </div>
        </div>

        {/* Right: comparison table */}
        <div className="flex flex-col flex-1 lg:overflow-y-auto">
          {hasChanges && (summary.stronger > 0 || summary.weaker > 0) && (
            <div className="flex items-center gap-4 px-6 pt-6 text-sm">
              {summary.stronger > 0 && <span className="text-green-400 light:text-green-600">{summary.stronger} keyword{summary.stronger !== 1 ? "s" : ""} stronger</span>}
              {summary.weaker > 0 && <span className="text-red-400 light:text-red-600">{summary.weaker} keyword{summary.weaker !== 1 ? "s" : ""} weaker</span>}
            </div>
          )}
          <div className="p-6">
            <div className="rounded-2xl bg-[#141417] light:bg-white overflow-hidden ring-1 ring-white/[0.06] light:ring-gray-950/[0.07] light:shadow-sm">
              {loadingKeywords
                ? <p className="px-5 py-8 text-center text-sm text-gray-600 light:text-gray-400">Loading tracked keywords…</p>
                : <SimulatedCoverageTable rows={rows} subtitleLabel={subtitleLabel} />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

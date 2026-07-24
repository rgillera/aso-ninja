"use client";

import { useState, useEffect, useMemo } from "react";
import { DevicePhoneMobileIcon, ExclamationTriangleIcon, XMarkIcon } from "@heroicons/react/24/outline";
import type { App, StoreData } from "@/libs/contracts";
import { COUNTRY_MAP, countryFlag } from "@/libs/countries";
import { FollowButton, StoreLinkButton } from "@/features/aso/AppHeader";
import { MetadataSection } from "@/features/aso/metadata/preview/MetadataFieldCard";
import { SimulatedRelevancyTable } from "./SimulatedRelevancyTable";
import type { SavedKeyword, SimulatedResult, SimulatorRow } from "./types";

// Matches MAX_TERMS in app/api/keywords/simulate/route.ts.
const MAX_TERMS = 50;

type Props = { app: App; storeData: StoreData };

export default function KeywordSimulator({ app, storeData }: Props) {
  const [keywords, setKeywords] = useState<SavedKeyword[]>([]);
  const [loadingKeywords, setLoadingKeywords] = useState(true);

  const originalTitle = app.name;
  const originalSubtitle = storeData?.subtitle ?? "";
  const [hypotheticalTitle, setHypotheticalTitle] = useState(originalTitle);
  const [hypotheticalSubtitle, setHypotheticalSubtitle] = useState(originalSubtitle);

  const [simulating, setSimulating] = useState(false);
  const [simulatedResults, setSimulatedResults] = useState<Record<string, SimulatedResult> | null>(null);
  const [relevancyLimitReached, setRelevancyLimitReached] = useState(false);
  const [aiDown, setAiDown] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/keywords/list?appId=${app.id}`)
      .then((r) => r.json())
      .then((data: { keywords: SavedKeyword[] }) => setKeywords(data.keywords ?? []))
      .finally(() => setLoadingKeywords(false));
  }, [app.id]);

  const hasChanges = hypotheticalTitle !== originalTitle || hypotheticalSubtitle !== originalSubtitle;

  function handleClearAll() {
    setHypotheticalTitle(originalTitle);
    setHypotheticalSubtitle(originalSubtitle);
    setSimulatedResults(null);
    setRelevancyLimitReached(false);
    setAiDown(false);
    setError(null);
  }

  async function handleSimulate() {
    if (!hasChanges || simulating) return;
    setSimulating(true);
    setError(null);
    setRelevancyLimitReached(false);
    setAiDown(false);
    try {
      // Already-tracked keywords only, capped and prioritized by current
      // opportunity so a "Simulate" click stays a few seconds, not minutes —
      // Gemini calls are serialized server-side (~0.5-2s each).
      const terms = [...keywords]
        .sort((a, b) => (b.opportunity ?? 0) - (a.opportunity ?? 0))
        .slice(0, MAX_TERMS)
        .map((k) => k.term);

      const res = await fetch("/api/keywords/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appId: app.id,
          workspaceId: app.workspace_id,
          appName: app.name,
          store: app.store,
          country: app.country ?? "us",
          hypotheticalTitle,
          hypotheticalSubtitle,
          terms,
        }),
      });
      const data: {
        results?: Record<string, SimulatedResult>;
        _relevancyLimitReached?: boolean;
        _aiDown?: boolean;
        error?: string;
      } = await res.json();
      if (data.error) { setError(data.error); return; }
      if (data._relevancyLimitReached) setRelevancyLimitReached(true);
      if (data._aiDown) setAiDown(true);
      setSimulatedResults(data.results ?? {});
    } catch {
      setError("Something went wrong running the simulation. Try again.");
    } finally {
      setSimulating(false);
    }
  }

  const rows: SimulatorRow[] = useMemo(() => keywords.map((k) => ({
    term: k.term,
    currentRelevancy: k.relevancy,
    currentOpportunity: k.opportunity,
    simulatedRelevancy: simulatedResults?.[k.term]?.relevancy ?? null,
    simulatedOpportunity: simulatedResults?.[k.term]?.opportunity ?? null,
  })), [keywords, simulatedResults]);

  const limits = app.store === "android"
    ? { title: 30, subtitle: 80 }
    : { title: 30, subtitle: 30 };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Page header */}
      <div className="shrink-0 border-b border-white/[0.07] bg-[#111318] px-6 py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            {app.icon_url ? (
              <img src={app.icon_url} alt={app.name} className="size-8 rounded-xl object-cover shrink-0" />
            ) : (
              <div className="size-8 rounded-xl bg-[#0d0f14] shrink-0 flex items-center justify-center">
                <DevicePhoneMobileIcon className="size-4 text-gray-500" />
              </div>
            )}
            <div>
              <p className="text-sm font-semibold text-white leading-tight">{app.name}</p>
              <p className="text-xs text-gray-500 leading-tight">
                {app.store === "ios" ? "App Store" : "Google Play"}
                {app.country && <span className="ml-1.5">&middot; {countryFlag(app.country)} {app.country.toUpperCase()}</span>}
              </p>
            </div>
            <FollowButton app={app} />
            <StoreLinkButton app={app} />
          </div>
          {app.country && (
            <span className="flex items-center gap-1.5 rounded-lg bg-[#1a1d24] ring-1 ring-white/[0.08] px-3 py-3.5 text-xs text-gray-300">
              {countryFlag(app.country)} {COUNTRY_MAP[app.country] ?? app.country}
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col overflow-y-auto lg:flex-row lg:overflow-hidden">
        {/* Left: hypothetical title/subtitle */}
        <div className="flex flex-col lg:w-[380px] lg:shrink-0 lg:overflow-y-auto lg:border-r lg:border-white/[0.07]">
          <div className="shrink-0 flex items-center justify-between px-6 py-3.5 border-b border-white/[0.07] bg-[#111318]">
            <p className="text-sm font-medium text-white">Try a new title &amp; subtitle</p>
            <button onClick={handleClearAll} className="text-xs text-gray-500 hover:text-gray-300 transition-colors">Clear all</button>
          </div>
          <div className="flex-1 p-6 space-y-4 bg-[#111318]">
            <MetadataSection
              title="App Name"
              value={hypotheticalTitle}
              limit={limits.title}
              placeholder="Enter app name…"
              dark
              originalValue={originalTitle}
              onChange={setHypotheticalTitle}
            />
            <MetadataSection
              title={app.store === "android" ? "Short Description" : "App Subtitle"}
              value={hypotheticalSubtitle}
              limit={limits.subtitle}
              placeholder={app.store === "android" ? "Enter short description…" : "Enter subtitle…"}
              dark
              rows={app.store === "android" ? 3 : 2}
              originalValue={originalSubtitle}
              onChange={setHypotheticalSubtitle}
            />
            <button
              onClick={handleSimulate}
              disabled={!hasChanges || simulating || loadingKeywords || keywords.length === 0}
              className="w-full rounded-xl bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {simulating ? "Simulating…" : "Simulate"}
            </button>
            {!hasChanges && (
              <p className="text-xs text-gray-600">
                Edit the title or subtitle above, then click Simulate to see how your tracked keywords&rsquo; relevancy would change. Nothing here is saved or published.
              </p>
            )}
          </div>
        </div>

        {/* Right: comparison table */}
        <div className="flex flex-col flex-1 lg:overflow-y-auto">
          {relevancyLimitReached && (
            <div className="flex items-center gap-2 px-4 py-2.5 bg-indigo-500/10 border-b border-indigo-500/20 text-indigo-300 text-xs">
              <ExclamationTriangleIcon className="size-4 shrink-0" />
              <span className="flex-1">Your plan&apos;s relevancy &amp; opportunity scoring pool is used up. Upgrade for a bigger pool.</span>
              <button onClick={() => setRelevancyLimitReached(false)} className="shrink-0 hover:text-indigo-200">
                <XMarkIcon className="size-4" />
              </button>
            </div>
          )}
          {aiDown && (
            <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-500/10 border-b border-amber-500/20 text-amber-300 text-xs">
              <ExclamationTriangleIcon className="size-4 shrink-0" />
              <span className="flex-1">Scoring is temporarily unavailable. Try again shortly.</span>
              <button onClick={() => setAiDown(false)} className="shrink-0 hover:text-amber-200">
                <XMarkIcon className="size-4" />
              </button>
            </div>
          )}
          {error && (
            <div className="flex items-center gap-2 px-4 py-2.5 bg-red-500/10 border-b border-red-500/20 text-red-400 text-xs">
              <ExclamationTriangleIcon className="size-4 shrink-0" />
              <span className="flex-1">{error}</span>
              <button onClick={() => setError(null)} className="shrink-0 hover:text-red-300">
                <XMarkIcon className="size-4" />
              </button>
            </div>
          )}
          <div className="p-6">
            <div className="rounded-2xl bg-[#1a1d24] ring-1 ring-white/[0.08] overflow-hidden shadow-lg shadow-black/20">
              <SimulatedRelevancyTable rows={rows} hasSimulated={simulatedResults !== null} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

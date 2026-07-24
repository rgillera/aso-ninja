"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { MagnifyingGlassIcon, ExclamationTriangleIcon, XMarkIcon, BeakerIcon } from "@heroicons/react/24/outline";
import { AppHeader } from "@/features/aso/AppHeader";
import { useActiveApp } from "@/features/dashboard/ActiveAppContext";
import { useWorkspaceId } from "@/features/dashboard/WorkspaceContext";
import { usePlanSlug } from "@/features/dashboard/PlanContext";
import { isPlanAtLeast } from "@/features/subscription/planTiers";
import { FeatureLocked } from "@/features/subscription/FeatureLocked";
import { MetadataSection } from "@/features/aso/metadata/preview/MetadataFieldCard";
import { SimulatedRelevancyTable } from "./SimulatedRelevancyTable";
import type { SavedKeyword, SimulatedResult, SimulatorRow } from "./types";

// Matches MAX_TERMS in app/api/keywords/simulate/route.ts.
const MAX_TERMS = 50;

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

  const [simulating, setSimulating] = useState(false);
  const [simulatedResults, setSimulatedResults] = useState<Record<string, SimulatedResult> | null>(null);
  const [relevancyLimitReached, setRelevancyLimitReached] = useState(false);
  const [aiDown, setAiDown] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    setSimulatedResults(null);
    setRelevancyLimitReached(false);
    setAiDown(false);
    setError(null);
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
    setSimulatedResults(null);
    setRelevancyLimitReached(false);
    setAiDown(false);
    setError(null);
  }

  async function handleSimulate() {
    if (!hasChanges || simulating || !activeApp?.id) return;
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
          appId: activeApp.id,
          workspaceId,
          appName: activeApp.name,
          store: activeApp.store,
          country: activeApp.country ?? "us",
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

  if (!activeApp) {
    return <NoAppSelected />;
  }

  if (isLocked) {
    return (
      <div className="h-full flex flex-col overflow-hidden bg-[#111318]">
        <AppHeader app={activeApp} title="Keyword Simulator" />
        <FeatureLocked
          minPlan="pro_plus"
          icon={BeakerIcon}
          title="Keyword Simulator is a Pro+ feature"
          description="Upgrade to Pro+ or above to preview how a title/subtitle change would move your tracked keywords' relevancy before you publish it."
          benefits={[
            "Try a new title & subtitle against your already-tracked keywords",
            "See predicted relevancy and opportunity deltas before publishing",
          ]}
        />
      </div>
    );
  }

  const limits = activeApp.store === "android"
    ? { title: 30, subtitle: 80 }
    : { title: 30, subtitle: 30 };

  return (
    <div className="h-full flex flex-col overflow-hidden bg-[#111318]">
      <AppHeader app={activeApp} title="Keyword Simulator" />

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
              title={activeApp.store === "android" ? "Short Description" : "App Subtitle"}
              value={hypotheticalSubtitle}
              limit={limits.subtitle}
              placeholder={activeApp.store === "android" ? "Enter short description…" : "Enter subtitle…"}
              dark
              rows={activeApp.store === "android" ? 3 : 2}
              originalValue={storeSubtitle}
              onChange={setHypotheticalSubtitle}
            />
            <button
              onClick={handleSimulate}
              disabled={!hasChanges || simulating || loadingKeywords || keywords.length === 0 || !activeApp.id}
              className="w-full rounded-xl bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {simulating ? "Simulating…" : "Simulate"}
            </button>
            {!activeApp.id ? (
              <p className="text-xs text-gray-600">
                Follow this app and track some keywords in Keyword Research to run a simulation.
              </p>
            ) : !hasChanges ? (
              <p className="text-xs text-gray-600">
                Edit the title or subtitle above, then click Simulate to see how your tracked keywords&rsquo; relevancy would change. Nothing here is saved or published.
              </p>
            ) : null}
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

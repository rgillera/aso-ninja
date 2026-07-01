"use client";

import { useState, useEffect, useRef } from "react";
import { AdjustmentsHorizontalIcon } from "@heroicons/react/24/outline";
import { AppHeader } from "@/features/aso/AppHeader";
import { useActiveApp } from "@/features/dashboard/ActiveAppContext";
import { useWorkspaceId } from "@/features/dashboard/WorkspaceContext";
import { LiveSearchPanel } from "@/features/aso/keywords/research/LiveSearchPanel";
import { fetchLiveSearchResults } from "@/features/aso/keywords/research/liveSearch";
import { CombinationTable } from "./CombinationTable";
import type { CombinationGroup } from "./types";
import type { CombinationsResult } from "@/app/api/keywords/combinations/route";
import type { SavedKeyword } from "@/app/api/keywords/list/route";

function NoAppSelected() {
  return (
    <div className="h-full flex items-center justify-center bg-[#111318]">
      <div className="text-center">
        <AdjustmentsHorizontalIcon className="size-10 text-gray-700 mx-auto mb-4" />
        <p className="text-sm font-medium text-gray-400">No apps yet</p>
        <p className="mt-1 text-sm text-gray-600">Use the search bar above to find an app.</p>
      </div>
    </div>
  );
}

export default function KeywordCombinationPage() {
  const activeApp   = useActiveApp();
  const workspaceId = useWorkspaceId();
  const [groups,          setGroups]          = useState<CombinationGroup[]>([]);
  const [trackedKeywords, setTrackedKeywords] = useState<Set<string>>(new Set());
  const [pendingTerms,    setPendingTerms]    = useState<Set<string>>(new Set());
  const [researchTerms,   setResearchTerms]   = useState<string[]>([]);
  const [liveSearchTerm,  setLiveSearchTerm]  = useState<string | null>(null);
  const [appSubtitle,     setAppSubtitle]     = useState<string>("");

  const appId = activeApp?.id ?? activeApp?.store_id;

  // Load/save combination groups per app in localStorage (no DB table for this feature yet)
  useEffect(() => {
    if (!appId) return;
    try {
      const raw = localStorage.getItem(`combinations-${appId}`);
      setGroups(raw ? (JSON.parse(raw) as CombinationGroup[]) : []);
    } catch {
      setGroups([]);
    }
  }, [appId]);

  function persist(updated: CombinationGroup[]) {
    setGroups(updated);
    if (appId) {
      try { localStorage.setItem(`combinations-${appId}`, JSON.stringify(updated)); } catch {}
    }
  }

  // Fetch app subtitle/short-description for AI context
  const loadedSubtitleFor = useRef<string | undefined>(undefined);
  useEffect(() => {
    const storeId = activeApp?.store_id;
    const store   = activeApp?.store;
    if (!storeId || !store || loadedSubtitleFor.current === storeId) return;
    loadedSubtitleFor.current = storeId;
    const country = activeApp?.country ?? "us";
    fetch(`/api/keywords/app-metadata?storeId=${storeId}&store=${store}&country=${country}`)
      .then((r) => r.json())
      .then((d) => setAppSubtitle(d?.subtitle ?? ""))
      .catch(() => {});
  }, [activeApp?.store_id, activeApp?.store, activeApp?.country]);

  // Load keywords already tracked in Keyword Research for this app — used both to
  // mark "already tracked" rows and to offer them as one-click combination seeds
  const loadedAppId = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!activeApp?.id || loadedAppId.current === activeApp.id) return;
    loadedAppId.current = activeApp.id;
    fetch(`/api/keywords/list?appId=${activeApp.id}`)
      .then((r) => r.json())
      .then(({ keywords: saved }: { keywords: SavedKeyword[] }) => {
        setTrackedKeywords(new Set((saved ?? []).map((s) => s.term.toLowerCase())));
        setResearchTerms((saved ?? []).map((s) => s.term));
      })
      .catch(() => {});
  }, [activeApp?.id]);

  async function handleAddSeeds(seeds: string[]) {
    const existing = new Set(groups.map((g) => g.seed.toLowerCase()));
    const fresh = [...new Set(seeds.map((s) => s.toLowerCase().trim()).filter(Boolean))]
      .filter((s) => !existing.has(s));
    if (!fresh.length) return;

    const placeholders: CombinationGroup[] = fresh.map((seed) => ({
      seed, expanded: true, loading: true, children: [],
    }));
    const next = [...placeholders, ...groups];
    persist(next);

    const country = activeApp?.country ?? "us";
    try {
      const params = new URLSearchParams({
        seeds: fresh.join(","),
        country,
        appName: activeApp?.name ?? "",
        appSubtitle,
      });
      const res  = await fetch(`/api/keywords/combinations?${params}`);
      const data: CombinationsResult = await res.json();

      setGroups((prev) => {
        const updated = prev.map((g) => {
          const match = data.groups.find((d) => d.seed === g.seed);
          if (!match || !fresh.includes(g.seed)) return g;
          return {
            ...g,
            loading: false,
            children: match.children.map((c) => ({
              term: c.term, volume: c.volume, results: c.results,
              starred: false, tracked: false,
            })),
          };
        });
        if (appId) { try { localStorage.setItem(`combinations-${appId}`, JSON.stringify(updated)); } catch {} }
        return updated;
      });
    } catch {
      setGroups((prev) => {
        const updated = prev.map((g) => fresh.includes(g.seed) ? { ...g, loading: false } : g);
        if (appId) { try { localStorage.setItem(`combinations-${appId}`, JSON.stringify(updated)); } catch {} }
        return updated;
      });
    }
  }

  function handleToggleExpand(seed: string) {
    persist(groups.map((g) => g.seed === seed ? { ...g, expanded: !g.expanded } : g));
  }

  function handleToggleStar(seed: string, term: string) {
    persist(groups.map((g) => g.seed !== seed ? g : {
      ...g,
      children: g.children.map((c) => c.term === term ? { ...c, starred: !c.starred } : c),
    }));
  }

  function handleRemoveGroup(seed: string) {
    persist(groups.filter((g) => g.seed !== seed));
  }

  function handleDeleteTerms(terms: string[]) {
    const termSet = new Set(terms.map((t) => t.toLowerCase()));
    persist(
      groups
        .map((g) => ({ ...g, children: g.children.filter((c) => !termSet.has(c.term.toLowerCase())) }))
        .filter((g) => g.children.length > 0)
    );
  }

  async function addTermsToTracked(terms: string[]) {
    // Filter out already tracked AND currently in-flight terms to prevent duplicates
    const fresh = terms.filter((t) => {
      const lower = t.toLowerCase();
      return !trackedKeywords.has(lower) && !pendingTerms.has(lower);
    });
    if (!fresh.length) return;

    const freshLower = fresh.map((t) => t.toLowerCase());

    // Mark as pending immediately — blocks duplicate clicks and bulk re-adds
    setPendingTerms((prev) => new Set([...prev, ...freshLower]));

    const store   = activeApp?.store ?? "ios";
    const country = activeApp?.country ?? "us";

    const baseParams = {
      terms:   fresh.join(","),
      store,
      country,
      appName: activeApp?.name ?? "",
      ...(activeApp?.id ? { appId: activeApp.id } : {}),
    };

    async function saveKeywords(metrics: Record<string, unknown>) {
      if (!workspaceId) return;
      await fetch("/api/keywords/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          terms: fresh,
          workspaceId,
          metrics,
          appId:    activeApp?.id,
          bundleId: activeApp?.bundle_id,
          storeId:  activeApp?.store_id,
          appName:  activeApp?.name,
          iconUrl:  activeApp?.icon_url ?? undefined,
          store,
          country,
        }),
      });
    }

    try {
      // Phase 1: fast metrics (no LLM) — save immediately so keywords appear in
      // Keyword Research right away without waiting for relevancy/opportunity
      const res  = await fetch(`/api/keywords/metrics?${new URLSearchParams({ ...baseParams, fast: "1" })}`);
      const data = await res.json();
      await saveKeywords(data);

      // Move from pending → tracked once saved
      setTrackedKeywords((prev) => new Set([...prev, ...freshLower]));
      setPendingTerms((prev) => { const next = new Set(prev); freshLower.forEach((t) => next.delete(t)); return next; });

      // Phase 2: full metrics (LLM relevancy + opportunity) — re-save to update
      try {
        const res2  = await fetch(`/api/keywords/metrics?${new URLSearchParams(baseParams)}`);
        const data2 = await res2.json();
        await saveKeywords(data2);
      } catch {}

      // Android needs a separate live search to write keyword_rankings_history —
      // iOS already does this inside the metrics fetch
      if (store === "android") {
        for (const term of fresh) {
          try { await fetchLiveSearchResults(term, store, country); } catch {}
        }
      }
    } catch {
      // Phase 1 failed — clear pending so user can retry
      setPendingTerms((prev) => { const next = new Set(prev); freshLower.forEach((t) => next.delete(t)); return next; });
    }
  }

  if (!activeApp) {
    return <NoAppSelected />;
  }

  return (
    <div className="h-full flex flex-col overflow-hidden bg-[#111318]">
      <AppHeader app={activeApp ?? null} title="Keyword Combination" />

      <div className="flex-1 overflow-y-auto pt-4">
        <CombinationTable
          groups={groups}
          trackedSet={trackedKeywords}
          pendingSet={pendingTerms}
          availableSeeds={researchTerms.filter(
            (t) => !groups.some((g) => g.seed === t.toLowerCase())
          )}
          onAddSeeds={handleAddSeeds}
          onToggleExpand={handleToggleExpand}
          onToggleStar={handleToggleStar}
          onAddTerm={(term) => addTermsToTracked([term])}
          onAddTerms={addTermsToTracked}
          onDeleteTerms={handleDeleteTerms}
          onRemoveGroup={handleRemoveGroup}
          onLiveSearch={(term) => setLiveSearchTerm(term)}
        />
      </div>

      {liveSearchTerm && (
        <LiveSearchPanel
          keyword={liveSearchTerm}
          store={activeApp.store ?? "ios"}
          country={activeApp.country ?? "us"}
          onClose={() => setLiveSearchTerm(null)}
        />
      )}
    </div>
  );
}

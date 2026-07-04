"use client";

import { useState, useEffect, useRef } from "react";
import { AdjustmentsHorizontalIcon, ExclamationTriangleIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { AppHeader } from "@/features/aso/AppHeader";
import { useActiveApp } from "@/features/dashboard/ActiveAppContext";
import { useWorkspaceId } from "@/features/dashboard/WorkspaceContext";
import { useNavigationGuard } from "@/features/dashboard/NavigationGuardContext";
import { usePlanSlug } from "@/features/dashboard/PlanContext";
import { LiveSearchPanel } from "@/features/aso/keywords/research/LiveSearchPanel";
import { fetchLiveSearchResults } from "@/features/aso/keywords/research/liveSearch";
import { PlanLimitMessage } from "@/features/subscription/PlanLimitMessage";
import { FeatureLocked } from "@/features/subscription/FeatureLocked";
import { isPlanAtLeast } from "@/features/subscription/planTiers";
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
  const planSlug    = usePlanSlug();
  const isLocked    = !isPlanAtLeast(planSlug, "pro_plus");
  const [groups,          setGroups]          = useState<CombinationGroup[]>([]);
  const [trackedKeywords, setTrackedKeywords] = useState<Set<string>>(new Set());
  const [pendingTerms,    setPendingTerms]    = useState<Set<string>>(new Set());
  const { setGuardMessage } = useNavigationGuard();
  useEffect(() => {
    setGuardMessage(pendingTerms.size > 0 ? "A keyword is still being saved. Leaving now may lose it." : null);
    return () => setGuardMessage(null);
  }, [pendingTerms, setGuardMessage]);
  const [researchTerms,   setResearchTerms]   = useState<string[]>([]);
  const [liveSearchTerm,  setLiveSearchTerm]  = useState<string | null>(null);
  const [appSubtitle,     setAppSubtitle]     = useState<string>("");
  const [saveError,       setSaveError]       = useState<string | null>(null);

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
    if (!storeId || !store || isLocked || loadedSubtitleFor.current === storeId) return;
    loadedSubtitleFor.current = storeId;
    const country = activeApp?.country ?? "us";
    fetch(`/api/keywords/app-metadata?storeId=${storeId}&store=${store}&country=${country}`)
      .then((r) => r.json())
      .then((d) => setAppSubtitle(d?.subtitle ?? ""))
      .catch(() => {});
  }, [activeApp?.store_id, activeApp?.store, activeApp?.country, isLocked]);

  // Load tracked keywords from DB. Also re-fetches on window focus so that
  // keywords added from other pages (research, performance) are reflected without
  // requiring a full page reload.
  // Falls back to workspaceId+bundleId lookup when activeApp.id is undefined
  // (e.g. app shown via savedPreview cookie rather than a formal tracked-app route).
  useEffect(() => {
    if (!activeApp || isLocked) return;

    const listUrl = activeApp.id
      ? `/api/keywords/list?appId=${activeApp.id}`
      : workspaceId && activeApp.bundle_id
        ? `/api/keywords/list?workspaceId=${workspaceId}&bundleId=${activeApp.bundle_id}&store=${activeApp.store}&country=${activeApp.country ?? "us"}`
        : null;

    if (!listUrl) return;

    function refreshTracked() {
      fetch(listUrl!)
        .then((r) => r.json())
        .then(({ keywords: saved }: { keywords: SavedKeyword[] }) => {
          setTrackedKeywords(new Set((saved ?? []).map((s) => s.term.toLowerCase())));
          setResearchTerms((saved ?? []).map((s) => s.term));
        })
        .catch(() => {});
    }

    refreshTracked();
    window.addEventListener("focus", refreshTracked);
    return () => window.removeEventListener("focus", refreshTracked);
  }, [activeApp?.id, activeApp?.bundle_id, workspaceId, isLocked]);

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
              difficulty: c.difficulty, chance: c.chance,
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


  function handleRemoveGroup(seed: string) {
    persist(groups.filter((g) => g.seed !== seed));
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

    async function saveKeywords(metrics: Record<string, unknown>): Promise<{ ok: boolean; error?: string }> {
      if (!workspaceId) return { ok: true };
      try {
        const res = await fetch("/api/keywords/save", {
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
        if (!res.ok) {
          const body: { error?: string } = await res.json().catch(() => ({}));
          return { ok: false, error: body.error ?? "Couldn't save this keyword." };
        }
        return { ok: true };
      } catch {
        return { ok: true };
      }
    }

    // Save immediately with empty metrics so the keyword is persisted even if
    // the user navigates away before Phase 1 metrics fetch completes.
    // Await it (don't fire-and-forget) so we confirm it's in the DB before
    // updating local tracked state — prevents phantom "tracked" entries that
    // disappear after a reload because the save actually failed silently.
    //
    // Only this first call is checked: it's the one that creates the apps
    // row (if this app isn't tracked yet), so a rejection here (e.g. the
    // workspace's plan app limit) will reject identically on every later
    // call too — there's nothing to gain from re-attempting.
    const firstSave = await saveKeywords({});
    if (!firstSave.ok) {
      setPendingTerms((prev) => { const next = new Set(prev); freshLower.forEach((t) => next.delete(t)); return next; });
      setSaveError(firstSave.error ?? "Couldn't save this keyword.");
      return;
    }
    setTrackedKeywords((prev) => new Set([...prev, ...freshLower]));

    try {
      // Phase 1: fast metrics (no LLM) — update the saved record with real data
      const res  = await fetch(`/api/keywords/metrics?${new URLSearchParams({ ...baseParams, fast: "1" })}`);
      const data = await res.json();
      await saveKeywords(data);

      // Clear pending now that metrics are saved
      setPendingTerms((prev) => { const next = new Set(prev); freshLower.forEach((t) => next.delete(t)); return next; });

      // Fire-and-forget: pre-warm combinations for each newly tracked iOS keyword
      if (store === "ios") {
        for (const term of fresh) {
          fetch("/api/keywords/expand-seed", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ term, store, country, appName: activeApp?.name ?? "", appSubtitle }),
          }).catch(() => {});
        }
      }

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
      // Phase 1 failed — keyword is already saved with empty metrics, just clear pending
      setPendingTerms((prev) => { const next = new Set(prev); freshLower.forEach((t) => next.delete(t)); return next; });
    }
  }

  if (!activeApp) {
    return <NoAppSelected />;
  }

  if (isLocked) {
    return (
      <div className="h-full flex flex-col overflow-hidden bg-[#111318]">
        <AppHeader app={activeApp} title="Keyword Combination" />
        <FeatureLocked
          title="Keyword Combination is a Pro+ feature"
          description="Upgrade to Pro+ or above to expand seed keywords into combinations."
        />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden bg-[#111318]">
      <AppHeader app={activeApp ?? null} title="Keyword Combination" />

      {saveError && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-red-500/10 border-b border-red-500/20 text-red-400 text-xs">
          <ExclamationTriangleIcon className="size-4 shrink-0" />
          <span className="flex-1"><PlanLimitMessage message={saveError} /></span>
          <button onClick={() => setSaveError(null)} className="shrink-0 hover:text-red-300">
            <XMarkIcon className="size-4" />
          </button>
        </div>
      )}

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

          onAddTerm={(term) => addTermsToTracked([term])}
          onAddTerms={addTermsToTracked}

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

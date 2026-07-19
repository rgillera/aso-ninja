"use client";

import { useState, useEffect, useRef } from "react";
import { PuzzlePieceIcon, ExclamationTriangleIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { AppHeader } from "@/features/aso/AppHeader";
import { useActiveApp } from "@/features/dashboard/ActiveAppContext";
import { useWorkspaceId } from "@/features/dashboard/WorkspaceContext";
import { useNavigationGuard } from "@/features/dashboard/NavigationGuardContext";
import { usePlanSlug } from "@/features/dashboard/PlanContext";
import { LiveSearchPanel } from "@/features/aso/keywords/research/LiveSearchPanel";
import { PlanLimitMessage } from "@/features/subscription/PlanLimitMessage";
import { FeatureLocked } from "@/features/subscription/FeatureLocked";
import { isPlanAtLeast } from "@/features/subscription/planTiers";
import { CombinationTable } from "./CombinationTable";
import type { CombinationGroup } from "./types";
import type { CombinationsResult } from "@/app/api/keywords/combinations/route";
import type { SavedKeyword } from "@/app/api/keywords/list/route";
import type { SavedCombinationGroup } from "@/app/api/keywords/combination-groups/route";
import type { IntentTheme } from "@/features/aso/keywords/intent/types";

function NoAppSelected() {
  return (
    <div className="h-full flex items-center justify-center bg-[#111318]">
      <div className="text-center">
        <PuzzlePieceIcon className="size-10 text-gray-700 mx-auto mb-4" />
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
  const translateLocked = !isPlanAtLeast(planSlug, "basic");
  const [groups,          setGroups]          = useState<CombinationGroup[]>([]);
  const [trackedKeywords, setTrackedKeywords] = useState<Set<string>>(new Set());
  const [pendingTerms,    setPendingTerms]    = useState<Set<string>>(new Set());
  const [translateToggle, setTranslateToggle] = useState(false);
  const [intentThemes,    setIntentThemes]    = useState<IntentTheme[]>([]);
  const { setGuardMessage } = useNavigationGuard();
  useEffect(() => {
    setGuardMessage(pendingTerms.size > 0 ? "A keyword is still being saved. Leaving now may lose it." : null);
    return () => setGuardMessage(null);
  }, [pendingTerms, setGuardMessage]);
  const [researchTerms,   setResearchTerms]   = useState<string[]>([]);
  const [liveSearchTerm,  setLiveSearchTerm]  = useState<string | null>(null);
  const [appSubtitle,     setAppSubtitle]     = useState<string>("");
  const [saveError,       setSaveError]       = useState<string | null>(null);

  // Shared identity for resolving/creating the apps row server-side — mirrors
  // the fallback used by /api/keywords/save so this works for a previewed
  // app that isn't formally tracked yet (no activeApp.id).
  function combinationIdentity() {
    return {
      workspaceId,
      appId:    activeApp?.id,
      bundleId: activeApp?.bundle_id,
      storeId:  activeApp?.store_id,
      appName:  activeApp?.name,
      store:    activeApp?.store,
      country:  activeApp?.country ?? "us",
    };
  }

  function toCombinationGroup(g: SavedCombinationGroup): CombinationGroup {
    return {
      seed: g.seed, expanded: g.expanded, loading: false,
      children: g.children.map((c) => ({ ...c, starred: false, tracked: false })),
    };
  }

  async function saveGroupToDb(seed: string, children: CombinationGroup["children"], expandedState: boolean) {
    if (!workspaceId) return;
    try {
      await fetch("/api/keywords/combination-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          seed, expanded: expandedState,
          children: children.map(({ term, volume, results, difficulty, chance }) => ({ term, volume, results, difficulty, chance })),
          ...combinationIdentity(),
        }),
      });
    } catch {}
  }

  function patchExpandInDb(seed: string, expandedState: boolean) {
    fetch("/api/keywords/combination-groups", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ seed, expanded: expandedState, ...combinationIdentity() }),
    }).catch(() => {});
  }

  function deleteGroupFromDb(seed: string) {
    const { appId, workspaceId: ws, bundleId, store, country } = combinationIdentity();
    const params: Record<string, string> = { seed };
    if (appId) params.appId = appId;
    else if (ws && bundleId && store) { params.workspaceId = ws; params.bundleId = bundleId; params.store = store; params.country = country; }
    else return;
    fetch(`/api/keywords/combination-groups?${new URLSearchParams(params)}`, { method: "DELETE" }).catch(() => {});
  }

  // Load combination groups from the DB. Falls back to workspaceId+bundleId
  // lookup for a previewed app not yet formally tracked, same as the tracked
  // keywords list below.
  useEffect(() => {
    if (!activeApp) return;

    const params: Record<string, string> | null = activeApp.id
      ? { appId: activeApp.id }
      : workspaceId && activeApp.bundle_id && activeApp.store
        ? { workspaceId, bundleId: activeApp.bundle_id, store: activeApp.store, country: activeApp.country ?? "us" }
        : null;
    if (!params) return;

    (async () => {
      try {
        const res = await fetch(`/api/keywords/combination-groups?${new URLSearchParams(params)}`);
        const data: { groups: SavedCombinationGroup[] } = await res.json();
        if (data.groups?.length) {
          setGroups(data.groups.map(toCombinationGroup));
          return;
        }
      } catch {
        setGroups([]);
        return;
      }

      // DB has nothing yet — this app may have groups sitting in this
      // browser's localStorage from before groups were persisted server-side.
      // Recover them once, push them up to the DB, then stop relying on
      // localStorage entirely (a different appId, e.g. after this preview
      // gets formally tracked, would otherwise "lose" them again).
      const legacyIds = [activeApp.id, activeApp.store_id].filter(Boolean) as string[];
      for (const id of legacyIds) {
        try {
          const raw = localStorage.getItem(`combinations-${id}`);
          if (!raw) continue;
          const legacy = JSON.parse(raw) as CombinationGroup[];
          if (!legacy.length) continue;
          setGroups(legacy);
          legacy.forEach((g) => { void saveGroupToDb(g.seed, g.children, g.expanded); });
          localStorage.removeItem(`combinations-${id}`);
          return;
        } catch { /* ignore malformed legacy entry */ }
      }
      setGroups([]);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeApp?.id, activeApp?.store_id, activeApp?.bundle_id, activeApp?.store, workspaceId]);

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
          // Distinct keyword rows can carry the same displayed term — collapse
          // those so term-keyed UI (seed suggestion pills) doesn't choke on duplicates.
          setResearchTerms([...new Map((saved ?? []).map((s) => [s.term.toLowerCase(), s.term])).values()]);
        })
        .catch(() => {});
    }

    refreshTracked();
    window.addEventListener("focus", refreshTracked);
    return () => window.removeEventListener("focus", refreshTracked);
  }, [activeApp?.id, activeApp?.bundle_id, workspaceId, isLocked]);

  // Load this app's intent themes so selected combinations can be added
  // straight into one — same identity fallback as the tracked-keywords load
  // above, for a previewed app with no formal apps-table id yet.
  useEffect(() => {
    if (!activeApp || isLocked) return;
    const params: Record<string, string> | null = activeApp.id
      ? { appId: activeApp.id }
      : workspaceId && activeApp.bundle_id && activeApp.store
        ? { workspaceId, bundleId: activeApp.bundle_id, store: activeApp.store, country: activeApp.country ?? "us" }
        : null;
    if (!params) return;

    fetch(`/api/keywords/intents?${new URLSearchParams(params)}`)
      .then((r) => r.json())
      .then((data: { themes?: IntentTheme[] }) => setIntentThemes(data.themes ?? []))
      .catch(() => {});
  }, [activeApp?.id, activeApp?.bundle_id, activeApp?.store, activeApp?.country, workspaceId, isLocked]);

  async function handleAddSeeds(seeds: string[]) {
    const existing = new Set(groups.map((g) => g.seed.toLowerCase()));
    const fresh = [...new Set(seeds.map((s) => s.toLowerCase().trim()).filter(Boolean))]
      .filter((s) => !existing.has(s));
    if (!fresh.length) return;

    const placeholders: CombinationGroup[] = fresh.map((seed) => ({
      seed, expanded: true, loading: true, children: [],
    }));
    setGroups([...placeholders, ...groups]);

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

      setGroups((prev) => prev.map((g) => {
        const match = data.groups.find((d) => d.seed === g.seed);
        if (!match || !fresh.includes(g.seed)) return g;
        const children = match.children.map((c) => ({
          term: c.term, volume: c.volume, results: c.results,
          difficulty: c.difficulty, chance: c.chance,
          starred: false, tracked: false,
        }));
        void saveGroupToDb(g.seed, children, g.expanded);
        return { ...g, loading: false, children };
      }));
    } catch {
      setGroups((prev) => prev.map((g) => fresh.includes(g.seed) ? { ...g, loading: false } : g));
    }
  }

  function handleToggleExpand(seed: string) {
    const nextExpanded = !groups.find((g) => g.seed === seed)?.expanded;
    setGroups(groups.map((g) => g.seed === seed ? { ...g, expanded: nextExpanded } : g));
    patchExpandInDb(seed, nextExpanded);
  }


  function handleRemoveGroup(seed: string) {
    setGroups(groups.filter((g) => g.seed !== seed));
    deleteGroupFromDb(seed);
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
      ...(workspaceId ? { workspaceId } : {}),
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

      // Phase 2: full metrics (LLM relevancy + opportunity) — re-save to update
      try {
        const res2  = await fetch(`/api/keywords/metrics?${new URLSearchParams(baseParams)}`);
        const data2 = await res2.json();
        await saveKeywords(data2);
      } catch {}

      // Both platforms' metrics fetch above already wrote today's
      // keyword_rankings_history on success (fetchIosMetrics / fetchAndroidMetrics),
      // so there's no separate live-search backfill left to do here.
    } catch {
      // Phase 1 failed — keyword is already saved with empty metrics, just clear pending
      setPendingTerms((prev) => { const next = new Set(prev); freshLower.forEach((t) => next.delete(t)); return next; });
    }
  }

  // Adds the selection to tracked keywords, then assigns the resulting
  // keyword rows to an intent theme in one action — the "Group by intent"
  // bulk-selection button. Awaits the full add (including metrics) so the
  // keyword rows this assigns against are guaranteed to exist first.
  async function addTermsToIntent(terms: string[], themeId: string) {
    if (!terms.length) return;
    await addTermsToTracked(terms);
    if (!workspaceId) return;
    try {
      await fetch("/api/keywords/intents", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...combinationIdentity(), terms, themeId }),
      });
    } catch {}
  }

  if (!activeApp) {
    return <NoAppSelected />;
  }

  if (isLocked) {
    return (
      <div className="h-full flex flex-col overflow-hidden bg-[#111318]">
        <AppHeader app={activeApp} title="Long Tail Keywords" />
        <FeatureLocked
          minPlan="pro_plus"
          icon={PuzzlePieceIcon}
          title="Long Tail Keywords is a Pro+ feature"
          description="Upgrade to Pro+ or above to expand seed keywords into combinations."
          benefits={[
            "Turn one seed keyword into dozens of long-tail combinations",
            "See search volume and difficulty for every combination instantly",
            "Add winning combinations straight to your tracked keywords",
          ]}
        />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden bg-[#111318]">
      <AppHeader app={activeApp ?? null} title="Long Tail Keywords" />

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
          translateToggle={translateToggle && !translateLocked}
          translateLocked={translateLocked}
          onTranslateToggle={() => !translateLocked && setTranslateToggle((v) => !v)}
          intentThemes={intentThemes}
          onAddTermsToIntent={addTermsToIntent}
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

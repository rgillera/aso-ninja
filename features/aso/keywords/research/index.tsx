"use client";

import { useState, useEffect, useRef } from "react";
import { MagnifyingGlassIcon, ExclamationTriangleIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { AppHeader } from "@/features/aso/AppHeader";
import { useActiveApp } from "@/features/dashboard/ActiveAppContext";
import { useWorkspaceId } from "@/features/dashboard/WorkspaceContext";
import { fetchLiveSearchResults } from "@/features/aso/keywords/research/liveSearch";
import { KeywordSuggestionsPanel } from "./KeywordSuggestionsPanel";
import { KeywordTable } from "./KeywordTable";
import type { Keyword } from "./types";
import type { SavedKeyword } from "@/app/api/keywords/list/route";
import type { CompetitorApp } from "./ManageCompetitorsModal";


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

export default function KeywordResearchPage() {
  const activeApp   = useActiveApp();
  const workspaceId = useWorkspaceId();
  const [keywords,     setKeywords]     = useState<Keyword[]>([]);
  const [competitors,  setCompetitors]  = useState<CompetitorApp[]>([]);
  const [translateToggle, setTranslateToggle] = useState(false);
  // Counts in-flight adds (fast metrics → full metrics → Supabase save) — used
  // to keep the Add button in a loading state until the keyword is actually
  // persisted, so users don't refresh mid-add and lose it.
  const [pendingAdds, setPendingAdds] = useState(0);
  const [rateLimited, setRateLimited] = useState(false);

  // Load/save competitors per app in localStorage
  useEffect(() => {
    const appId = activeApp?.id ?? activeApp?.store_id;
    if (!appId) return;
    try {
      const raw = localStorage.getItem(`competitors-${appId}`);
      setCompetitors(raw ? (JSON.parse(raw) as CompetitorApp[]) : []);
    } catch {
      setCompetitors([]);
    }
  }, [activeApp?.id, activeApp?.store_id]);

  function handleCompetitorsChange(updated: CompetitorApp[]) {
    setCompetitors(updated);
    const appId = activeApp?.id ?? activeApp?.store_id;
    if (appId) {
      try { localStorage.setItem(`competitors-${appId}`, JSON.stringify(updated)); } catch {}
    }
  }

  // Load persisted keywords for this app on mount / app change — instant (no metrics recompute).
  // Keyed on bundle_id rather than the internal id: a previewed-but-not-yet-
  // tracked app never gets an `id` from ActiveAppContext, so gating on it
  // would skip loading entirely and make a refresh look like the add never
  // saved, even though it did.
  const loadedAppId = useRef<string | undefined>(undefined);
  useEffect(() => {
    const key = activeApp?.id ?? activeApp?.bundle_id;
    if (!key || loadedAppId.current === key) return;
    loadedAppId.current = key;
    const params = activeApp?.id
      ? new URLSearchParams({ appId: activeApp.id })
      : new URLSearchParams({
          workspaceId: workspaceId ?? "",
          bundleId: activeApp?.bundle_id ?? "",
          store: activeApp?.store ?? "ios",
          country: activeApp?.country ?? "us",
        });
    fetch(`/api/keywords/list?${params}`)
      .then((r) => r.json())
      .then(({ keywords: saved }: { keywords: SavedKeyword[] }) => {
        if (!saved?.length) return;
        setKeywords(
          saved.map((s) => ({
            keyword:     s.term,
            volume:      s.volume,
            diff:        s.diff,
            chance:      s.chance,
            opportunity: s.opportunity,
            relevancy:   s.relevancy,
            rank:        s.rank,
            starred:     false,
            // If no cached metrics, mark as loading so metrics get re-fetched
            loading:     !s.hasCachedMetrics,
          }))
        );
        // Re-fetch metrics for any keywords that have no cached values
        const needsMetrics = saved.filter((s) => !s.hasCachedMetrics).map((s) => s.term);
        if (needsMetrics.length) handleAddKeywords(needsMetrics);
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeApp?.id, activeApp?.bundle_id]);

  async function handleAddKeywords(newKeywords: string[]) {
    // Deduplicate against already-tracked (non-loading) keywords
    const existing = new Set(
      keywords.filter((k) => !k.loading).map((k) => k.keyword.toLowerCase())
    );
    const fresh = newKeywords.filter((kw) => !existing.has(kw.toLowerCase()));
    if (!fresh.length) return;
    newKeywords = fresh;

    setKeywords((prev) => [
      ...newKeywords.map((kw) => ({
        keyword: kw,
        volume: 0, diff: 0, chance: 0, opportunity: 0,
        rank: null, starred: false, loading: true,
      })),
      ...prev,
    ]);

    const store   = activeApp?.store ?? "ios";
    const country = activeApp?.country ?? "us";

    setPendingAdds((n) => n + 1);

    // Phase 1: fast metrics (volume/diff/chance/rank) — skips the slow LLM
    // relevancy pass so basic numbers show up immediately. Relevancy/
    // opportunity arrive null and get back-filled by phase 2 below.
    const fastParams = new URLSearchParams({
      terms: newKeywords.join(","),
      store,
      country: country ?? "us",
      appName: activeApp?.name ?? "",
      fast: "1",
      ...(activeApp?.id ? { appId: activeApp.id } : {}),
    });

    try {
      const res  = await fetch(`/api/keywords/metrics?${fastParams}`);
      const data: Record<string, { volume: number; diff: number; chance: number; opportunity: number | null; results: number; relevancy: number | null; rank: number | null } | true> & { _rateLimited?: boolean } = await res.json();
      if (data._rateLimited) setRateLimited(true);

      setKeywords((prev) =>
        prev.map((k) => {
          if (!k.loading || !newKeywords.includes(k.keyword)) return k;
          const m = data[k.keyword];
          return m && m !== true
            ? { ...k, ...m, relevancy: m.relevancy ?? undefined, opportunity: m.opportunity ?? undefined, loading: false }
            : { ...k, loading: false };
        })
      );
    } catch {
      setKeywords((prev) =>
        prev.map((k) =>
          k.loading && newKeywords.includes(k.keyword) ? { ...k, loading: false } : k
        )
      );
      setPendingAdds((n) => n - 1);
      return;
    }

    // Phase 2: full metrics (relevancy/opportunity via LLM) + Supabase save —
    // awaited here so pendingAdds only clears once the keyword is actually
    // persisted, but not awaited by the caller, so it doesn't block the UI.
    await finishAddingKeywords(newKeywords, store, country);
    setPendingAdds((n) => n - 1);
  }

  async function finishAddingKeywords(newKeywords: string[], store: "ios" | "android", country: string) {
    const params = new URLSearchParams({
      terms: newKeywords.join(","),
      store,
      country,
      appName: activeApp?.name ?? "",
      ...(activeApp?.id ? { appId: activeApp.id } : {}),
    });

    try {
      const res  = await fetch(`/api/keywords/metrics?${params}`);
      const data: Record<string, { volume: number; diff: number; chance: number; opportunity: number | null; results: number; relevancy: number | null; rank: number | null }> & { _rateLimited?: boolean } = await res.json();
      if (data._rateLimited) setRateLimited(true);

      setKeywords((prev) =>
        prev.map((k) => {
          const m = data[k.keyword];
          return m && newKeywords.includes(k.keyword)
            ? { ...k, ...m, relevancy: m.relevancy ?? undefined, opportunity: m.opportunity ?? undefined }
            : k;
        })
      );

      // Persist keywords + freshly computed metrics to Supabase
      if (workspaceId) {
        await fetch("/api/keywords/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            terms:     newKeywords,
            workspaceId,
            metrics:   data,
            appId:     activeApp?.id,
            bundleId:  activeApp?.bundle_id,
            storeId:   activeApp?.store_id,
            appName:   activeApp?.name,
            iconUrl:   activeApp?.icon_url ?? undefined,
            store,
            country,
          }),
        });
      }
    } catch {}

    // Quietly back-fill a rank for each newly tracked keyword — same one
    // request a user would've made by hand via the Performance tab's Live
    // Search button, just automatic. Not awaited so it doesn't hold up Add.
    // iOS is skipped here: the metrics fetch above already ran its own iTunes
    // search and wrote today's rankings on success, so firing a second,
    // separate iTunes call right after would just double the request volume
    // against Apple's rate limit for no new information. Android still needs
    // it since fetchAndroidMetrics never writes keyword_rankings_history.
    if (store === "android") {
      runLiveSearchInBackground(newKeywords, store, country);
    }
  }

  async function runLiveSearchInBackground(terms: string[], store: "ios" | "android", country: string) {
    // Spacing between calls is enforced centrally in liveSearch.ts (shared
    // across every caller app-wide), so this just fires them in order.
    for (const term of terms) {
      try {
        await fetchLiveSearchResults(term, store, country);
      } catch (err) {
        console.warn(`Live search failed for "${term}" — rank will stay "Unknown" until retried`, err);
      }
    }
  }

  function handleToggleStar(index: number) {
    setKeywords((prev) =>
      prev.map((k, i) => i === index ? { ...k, starred: !k.starred } : k)
    );
  }

  function handleStarSelected(terms: string[]) {
    const termSet = new Set(terms.map((t) => t.toLowerCase()));
    setKeywords((prev) =>
      prev.map((k) => termSet.has(k.keyword.toLowerCase()) ? { ...k, starred: true } : k)
    );
  }

  function persistRemoval(terms: string[]) {
    if (!terms.length || (!activeApp?.id && !activeApp?.bundle_id)) return;
    fetch("/api/keywords/remove", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        terms,
        appId: activeApp?.id,
        workspaceId: workspaceId,
        bundleId: activeApp?.bundle_id,
        store: activeApp?.store,
        country: activeApp?.country,
      }),
    }).catch(() => {});
  }

  function handleRemoveSelected(terms: string[]) {
    const removedSet = new Set(terms.map((t) => t.toLowerCase()));
    setKeywords((prev) => prev.filter((k) => !removedSet.has(k.keyword.toLowerCase())));
    persistRemoval(terms);
  }

  function handleRemoveKeyword(term: string) {
    setKeywords((prev) => prev.filter((k) => k.keyword.toLowerCase() !== term.toLowerCase()));
    persistRemoval([term]);
  }

  if (!activeApp) {
    return <NoAppSelected />;
  }

  return (
    <div className="h-full flex flex-col overflow-hidden bg-[#111318]">
      <AppHeader app={activeApp ?? null} title="Keyword Research" />

      {rateLimited && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-500/10 border-b border-amber-500/20 text-amber-400 text-xs">
          <ExclamationTriangleIcon className="size-4 shrink-0" />
          <span className="flex-1">Apple&apos;s App Store API rate limit reached. Some keywords are missing data. Wait a minute and re-add them.</span>
          <button onClick={() => setRateLimited(false)} className="shrink-0 hover:text-amber-300">
            <XMarkIcon className="size-4" />
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        <KeywordSuggestionsPanel
          onAddKeyword={(kw) => handleAddKeywords([kw])}
          onAddKeywords={handleAddKeywords}
          onRemoveKeyword={handleRemoveKeyword}
          activeApp={activeApp}
          trackedKeywords={keywords}
          competitors={competitors}
          onCompetitorsChange={handleCompetitorsChange}
        />

        <KeywordTable
          keywords={keywords}
          store={activeApp?.store ?? "ios"}
          country={activeApp?.country ?? "us"}
          translateToggle={translateToggle}
          onTranslateToggle={() => setTranslateToggle((v) => !v)}
          adding={pendingAdds > 0}
          onAddKeywords={handleAddKeywords}
          onToggleStar={handleToggleStar}
          onStarSelected={handleStarSelected}
          onRemoveSelected={handleRemoveSelected}
          onRemoveKeyword={handleRemoveKeyword}
        />
      </div>
    </div>
  );
}

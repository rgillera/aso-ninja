"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MagnifyingGlassIcon, ExclamationTriangleIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { AppHeader } from "@/features/aso/AppHeader";
import { useActiveApp } from "@/features/dashboard/ActiveAppContext";
import { useWorkspaceId } from "@/features/dashboard/WorkspaceContext";
import { useNavigationGuard } from "@/features/dashboard/NavigationGuardContext";
import { LiveSearchPanel } from "@/features/aso/keywords/research/LiveSearchPanel";
import { fetchLiveSearchResults } from "@/features/aso/keywords/research/liveSearch";
import { PerformanceTable } from "./PerformanceTable";
import { VisibilityScoreChart, type ChartApp } from "./VisibilityScoreChart";
import { VolumeHistoryPanel } from "./VolumeHistoryPanel";
import {
  DEFAULT_FILTERS, wordCount,
  type Filters, type PerformanceKeyword, type TermSnapshot, type VisibilityHistoryResult,
} from "./types";
import { getStarred, toggleStarred, starTerms } from "@/libs/starred-keywords";
import type { SavedKeyword } from "@/app/api/keywords/list/route";
import type { PerformanceSnapshotResult } from "@/app/api/keywords/performance-snapshots/route";
import type { CompetitorApp } from "@/features/aso/keywords/research/ManageCompetitorsModal";

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

export default function KeywordPerformancePage() {
  const activeApp   = useActiveApp();
  const workspaceId = useWorkspaceId();
  const [keywords,    setKeywords]    = useState<PerformanceKeyword[]>([]);
  const [competitors, setCompetitors] = useState<CompetitorApp[]>([]);
  const [filters,     setFilters]     = useState<Filters>(DEFAULT_FILTERS);
  const [snapshots,        setSnapshots]        = useState<Record<string, TermSnapshot>>({});
  const [snapshotsLoading, setSnapshotsLoading]  = useState(false);
  const [tab, setTab] = useState<"chart" | "table">("table");
  const [visibility,        setVisibility]        = useState<VisibilityHistoryResult>({});
  const [visibilityLoading, setVisibilityLoading]  = useState(false);
  const [liveSearchTerm, setLiveSearchTerm] = useState<string | null>(null);
  const [volumeHistoryTerm, setVolumeHistoryTerm] = useState<string | null>(null);
  // Counts in-flight adds (fast metrics → Supabase save) — keeps the Add
  // button in a loading state until the keyword is actually persisted, so
  // users don't refresh mid-add and lose it.
  const [pendingAdds, setPendingAdds] = useState(0);
  const [saveError, setSaveError] = useState<string | null>(null);
  const { setGuardMessage } = useNavigationGuard();
  useEffect(() => {
    setGuardMessage(pendingAdds > 0 ? "A keyword is still being added. Leaving now may lose it." : null);
    return () => setGuardMessage(null);
  }, [pendingAdds, setGuardMessage]);

  // Competitors are shared with the Research tab — same app, same comparison set.
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

  // Tracked keywords are shared with Research — this view is a different lens
  // on the same pool. Keyed on bundle_id rather than the internal id: a
  // previewed-but-not-yet-tracked app never gets an `id` from
  // ActiveAppContext, so gating on it would skip loading entirely and make a
  // refresh look like the add never saved, even though it did.
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
        const starred = getStarred(activeApp?.id ?? activeApp?.store_id ?? "");
        setKeywords(
          saved.map((s) => ({
            term:    s.term,
            volume:  s.volume,
            rank:    s.rank,
            starred: starred.has(s.term.toLowerCase()),
            loading: !s.hasCachedMetrics,
          }))
        );
        const needsMetrics = saved.filter((s) => !s.hasCachedMetrics).map((s) => s.term);
        if (needsMetrics.length) handleAddKeywords(needsMetrics);
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeApp?.id, activeApp?.bundle_id]);

  async function handleAddKeywords(newTerms: string[]) {
    const existing = new Set(keywords.filter((k) => !k.loading).map((k) => k.term.toLowerCase()));
    const fresh = newTerms.filter((t) => !existing.has(t.toLowerCase()));
    if (!fresh.length) return;
    newTerms = fresh;

    const starred = getStarred(activeApp?.id ?? activeApp?.store_id ?? "");
    setKeywords((prev) => [
      ...newTerms.map((term) => ({ term, volume: 0, rank: null, starred: starred.has(term.toLowerCase()), loading: true })),
      ...prev,
    ]);

    const store   = activeApp?.store ?? "ios";
    const country = activeApp?.country ?? "us";
    const params  = new URLSearchParams({
      terms: newTerms.join(","),
      store,
      country,
      appName: activeApp?.name ?? "",
      // Performance only ever reads volume/rank — skip the slow LLM relevancy
      // pass entirely rather than computing values nothing here displays.
      fast: "1",
      ...(activeApp?.id ? { appId: activeApp.id } : {}),
    });

    setPendingAdds((n) => n + 1);
    try {
      const res  = await fetch(`/api/keywords/metrics?${params}`);
      const data: Record<string, { volume: number; rank: number | null }> = await res.json();

      setKeywords((prev) =>
        prev.map((k) => {
          if (!k.loading || !newTerms.includes(k.term)) return k;
          const m = data[k.term];
          return m ? { ...k, volume: m.volume, rank: m.rank, loading: false } : { ...k, loading: false };
        })
      );

      if (workspaceId) {
        const saveRes = await fetch("/api/keywords/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            terms: newTerms,
            workspaceId,
            metrics: data,
            appId:    activeApp?.id,
            bundleId: activeApp?.bundle_id,
            storeId:  activeApp?.store_id,
            appName:  activeApp?.name,
            iconUrl:  activeApp?.icon_url ?? undefined,
            store,
            country,
          }),
        });

        // A non-OK response means the save was rejected server-side (e.g.
        // this app can't be tracked because the workspace's plan app limit
        // is already used) — pull the keyword back out instead of leaving it
        // showing as successfully added.
        if (!saveRes.ok) {
          const body: { error?: string } = await saveRes.json().catch(() => ({}));
          setSaveError(body.error ?? "Couldn't save this keyword.");
          setKeywords((prev) => prev.filter((k) => !newTerms.includes(k.term)));
          return;
        }
      }

      // Quietly back-fill a rank for each newly tracked keyword — same one
      // request a user would've made by hand via the per-row Live Search button,
      // just automatic. Not awaited so it doesn't hold up the Add button.
      // iOS is skipped here: the metrics fetch above already ran its own iTunes
      // search and wrote today's rankings on success, so firing a second,
      // separate iTunes call right after would just double the request volume
      // against Apple's rate limit for no new information. Android still needs
      // it since fetchAndroidMetrics never writes keyword_rankings_history.
      if (store === "android") {
        runLiveSearchInBackground(newTerms, store, country);
      }

      if (store === "ios") {
        for (const term of newTerms) {
          fetch("/api/keywords/expand-seed", {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({ term, store, country, appName: activeApp?.name ?? "" }),
          }).catch(() => {});
        }
      }
    } catch {
      setKeywords((prev) =>
        prev.map((k) => (k.loading && newTerms.includes(k.term) ? { ...k, loading: false } : k))
      );
    } finally {
      setPendingAdds((n) => n - 1);
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
    setSnapshotsRefreshKey((k) => k + 1);
  }

  // Manual escape hatch for the auto-retry-once-per-visit logic below: lets a
  // user re-trigger a live search for everything still stuck on "Unknown"
  // (e.g. after Apple's rate limit, which the queue/backoff can't route
  // around on its own, has had time to clear) without reloading the page.
  const [refetchingRanks, setRefetchingRanks] = useState(false);
  const stuckTerms = useMemo(
    () => keywords.filter((k) => !k.loading && !snapshots[k.term]?.rankLatestDate).map((k) => k.term),
    [keywords, snapshots]
  );

  async function handleRefetchRanks() {
    if (!stuckTerms.length || refetchingRanks) return;
    setRefetchingRanks(true);
    try {
      await runLiveSearchInBackground(stuckTerms, activeApp?.store ?? "ios", activeApp?.country ?? "us");
    } finally {
      setRefetchingRanks(false);
    }
  }

  function handleToggleStar(term: string) {
    const appId = activeApp?.id ?? activeApp?.store_id ?? "";
    const nowStarred = toggleStarred(appId, term);
    setKeywords((prev) => prev.map((k) => (k.term === term ? { ...k, starred: nowStarred } : k)));
  }

  function handleStarSelected(terms: string[]) {
    const appId = activeApp?.id ?? activeApp?.store_id ?? "";
    starTerms(appId, terms);
    const termSet = new Set(terms.map((t) => t.toLowerCase()));
    setKeywords((prev) => prev.map((k) => termSet.has(k.term.toLowerCase()) ? { ...k, starred: true } : k));
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

  function handleRemoveKeyword(term: string) {
    setKeywords((prev) => prev.filter((k) => k.term !== term));
    persistRemoval([term]);
  }

  function handleRemoveSelected(terms: string[]) {
    const removedSet = new Set(terms.map((t) => t.toLowerCase()));
    setKeywords((prev) => prev.filter((k) => !removedSet.has(k.term.toLowerCase())));
    persistRemoval(terms);
  }

  // Prev vs Latest performance: the two most recent real Volume/Rank snapshots
  // we have for each keyword, whatever dates those happen to be — snapshots
  // land irregularly, so comparing two user-picked calendar dates mostly
  // returns gaps. Refetched whenever the tracked-keyword set changes.
  const trackedTerms = useMemo(
    () => keywords.filter((k) => !k.loading).map((k) => k.term).sort().join(","),
    [keywords]
  );

  // Bumped after a Live Search closes, so a freshly recorded rank shows up
  // without the user having to leave and re-enter the page.
  const [snapshotsRefreshKey, setSnapshotsRefreshKey] = useState(0);

  // Tracks which "<appId>:<term>" pairs have already had one automatic
  // catch-up search this page visit, so a keyword that's still stuck after
  // retrying doesn't get re-queued on every snapshot refetch (the search
  // itself bumps snapshotsRefreshKey on completion, which would otherwise
  // loop). Resets naturally on reload, so a still-stuck term gets another
  // shot next visit.
  const autoRetriedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!activeApp || !trackedTerms) return;
    const t = setTimeout(() => {
      setSnapshotsLoading(true);
      const params = new URLSearchParams({
        terms:   trackedTerms,
        store:   activeApp.store ?? "ios",
        country: activeApp.country ?? "us",
        storeId: activeApp.store_id ?? "",
        competitorIds: competitors.map((c) => c.storeId).join(","),
      });
      fetch(`/api/keywords/performance-snapshots?${params}`)
        .then((r) => r.json())
        .then((data: PerformanceSnapshotResult) => {
          setSnapshots(data);
          // Any tracked keyword with no rank history at all (rankLatestDate
          // null) never got a successful Live Search, whichever path added
          // it. Automatically retry those once per visit instead of leaving
          // them stuck on "Unknown" until someone notices and clicks the
          // per-row button.
          const appId = activeApp.id ?? "";
          const missing = Object.entries(data)
            .filter(([, snap]) => !snap.rankLatestDate)
            .map(([term]) => term)
            .filter((term) => !autoRetriedRef.current.has(`${appId}:${term}`));
          if (missing.length) {
            missing.forEach((term) => autoRetriedRef.current.add(`${appId}:${term}`));
            runLiveSearchInBackground(missing, activeApp.store ?? "ios", activeApp.country ?? "us");
          }
        })
        .catch(() => setSnapshots({}))
        .finally(() => setSnapshotsLoading(false));
    }, 300);
    return () => clearTimeout(t);
  }, [activeApp, trackedTerms, snapshotsRefreshKey, competitors]);

  // Visibility Score: our own derived metric (real Volume x real Rank-position
  // weight, summed across tracked keywords), not an Apple/Google-reported number.
  const chartApps = useMemo<ChartApp[]>(() => {
    if (!activeApp) return [];
    const ourId = activeApp.store_id ?? activeApp.id;
    if (!ourId) return [];
    return [
      { id: ourId, name: activeApp.name, icon: activeApp.icon_url ?? "" },
      ...competitors.map((c) => ({ id: c.storeId, name: c.name, icon: c.icon })),
    ];
  }, [activeApp, competitors]);

  useEffect(() => {
    if (!activeApp || !trackedTerms || !chartApps.length) return;
    const t = setTimeout(() => {
      setVisibilityLoading(true);
      const today = new Date();
      const from30 = new Date(today); from30.setDate(today.getDate() - 29);
      const toIso   = today.toISOString().split("T")[0];
      const fromIso = from30.toISOString().split("T")[0];
      const params = new URLSearchParams({
        terms:  trackedTerms,
        appIds: chartApps.map((a) => a.id).join(","),
        store:  activeApp.store ?? "ios",
        country: activeApp.country ?? "us",
        from: fromIso,
        to:   toIso,
      });
      fetch(`/api/keywords/visibility-history?${params}`)
        .then((r) => r.json())
        .then((data: VisibilityHistoryResult) => setVisibility(data))
        .catch(() => setVisibility({}))
        .finally(() => setVisibilityLoading(false));
    }, 300);
    return () => clearTimeout(t);
  }, [activeApp, trackedTerms, chartApps]);

  const filtered = useMemo(() => {
    if (!activeApp) return [];
    const q = filters.query.trim().toLowerCase();
    return keywords.filter((k) => {
      if (q && !k.term.toLowerCase().includes(q)) return false;
      if (k.volume < filters.volumeMin || k.volume > filters.volumeMax) return false;
      if (filters.starredOnly && !k.starred) return false;
      if (k.rank !== null && (k.rank < filters.rankMin || k.rank > filters.rankMax)) return false;

      if (filters.wordCount !== "all" && wordCount(k.term) !== filters.wordCount) return false;
      return true;
    });
  }, [keywords, filters, activeApp]);

  if (!activeApp) {
    return <NoAppSelected />;
  }

  return (
    <div className="h-full flex flex-col overflow-hidden bg-[#111318]">
      <AppHeader app={activeApp ?? null} title="Monitor Performance" />

      {saveError && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-red-500/10 border-b border-red-500/20 text-red-400 text-xs">
          <ExclamationTriangleIcon className="size-4 shrink-0" />
          <span className="flex-1">{saveError}</span>
          <button onClick={() => setSaveError(null)} className="shrink-0 hover:text-red-300">
            <XMarkIcon className="size-4" />
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        <div className="flex items-center gap-1 px-6 pt-3">
          {([["chart", "Visibility Score"], ["table", "Keyword Performance"]] as const).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                tab === id ? "bg-white/[0.08] text-white" : "text-gray-500 hover:text-gray-300"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "chart" ? (
          <div className="px-6 pt-4 pb-6">
            <div className="rounded-xl bg-[#1a1d24] ring-1 ring-white/[0.07]">
              <div className="flex items-center justify-between px-5 pt-4 pb-1">
                <div>
                  <p className="text-sm font-semibold text-white">Visibility Score</p>
                  <p className="text-xs text-gray-500 mt-0.5">Last 30 days</p>
                </div>
                {visibilityLoading && <div className="size-3 rounded-full border-2 border-gray-600 border-t-indigo-400 animate-spin" />}
              </div>
              <VisibilityScoreChart apps={chartApps} data={visibility} loading={visibilityLoading} />
            </div>
          </div>
        ) : (
          <div className="pt-4">
            <PerformanceTable
              keywords={keywords}
              filtered={filtered}
              appName={activeApp.name}
              appIcon={activeApp.icon_url ?? ""}
              activeApp={activeApp}
              competitors={competitors}
              onCompetitorsChange={handleCompetitorsChange}
              filters={filters}
              onFiltersChange={(patch) => setFilters((prev) => ({ ...prev, ...patch }))}
              snapshots={snapshots}
              snapshotsLoading={snapshotsLoading}
              adding={pendingAdds > 0}
              onAddKeywords={handleAddKeywords}
              onToggleStar={handleToggleStar}
              onStarSelected={handleStarSelected}
              onRemoveKeyword={handleRemoveKeyword}
              onRemoveSelected={handleRemoveSelected}
              onLiveSearch={setLiveSearchTerm}
              onViewVolumeHistory={setVolumeHistoryTerm}
              onRefetchRanks={handleRefetchRanks}
              refetchingRanks={refetchingRanks}
              stuckRankCount={stuckTerms.length}
            />
          </div>
        )}
      </div>

      {liveSearchTerm && (
        <LiveSearchPanel
          keyword={liveSearchTerm}
          store={activeApp.store ?? "ios"}
          country={activeApp.country ?? "us"}
          onClose={() => {
            setLiveSearchTerm(null);
            setSnapshotsRefreshKey((k) => k + 1);
          }}
        />
      )}

      {volumeHistoryTerm && (
        <VolumeHistoryPanel
          term={volumeHistoryTerm}
          store={activeApp.store ?? "ios"}
          country={activeApp.country ?? "us"}
          onClose={() => setVolumeHistoryTerm(null)}
        />
      )}
    </div>
  );
}

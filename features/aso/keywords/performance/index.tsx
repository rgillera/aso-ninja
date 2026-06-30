"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { AppHeader } from "@/features/aso/AppHeader";
import { useActiveApp } from "@/features/dashboard/ActiveAppContext";
import { useWorkspaceId } from "@/features/dashboard/WorkspaceContext";
import { LiveSearchPanel } from "@/features/aso/keywords/research/LiveSearchPanel";
import { fetchLiveSearchResults } from "@/features/aso/keywords/research/liveSearch";
import { PerformanceFilters } from "./PerformanceFilters";
import { PerformanceTable } from "./PerformanceTable";
import { VisibilityScoreChart, type ChartApp } from "./VisibilityScoreChart";
import { VolumeHistoryPanel } from "./VolumeHistoryPanel";
import {
  DEFAULT_FILTERS, DEFAULT_RANGE, isBranded, wordCount,
  type DateRange, type Filters, type PerformanceKeyword, type TermSnapshot, type VisibilityHistoryResult,
} from "./types";
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
  const [range,       setRange]       = useState<DateRange>(DEFAULT_RANGE);
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

  // Tracked keywords are shared with Research — this view is a different lens on the same pool.
  const loadedAppId = useRef<string | undefined>(undefined);
  useEffect(() => {
    const appId = activeApp?.id;
    if (!appId || loadedAppId.current === appId) return;
    loadedAppId.current = appId;
    fetch(`/api/keywords/list?appId=${appId}`)
      .then((r) => r.json())
      .then(({ keywords: saved }: { keywords: SavedKeyword[] }) => {
        if (!saved?.length) return;
        setKeywords(
          saved.map((s) => ({
            term:    s.term,
            volume:  s.volume,
            rank:    s.rank,
            starred: false,
            loading: !s.hasCachedMetrics,
          }))
        );
        const needsMetrics = saved.filter((s) => !s.hasCachedMetrics).map((s) => s.term);
        if (needsMetrics.length) handleAddKeywords(needsMetrics);
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeApp?.id]);

  async function handleAddKeywords(newTerms: string[]) {
    const existing = new Set(keywords.filter((k) => !k.loading).map((k) => k.term.toLowerCase()));
    const fresh = newTerms.filter((t) => !existing.has(t.toLowerCase()));
    if (!fresh.length) return;
    newTerms = fresh;

    setKeywords((prev) => [
      ...newTerms.map((term) => ({ term, volume: 0, rank: null, starred: false, loading: true })),
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
        await fetch("/api/keywords/save", {
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
      }

      // Quietly back-fill a rank for each newly tracked keyword — same one
      // request a user would've made by hand via the per-row Live Search button,
      // just automatic. Not awaited so it doesn't hold up the Add button.
      runLiveSearchInBackground(newTerms, store, country);
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

  function handleToggleStar(term: string) {
    setKeywords((prev) => prev.map((k) => (k.term === term ? { ...k, starred: !k.starred } : k)));
  }

  function handleRemoveKeyword(term: string) {
    setKeywords((prev) => prev.filter((k) => k.term !== term));
    const appId = activeApp?.id;
    if (!appId) return;
    fetch("/api/keywords/remove", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ appId, terms: [term] }),
    }).catch(() => {});
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
        .then((data: PerformanceSnapshotResult) => setSnapshots(data))
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
      const params = new URLSearchParams({
        terms:  trackedTerms,
        appIds: chartApps.map((a) => a.id).join(","),
        store:  activeApp.store ?? "ios",
        country: activeApp.country ?? "us",
        from: range.from,
        to:   range.to,
      });
      fetch(`/api/keywords/visibility-history?${params}`)
        .then((r) => r.json())
        .then((data: VisibilityHistoryResult) => setVisibility(data))
        .catch(() => setVisibility({}))
        .finally(() => setVisibilityLoading(false));
    }, 300);
    return () => clearTimeout(t);
  }, [activeApp, trackedTerms, chartApps, range]);

  const filtered = useMemo(() => {
    if (!activeApp) return [];
    const q = filters.query.trim().toLowerCase();
    return keywords.filter((k) => {
      if (q && !k.term.toLowerCase().includes(q)) return false;
      if (k.volume < filters.volumeMin || k.volume > filters.volumeMax) return false;
      if (filters.starredOnly && !k.starred) return false;
      if (k.rank !== null && (k.rank < filters.rankMin || k.rank > filters.rankMax)) return false;
      if (filters.type !== "all") {
        const branded = isBranded(k.term, activeApp.name);
        if (filters.type === "branded" && !branded) return false;
        if (filters.type === "generic" && branded) return false;
      }
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

      <div className="flex-1 overflow-y-auto">
        <PerformanceFilters
          filters={filters}
          onChange={(patch) => setFilters((prev) => ({ ...prev, ...patch }))}
          activeApp={activeApp}
          competitors={competitors}
          onCompetitorsChange={handleCompetitorsChange}
        />

        <div className="flex flex-wrap items-center justify-between gap-2 px-6 pt-3">
          <div className="flex items-center gap-1">
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

          {tab === "chart" && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={range.from}
                max={range.to}
                onChange={(e) => setRange({ ...range, from: e.target.value })}
                className="rounded-md bg-[#0d0f14] ring-1 ring-white/[0.08] px-2 py-1.5 text-xs text-gray-300 outline-none focus:ring-indigo-500/40 [color-scheme:dark]"
              />
              <span className="text-xs text-gray-600">to</span>
              <input
                type="date"
                value={range.to}
                min={range.from}
                max={new Date().toISOString().split("T")[0]}
                onChange={(e) => setRange({ ...range, to: e.target.value })}
                className="rounded-md bg-[#0d0f14] ring-1 ring-white/[0.08] px-2 py-1.5 text-xs text-gray-300 outline-none focus:ring-indigo-500/40 [color-scheme:dark]"
              />
              {visibilityLoading && <div className="size-3 rounded-full border-2 border-gray-600 border-t-indigo-400 animate-spin" />}
            </div>
          )}
        </div>

        {tab === "chart" ? (
          <div className="pt-2">
            <VisibilityScoreChart apps={chartApps} data={visibility} loading={visibilityLoading} />
          </div>
        ) : (
          <div className="pt-4">
            <PerformanceTable
              keywords={keywords}
              filtered={filtered}
              appName={activeApp.name}
              appIcon={activeApp.icon_url ?? ""}
              competitors={competitors}
              snapshots={snapshots}
              snapshotsLoading={snapshotsLoading}
              adding={pendingAdds > 0}
              onAddKeywords={handleAddKeywords}
              onToggleStar={handleToggleStar}
              onRemoveKeyword={handleRemoveKeyword}
              onLiveSearch={setLiveSearchTerm}
              onViewVolumeHistory={setVolumeHistoryTerm}
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

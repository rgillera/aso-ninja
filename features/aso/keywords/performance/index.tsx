"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MagnifyingGlassIcon, ArrowTrendingUpIcon, ExclamationTriangleIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { AppHeader } from "@/features/aso/AppHeader";
import { useActiveApp } from "@/features/dashboard/ActiveAppContext";
import { useWorkspaceId } from "@/features/dashboard/WorkspaceContext";
import { useNavigationGuard } from "@/features/dashboard/NavigationGuardContext";
import { usePlanSlug } from "@/features/dashboard/PlanContext";
import { isPlanAtLeast } from "@/features/subscription/planTiers";
import { LiveSearchPanel } from "@/features/aso/keywords/research/LiveSearchPanel";
import { fetchLiveSearchResults } from "@/features/aso/keywords/research/liveSearch";
import { PlanLimitMessage } from "@/features/subscription/PlanLimitMessage";
import { FeatureLocked } from "@/features/subscription/FeatureLocked";
import { PerformanceTable } from "./PerformanceTable";
import { VisibilityScoreChart, type ChartApp } from "./VisibilityScoreChart";
import { VolumeHistoryPanel } from "./VolumeHistoryPanel";
import { RankHistoryPanel } from "./RankHistoryPanel";
import {
  DEFAULT_FILTERS, wordCount,
  type Filters, type PerformanceKeyword, type TermSnapshot, type VisibilityHistoryResult,
} from "./types";
import { getStarred, toggleStarred, starTerms } from "@/libs/starred-keywords";
import type { SavedKeyword } from "@/app/api/keywords/list/route";
import type { PerformanceSnapshotResult } from "@/app/api/keywords/performance-snapshots/route";
import type { CompetitorApp } from "@/features/aso/keywords/research/ManageCompetitorsModal";

// Caps how many automatic background retries a stuck ("Unknown" rank)
// keyword gets before we stop nagging Apple/Google for it — a genuinely
// gone/renamed keyword would otherwise get retried forever.
const MAX_AUTO_RETRIES = 5;
const AUTO_RETRY_INTERVAL_MS = 2 * 60 * 1000;

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
  const planSlug    = usePlanSlug();
  const isLocked    = !isPlanAtLeast(planSlug, "free");
  const translateLocked = !isPlanAtLeast(planSlug, "basic");
  const [keywords,    setKeywords]    = useState<PerformanceKeyword[]>([]);
  const [competitors, setCompetitors] = useState<CompetitorApp[]>([]);
  const [filters,     setFilters]     = useState<Filters>(DEFAULT_FILTERS);
  const [translateToggle, setTranslateToggle] = useState(false);
  const [snapshots,        setSnapshots]        = useState<Record<string, TermSnapshot>>({});
  const [snapshotsLoading, setSnapshotsLoading]  = useState(false);
  const [tab, setTab] = useState<"chart" | "table">("table");
  const [visibility,        setVisibility]        = useState<VisibilityHistoryResult>({});
  const [visibilityLoading, setVisibilityLoading]  = useState(false);
  const [liveSearchTerm, setLiveSearchTerm] = useState<string | null>(null);
  const [volumeHistoryTerm, setVolumeHistoryTerm] = useState<string | null>(null);
  const [rankHistory, setRankHistory] = useState<{ term: string; storeId: string } | null>(null);
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

  // Competitors are shared with the Research tab — same app, same comparison
  // set — and persisted server-side in app_competitors (not localStorage) so
  // the workspace's plan limit can actually be enforced.
  const competitorsAppId = useRef<string | undefined>(undefined);

  useEffect(() => {
    competitorsAppId.current = undefined;
    const key = activeApp?.id ?? activeApp?.bundle_id;
    if (!key || isLocked) return;
    const params = activeApp?.id
      ? new URLSearchParams({ appId: activeApp.id })
      : new URLSearchParams({
          workspaceId: workspaceId ?? "",
          bundleId: activeApp?.bundle_id ?? "",
          store: activeApp?.store ?? "ios",
          country: activeApp?.country ?? "us",
        });
    fetch(`/api/competitors?${params}`)
      .then((r) => r.json())
      .then((data: { appId: string | null; competitors: CompetitorApp[] }) => {
        competitorsAppId.current = data.appId ?? undefined;
        setCompetitors(data.competitors ?? []);
      })
      .catch(() => setCompetitors([]));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeApp?.id, activeApp?.bundle_id, isLocked]);

  async function handleCompetitorsChange(updated: CompetitorApp[]) {
    const previous = competitors;
    setCompetitors(updated);

    const additions = updated.filter((u) => !previous.some((p) => p.storeId === u.storeId));
    const removals  = previous.filter((p) => !updated.some((u) => u.storeId === p.storeId));

    for (const removed of removals) {
      if (!competitorsAppId.current) continue;
      fetch("/api/competitors", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appId: competitorsAppId.current, storeId: removed.storeId }),
      }).catch(() => {});
    }

    for (const added of additions) {
      const res = await fetch("/api/competitors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          appId:    competitorsAppId.current,
          bundleId: activeApp?.bundle_id,
          storeId:  activeApp?.store_id,
          appName:  activeApp?.name,
          iconUrl:  activeApp?.icon_url ?? undefined,
          store:    activeApp?.store,
          country:  activeApp?.country,
          competitor: added,
        }),
      }).catch(() => null);

      if (!res || !res.ok) {
        const body: { error?: string } = res ? await res.json().catch(() => ({})) : {};
        setSaveError(body.error ?? "Couldn't save this competitor.");
        setCompetitors((prev) => prev.filter((c) => c.storeId !== added.storeId));
        continue;
      }

      const data: { appId: string } = await res.json();
      competitorsAppId.current = data.appId;
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
    if (!key || isLocked || loadedAppId.current === key) return;
    loadedAppId.current = key;
    setKeywords([]);
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
      .then(({ keywords: savedRaw }: { keywords: SavedKeyword[] }) => {
        if (!savedRaw?.length) return;
        // Distinct keyword rows can carry the same displayed term (e.g. a
        // stray duplicate created before normalization was tightened) —
        // collapse those here so callers relying on term as a unique key
        // (e.g. table row keys) don't choke on duplicates.
        const seen = new Set<string>();
        const saved = savedRaw.filter((s) => {
          const key = s.term.toLowerCase();
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        const withMetrics  = saved.filter((s) =>  s.hasCachedMetrics);
        const needsMetrics = saved.filter((s) => !s.hasCachedMetrics).map((s) => s.term);

        // Set cached keywords immediately — these are complete, no loading state.
        // Keywords without cached metrics go through handleAddKeywords instead of
        // being included here: it's the one that creates their loading placeholder
        // rows, so setting them here too would double them up (handleAddKeywords
        // reads keywords state from its own closure, not this callback's, so it
        // can't tell they were already added a moment ago).
        const starred = getStarred(activeApp?.id ?? activeApp?.store_id ?? "");
        setKeywords(
          withMetrics.map((s) => ({
            term:    s.term,
            volume:  s.volume,
            rank:    s.rank,
            starred: starred.has(s.term.toLowerCase()),
            loading: false,
          }))
        );
        if (needsMetrics.length) handleAddKeywords(needsMetrics);
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeApp?.id, activeApp?.bundle_id, isLocked]);

  async function handleAddKeywords(newTerms: string[]) {
    const existing = new Set(keywords.filter((k) => !k.loading).map((k) => k.term.toLowerCase()));
    const fresh = newTerms.filter((t) => !existing.has(t.toLowerCase()));
    if (!fresh.length) return;
    newTerms = fresh;

    const store   = activeApp?.store ?? "ios";
    const country = activeApp?.country ?? "us";

    setPendingAdds((n) => n + 1);

    // Reserve the keyword(s) server-side before showing anything — this is
    // what actually creates/links the app row, so a plan-limit rejection
    // (e.g. this app can't be tracked because the workspace's app limit is
    // already used) surfaces before a row ever appears, instead of one
    // flashing in with real metrics and then vanishing.
    if (workspaceId) {
      const reserveRes = await fetch("/api/keywords/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          terms:    newTerms,
          workspaceId,
          appId:    activeApp?.id,
          bundleId: activeApp?.bundle_id,
          storeId:  activeApp?.store_id,
          appName:  activeApp?.name,
          iconUrl:  activeApp?.icon_url ?? undefined,
          store,
          country,
        }),
      }).catch(() => null);

      if (reserveRes && !reserveRes.ok) {
        const body: { error?: string } = await reserveRes.json().catch(() => ({}));
        setSaveError(body.error ?? "Couldn't save this keyword.");
        setPendingAdds((n) => n - 1);
        return;
      }
    }

    const starred = getStarred(activeApp?.id ?? activeApp?.store_id ?? "");
    setKeywords((prev) => [
      ...newTerms.map((term) => ({ term, volume: 0, rank: null, starred: starred.has(term.toLowerCase()), loading: true })),
      ...prev,
    ]);

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
    } catch {
      setKeywords((prev) =>
        prev.map((k) => (k.loading && newTerms.includes(k.term) ? { ...k, loading: false } : k))
      );
    } finally {
      setPendingAdds((n) => n - 1);
    }
  }

  // trackedApp identifies which app's rank to record a "checked, not found"
  // marker for when it's absent from a search's results — omitted when the
  // app has no store_id yet (previewed but not fully tracked), matching what
  // "unranked" already means elsewhere in this file (falls back to "").
  const trackedApp = activeApp?.store_id
    ? { id: activeApp.store_id, name: activeApp.name ?? "", icon: activeApp.icon_url ?? "" }
    : undefined;

  async function runLiveSearchInBackground(terms: string[], store: "ios" | "android", country: string) {
    // Spacing between calls is enforced centrally in liveSearch.ts (shared
    // across every caller app-wide), so this just fires them in order.
    for (const term of terms) {
      try {
        await fetchLiveSearchResults(term, store, country, trackedApp);
        // Refresh after each term (not just once at the end) so a keyword
        // that resolves early in a long batch drops off "N unranked"
        // immediately instead of the count sitting frozen until every term
        // in the batch has been attempted.
        setSnapshotsRefreshKey((k) => k + 1);
      } catch (err) {
        console.warn(`Live search failed for "${term}" — rank will stay "Unknown" until retried`, err);
      }
    }
  }

  // Manual escape hatch: forces an immediate retry for everything stuck on
  // "Unknown", bypassing the periodic auto-retry cadence/cap below, for a
  // user who doesn't want to wait for the next automatic pass.
  const [refetchingRanks, setRefetchingRanks] = useState(false);
  const refetchingRanksRef = useRef(refetchingRanks);
  useEffect(() => { refetchingRanksRef.current = refetchingRanks; }, [refetchingRanks]);
  const stuckTerms = useMemo(
    () => keywords.filter((k) => !k.loading && !snapshots[k.term]?.rankLatestDate).map((k) => k.term),
    [keywords, snapshots]
  );
  const stuckTermsRef = useRef(stuckTerms);
  useEffect(() => { stuckTermsRef.current = stuckTerms; }, [stuckTerms]);

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

  useEffect(() => {
    if (!activeApp || !trackedTerms || isLocked) return;
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
  }, [activeApp, trackedTerms, snapshotsRefreshKey, competitors, isLocked]);

  // Keywords with no rank history at all (rankLatestDate null) never got a
  // successful Live Search. Rather than requiring the user to notice "N
  // unranked" and click Refetch, retry those automatically — capped per
  // "<appId>:<term>" pair (autoRetryCountRef) so a genuinely gone/renamed
  // keyword doesn't get hammered forever. Every retry still goes through the
  // same shared rate-limited queue (liveSearch.ts) as the manual button and
  // every other caller, so this adds retries over time rather than extra
  // concurrent load.
  const autoRetryCountRef = useRef<Map<string, number>>(new Map());

  function attemptAutoRetry(appId: string, store: string | null | undefined, country: string | null | undefined) {
    if (refetchingRanksRef.current) return;
    const eligible = stuckTermsRef.current.filter(
      (term) => (autoRetryCountRef.current.get(`${appId}:${term}`) ?? 0) < MAX_AUTO_RETRIES
    );
    if (!eligible.length) return;
    eligible.forEach((term) => {
      const k = `${appId}:${term}`;
      autoRetryCountRef.current.set(k, (autoRetryCountRef.current.get(k) ?? 0) + 1);
    });
    runLiveSearchInBackground(eligible, (store as "ios" | "android" | undefined) ?? "ios", country ?? "us");
  }

  // Fires a retry pass as soon as the real stuck-term set is known (e.g. once
  // performance-snapshots finishes loading) or changes (e.g. shrinks after a
  // successful retry). Reacting to the actual data — instead of a blind
  // fixed-delay timer — avoids racing ahead of the snapshots fetch above and
  // finding nothing to do.
  const stuckKey = stuckTerms.join(",");
  useEffect(() => {
    const key = activeApp?.id ?? activeApp?.bundle_id;
    if (!key || isLocked || !stuckKey) return;
    attemptAutoRetry(activeApp?.id ?? "", activeApp?.store, activeApp?.country);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stuckKey, activeApp?.id, activeApp?.bundle_id, isLocked]);

  // Backstop: if a retry fails, the stuck-term set's *content* doesn't
  // change, so the reactive effect above won't fire again on its own. This
  // periodically re-attempts it for as long as the page stays open, still
  // subject to the same cap.
  useEffect(() => {
    const key = activeApp?.id ?? activeApp?.bundle_id;
    if (!key || isLocked) return;
    const appId   = activeApp?.id ?? "";
    const store   = activeApp?.store;
    const country = activeApp?.country;
    const interval = setInterval(() => attemptAutoRetry(appId, store, country), AUTO_RETRY_INTERVAL_MS);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeApp?.id, activeApp?.bundle_id, activeApp?.store, activeApp?.country, isLocked]);

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
    if (!activeApp || !trackedTerms || !chartApps.length || isLocked) return;
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
  }, [activeApp, trackedTerms, chartApps, isLocked]);

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

  if (isLocked) {
    return (
      <div className="h-full flex flex-col overflow-hidden bg-[#111318]">
        <AppHeader app={activeApp} title="Monitor Performance" />
        <FeatureLocked
          minPlan="free"
          icon={ArrowTrendingUpIcon}
          title="Keyword Performance is a Free feature"
          description="Upgrade to Basic or above to monitor keyword rankings and visibility over time."
          benefits={[
            "Track search volume and rank for every tracked keyword",
            "See your Visibility Score trend across the last 30 days",
            "Compare performance against competitor apps",
          ]}
        />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden bg-[#111318]">
      <AppHeader app={activeApp ?? null} title="Monitor Performance" />

      {saveError && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-red-500/10 border-b border-red-500/20 text-red-400 text-xs">
          <ExclamationTriangleIcon className="size-4 shrink-0" />
          <span className="flex-1"><PlanLimitMessage message={saveError} /></span>
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
              onViewRankHistory={(term, storeId) => setRankHistory({ term, storeId })}
              onRefetchRanks={handleRefetchRanks}
              refetchingRanks={refetchingRanks}
              stuckRankCount={stuckTerms.length}
              translateToggle={translateToggle && !translateLocked}
              translateLocked={translateLocked}
              onTranslateToggle={() => !translateLocked && setTranslateToggle((v) => !v)}
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

      {rankHistory && (
        <RankHistoryPanel
          term={rankHistory.term}
          storeId={rankHistory.storeId}
          store={activeApp.store ?? "ios"}
          country={activeApp.country ?? "us"}
          onClose={() => setRankHistory(null)}
        />
      )}
    </div>
  );
}

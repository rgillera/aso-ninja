"use client";

import { useState, useEffect, useRef } from "react";
import { MagnifyingGlassIcon, ExclamationTriangleIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { AppHeader } from "@/features/aso/AppHeader";
import { useActiveApp } from "@/features/dashboard/ActiveAppContext";
import { useWorkspaceId } from "@/features/dashboard/WorkspaceContext";
import { useNavigationGuard } from "@/features/dashboard/NavigationGuardContext";
import { usePlanSlug } from "@/features/dashboard/PlanContext";
import { isPlanAtLeast } from "@/features/subscription/planTiers";
import { fetchLiveSearchResults } from "@/features/aso/keywords/research/liveSearch";
import { PlanLimitMessage } from "@/features/subscription/PlanLimitMessage";
import { KeywordSuggestionsPanel } from "./KeywordSuggestionsPanel";
import { KeywordTable } from "./KeywordTable";
import { getStarred, toggleStarred, starTerms } from "@/libs/starred-keywords";
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
  const planSlug    = usePlanSlug();
  const translateLocked = !isPlanAtLeast(planSlug, "basic");
  const canUseRelevancy = isPlanAtLeast(planSlug, "pro");
  const [keywords,     setKeywords]     = useState<Keyword[]>([]);
  const [competitors,  setCompetitors]  = useState<CompetitorApp[]>([]);
  const [translateToggle, setTranslateToggle] = useState(false);
  // Counts in-flight adds (fast metrics → full metrics → Supabase save) — used
  // to keep the Add button in a loading state until the keyword is actually
  // persisted, so users don't refresh mid-add and lose it.
  const [pendingAdds, setPendingAdds] = useState(0);
  const [rateLimited, setRateLimited] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const { setGuardMessage } = useNavigationGuard();
  useEffect(() => {
    setGuardMessage(pendingAdds > 0 ? "A keyword is still being added. Leaving now may lose it." : null);
    return () => setGuardMessage(null);
  }, [pendingAdds, setGuardMessage]);

  // Competitors are persisted server-side in app_competitors (not
  // localStorage) so the workspace's plan limit can actually be enforced.
  const competitorsAppId = useRef<string | undefined>(undefined);

  useEffect(() => {
    competitorsAppId.current = undefined;
    const key = activeApp?.id ?? activeApp?.bundle_id;
    if (!key) return;
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
  }, [activeApp?.id, activeApp?.bundle_id]);

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
        // collapse those here so term-keyed UI doesn't choke on duplicates.
        const seen = new Set<string>();
        const saved = savedRaw.filter((s) => {
          const key = s.term.toLowerCase();
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });

        const withMetrics    = saved.filter((s) =>  s.hasCachedMetrics);
        const needsMetrics   = saved.filter((s) => !s.hasCachedMetrics).map((s) => s.term);
        // Rows saved while the workspace was below Pro+ (or added in fast
        // mode) have relevancy permanently null. If the plan now allows it,
        // backfill just those two columns instead of leaving them stuck.
        const needsRelevancy = canUseRelevancy
          ? withMetrics.filter((s) => s.relevancy === null).map((s) => s.term)
          : [];

        // Set cached keywords immediately — these are complete, no loading state
        const starred = getStarred(activeApp?.id ?? activeApp?.store_id ?? "");
        setKeywords(
          withMetrics.map((s) => ({
            keyword:     s.term,
            volume:      s.volume,
            diff:        s.diff,
            chance:      s.chance,
            opportunity: s.opportunity ?? undefined,
            relevancy:   s.relevancy ?? undefined,
            rank:        s.rank,
            starred:     starred.has(s.term.toLowerCase()),
            loading:     false,
            frozen:      s.frozen,
          }))
        );

        // Keywords without cached metrics go through handleAddKeywords so they
        // are fetched fresh. Keeping them separate from the setKeywords above
        // avoids a stale-closure dedup failure where handleAddKeywords read the
        // old keywords state and prepended them a second time.
        if (needsMetrics.length) handleAddKeywords(needsMetrics);
        if (needsRelevancy.length) backfillRelevancy(needsRelevancy);
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeApp?.id, activeApp?.bundle_id]);

  async function handleAddKeywords(newKeywords: string[]) {
    // Deduplicate against all tracked keywords including those still loading —
    // excluding loading ones caused a second prepend row for keywords that were
    // loaded from DB with loading:true and then passed to handleAddKeywords.
    const existing = new Set(keywords.map((k) => k.keyword.toLowerCase()));
    const fresh = newKeywords.filter((kw) => !existing.has(kw.toLowerCase()));
    if (!fresh.length) return;
    newKeywords = fresh;

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
          terms:     newKeywords,
          workspaceId,
          appId:     activeApp?.id,
          bundleId:  activeApp?.bundle_id,
          storeId:   activeApp?.store_id,
          appName:   activeApp?.name,
          iconUrl:   activeApp?.icon_url ?? undefined,
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
      ...newKeywords.map((kw) => ({
        keyword: kw,
        volume: 0, diff: 0, chance: 0, opportunity: 0,
        rank: null, starred: starred.has(kw.toLowerCase()), loading: true,
      })),
      ...prev,
    ]);

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
      ...(workspaceId ? { workspaceId } : {}),
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
      ...(workspaceId ? { workspaceId } : {}),
    });

    try {
      const res  = await fetch(`/api/keywords/metrics?${params}`);
      const data: Record<string, { volume: number; diff: number; chance: number; opportunity: number | null; results: number; relevancy: number | null; rank: number | null }> & { _rateLimited?: boolean; _aiDown?: boolean } = await res.json();
      if (data._rateLimited) setRateLimited(true);

      setKeywords((prev) =>
        prev.map((k) => {
          const m = data[k.keyword];
          return m && newKeywords.includes(k.keyword)
            ? { ...k, ...m, relevancy: m.relevancy ?? undefined, opportunity: m.opportunity ?? undefined, aiDown: data._aiDown }
            : k;
        })
      );

      // Persist keywords + freshly computed metrics to Supabase
      if (workspaceId) {
        const saveRes = await fetch("/api/keywords/save", {
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

        // A non-OK response here means the save was rejected server-side
        // (e.g. this app can't be tracked because the workspace's plan app
        // limit is already used) — the keyword never actually persisted, so
        // pull it back out of the table instead of leaving it showing as
        // successfully added.
        if (!saveRes.ok) {
          const body: { error?: string } = await saveRes.json().catch(() => ({}));
          setSaveError(body.error ?? "Couldn't save this keyword.");
          setKeywords((prev) => prev.filter((k) => !newKeywords.includes(k.keyword)));
          return;
        }
      }
    } catch {
      return;
    }

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

  // Fills in relevancy/opportunity for keywords that already have every other
  // metric cached but were saved while the workspace was below Pro+ (so those
  // two columns came back null). Runs quietly in the background — the row is
  // already fully rendered, so there's no loading state or pendingAdds churn,
  // just the relevancy/opportunity cells swapping from a pending clock icon
  // to their value once this resolves.
  //
  // Chunked and awaited sequentially rather than sent as one request: each
  // term costs a Gemini embedding + LLM call server-side, so a workspace
  // upgrading with a large tracked list would otherwise fire one massive
  // request that either blows past Gemini's rate limit for a long stretch,
  // or blows past a serverless function's execution timeout and backfills
  // nothing at all. Small sequential batches keep each request bounded and
  // let anything else hitting Gemini interleave.
  const RELEVANCY_BACKFILL_BATCH_SIZE = 5;

  async function backfillRelevancy(terms: string[]) {
    const store   = activeApp?.store ?? "ios";
    const country = activeApp?.country ?? "us";

    for (let i = 0; i < terms.length; i += RELEVANCY_BACKFILL_BATCH_SIZE) {
      const batch = terms.slice(i, i + RELEVANCY_BACKFILL_BATCH_SIZE);
      const params = new URLSearchParams({
        terms: batch.join(","),
        store,
        country,
        appName: activeApp?.name ?? "",
        ...(activeApp?.id ? { appId: activeApp.id } : {}),
        ...(workspaceId ? { workspaceId } : {}),
      });

      try {
        const res  = await fetch(`/api/keywords/metrics?${params}`);
        const data: Record<string, { volume: number; diff: number; chance: number; opportunity: number | null; results: number; relevancy: number | null; rank: number | null }> & { _aiDown?: boolean } = await res.json();

        setKeywords((prev) =>
          prev.map((k) => {
            const m = data[k.keyword];
            return m && batch.includes(k.keyword)
              ? { ...k, ...m, relevancy: m.relevancy ?? undefined, opportunity: m.opportunity ?? undefined, aiDown: data._aiDown }
              : k;
          })
        );

        // Persist so the next load doesn't need to recompute these again.
        if (workspaceId) {
          await fetch("/api/keywords/save", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              terms: batch,
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
      } catch {
        // Keep going with the remaining batches even if one fails — a
        // transient Gemini hiccup on one batch shouldn't strand the rest of
        // the workspace's keywords at null forever.
      }
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
    const appId = activeApp?.id ?? activeApp?.store_id ?? "";
    setKeywords((prev) =>
      prev.map((k, i) => {
        if (i !== index) return k;
        const nowStarred = toggleStarred(appId, k.keyword);
        return { ...k, starred: nowStarred };
      })
    );
  }

  function handleStarSelected(terms: string[]) {
    const appId = activeApp?.id ?? activeApp?.store_id ?? "";
    starTerms(appId, terms);
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
        <KeywordSuggestionsPanel
          onAddKeyword={(kw) => handleAddKeywords([kw])}
          onAddKeywords={handleAddKeywords}
          onRemoveKeyword={handleRemoveKeyword}
          activeApp={activeApp}
          trackedKeywords={keywords}
          competitors={competitors}
          onCompetitorsChange={handleCompetitorsChange}
          translateToggle={translateToggle && !translateLocked}
          translateLocked={translateLocked}
          onTranslateToggle={() => !translateLocked && setTranslateToggle((v) => !v)}
        />

        <KeywordTable
          keywords={keywords}
          store={activeApp?.store ?? "ios"}
          country={activeApp?.country ?? "us"}
          translateToggle={translateToggle && !translateLocked}
          translateLocked={translateLocked}
          onTranslateToggle={() => !translateLocked && setTranslateToggle((v) => !v)}
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

"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { MagnifyingGlassIcon, ExclamationTriangleIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { AppHeader } from "@/features/aso/AppHeader";
import { useActiveApp } from "@/features/dashboard/ActiveAppContext";
import { useWorkspaceId } from "@/features/dashboard/WorkspaceContext";
import { useNavigationGuard } from "@/features/dashboard/NavigationGuardContext";
import { usePlanSlug } from "@/features/dashboard/PlanContext";
import { isPlanAtLeast } from "@/features/subscription/planTiers";
import { PlanLimitMessage } from "@/features/subscription/PlanLimitMessage";
import { KeywordSuggestionsPanel } from "./KeywordSuggestionsPanel";
import { KeywordTable } from "./KeywordTable";
import { getStarred, toggleStarred, starTerms } from "@/libs/starred-keywords";
import { TOUR_STEPS, type TourStep } from "@/features/onboarding/tour";
import { useSidebarTour } from "@/features/dashboard/SidebarTourContext";
import type { Keyword, DownloadsConnection } from "./types";
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
  const router      = useRouter();
  const searchParams = useSearchParams();
  const translateLocked = !isPlanAtLeast(planSlug, "free");
  // OnboardingWizard's handleFinish sends first-timers here with ?tip=tour
  // so we can walk them across the page once, right as they land: Keyword
  // Suggestions section → Keyword Table section → how to add a keyword →
  // the Opportunity column → the sidebar (TOUR_STEPS, in that order — no
  // dedicated step for Volume, see the comment on TOUR_STEPS for why).
  // Captured via a lazy initializer (not the searchParams value
  // itself) so each step's own dismiss logic — clicking its X, completing
  // its instruction, clicking elsewhere — isn't fighting a prop that keeps
  // resetting on every render. The effect below strips the param from the
  // URL so a refresh doesn't replay it. State (not the prop) lives here
  // rather than inside any child because the tour has to hand off between
  // three components: KeywordSuggestionsPanel and KeywordTable (this page's
  // own children, reached via props) and DashboardSidebar (a sibling of
  // this page under DashboardShell, reached via SidebarTourContext instead).
  const [tourStep, setTourStep] = useState<TourStep | null>(() =>
    searchParams.get("tip") === "tour" ? TOUR_STEPS[0] : null
  );
  useEffect(() => {
    if (searchParams.get("tip") !== "tour") return;
    const params = new URLSearchParams(searchParams);
    params.delete("tip");
    const qs = params.toString();
    router.replace(qs ? `/dashboard/keywords/research?${qs}` : "/dashboard/keywords/research", { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // "Closing" a step (its own X, an outside click, or completing its
  // instruction) means move on to the next one, not just disappear — that's
  // what makes this a tutorial rather than five unrelated one-off tips.
  function advanceTour() {
    setTourStep((step) => {
      if (!step) return null;
      const next = TOUR_STEPS[TOUR_STEPS.indexOf(step) + 1];
      return next ?? null;
    });
  }

  // Hands the tour's last step off to DashboardSidebar, which isn't a child
  // of this page — see SidebarTourContext. Cleared on unmount/step-change so
  // navigating away mid-tour (or finishing it) doesn't leave the sidebar
  // stuck highlighted, mirroring the setGuardMessage(null) cleanup below.
  const { setSidebarTour } = useSidebarTour();
  useEffect(() => {
    setSidebarTour({ active: tourStep === "sidebar", onAdvance: advanceTour });
    return () => setSidebarTour({ active: false, onAdvance: () => {} });
  }, [tourStep, setSidebarTour]);
  const [keywords,     setKeywords]     = useState<Keyword[]>([]);
  const [downloadsConnection, setDownloadsConnection] = useState<DownloadsConnection | undefined>(undefined);
  const [competitors,  setCompetitors]  = useState<CompetitorApp[]>([]);
  const [translateToggle, setTranslateToggle] = useState(false);
  // Counts in-flight adds (fast metrics → full metrics → Supabase save) — used
  // to keep the Add button in a loading state until the keyword is actually
  // persisted, so users don't refresh mid-add and lose it.
  const [pendingAdds, setPendingAdds] = useState(0);
  const [rateLimited, setRateLimited] = useState(false);
  const [relevancyLimitReached, setRelevancyLimitReached] = useState(false);
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
  }, [activeApp?.id, activeApp?.bundle_id, activeApp?.store, activeApp?.country]);

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
    const appKey = activeApp?.id ?? activeApp?.bundle_id;
    if (!appKey) return;
    // Keyed on store+country too, not just id/bundle_id: a previewed (not yet
    // followed) app keeps the same undefined id and bundle_id when only the
    // country changes, so without this the effect would treat "same app,
    // different country" as no change at all and leave the previous
    // country's keywords sitting in state instead of reloading.
    const key = activeApp?.id ?? `${activeApp?.bundle_id}:${activeApp?.store}:${activeApp?.country}`;
    if (loadedAppId.current === key) return;
    loadedAppId.current = key;
    setKeywords([]);
    setDownloadsConnection(undefined);
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
      .then(({ keywords: savedRaw, downloadsConnection: dc }: { keywords: SavedKeyword[]; downloadsConnection?: DownloadsConnection }) => {
        setDownloadsConnection(dc);
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
        // Rows added in fast mode, or saved before this workspace's relevancy
        // pool existed, have relevancy permanently null — backfill just those
        // two columns instead of leaving them stuck. Every plan has some pool
        // now, so there's no tier to skip this for; the metrics endpoint is
        // the one that actually knows whether the pool is exhausted.
        const needsRelevancy = withMetrics.filter((s) => s.relevancy === null).map((s) => s.term);

        // Set cached keywords immediately — these are complete, no loading state
        const starred = getStarred(activeApp?.id ?? activeApp?.store_id ?? "");
        setKeywords(
          withMetrics.map((s) => ({
            keyword:     s.term,
            volume:      s.volume,
            diff:        s.diff,
            chance:      s.chance,
            opportunity: s.opportunity,
            relevancy:   s.relevancy,
            rank:        s.rank,
            results:     s.results,
            starred:     starred.has(s.term.toLowerCase()),
            loading:     false,
            frozen:      s.frozen,
            estimatedDownloads: s.estimatedDownloads,
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
  }, [activeApp?.id, activeApp?.bundle_id, activeApp?.store, activeApp?.country]);

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
      // Percent-encode each term before joining — a keyword that itself
      // contains a comma (e.g. "10,000 airports") would otherwise be
      // indistinguishable from the between-terms delimiter and get split in
      // two server-side, so it never matches any key in the response and its
      // relevancy cell is stuck showing the "still computing" clock forever.
      terms: newKeywords.map(encodeURIComponent).join(","),
      store,
      country: country ?? "us",
      appName: activeApp?.name ?? "",
      storeId: activeApp?.store_id ?? "",
      fast: "1",
      ...(activeApp?.id ? { appId: activeApp.id } : {}),
      ...(workspaceId ? { workspaceId } : {}),
    });

    try {
      const res  = await fetch(`/api/keywords/metrics?${fastParams}`);
      const data: Record<string, { volume: number; diff: number; chance: number; opportunity: number | null; results: number | null; relevancy: number | null; rank: number | null } | true> & { _rateLimited?: boolean } = await res.json();
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
      // See the matching comment on the phase-1 fast fetch above.
      terms: newKeywords.map(encodeURIComponent).join(","),
      store,
      country,
      appName: activeApp?.name ?? "",
      storeId: activeApp?.store_id ?? "",
      ...(activeApp?.id ? { appId: activeApp.id } : {}),
      ...(workspaceId ? { workspaceId } : {}),
    });

    try {
      const res  = await fetch(`/api/keywords/metrics?${params}`);
      const data: Record<string, { volume: number; diff: number; chance: number; opportunity: number | null; results: number | null; relevancy: number | null; rank: number | null }> & { _rateLimited?: boolean; _aiDown?: boolean; _relevancyLimitReached?: boolean } = await res.json();
      if (data._rateLimited) setRateLimited(true);
      if (data._relevancyLimitReached) setRelevancyLimitReached(true);

      setKeywords((prev) =>
        prev.map((k) => {
          const m = data[k.keyword];
          return m && newKeywords.includes(k.keyword)
            ? { ...k, ...m, relevancy: m.relevancy, opportunity: m.opportunity, aiDown: data._aiDown }
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

    // Both platforms' metrics fetch above already ran its own search and
    // wrote today's keyword_rankings_history on success (fetchIosMetrics /
    // fetchAndroidMetrics), so there's no separate live-search backfill left
    // to do here — firing one would just double the request volume for no
    // new information.
  }

  // Fills in relevancy/opportunity for keywords that already have every other
  // metric cached but were saved while the workspace was below Basic+ (so those
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
        // See the matching comment on the phase-1 fast fetch above.
        terms: batch.map(encodeURIComponent).join(","),
        store,
        country,
        appName: activeApp?.name ?? "",
        storeId: activeApp?.store_id ?? "",
        ...(activeApp?.id ? { appId: activeApp.id } : {}),
        ...(workspaceId ? { workspaceId } : {}),
      });

      try {
        const res  = await fetch(`/api/keywords/metrics?${params}`);
        const data: Record<string, { volume: number; diff: number; chance: number; opportunity: number | null; results: number | null; relevancy: number | null; rank: number | null }> & { _aiDown?: boolean } = await res.json();

        setKeywords((prev) =>
          prev.map((k) => {
            const m = data[k.keyword];
            return m && batch.includes(k.keyword)
              ? { ...k, ...m, relevancy: m.relevancy, opportunity: m.opportunity, aiDown: data._aiDown }
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

  // Live Search's "add as competitor" button saves directly via /api/competitors
  // (it doesn't go through handleCompetitorsChange), so mirror the addition here
  // to keep the Keyword Suggestions competitors section in sync without a reload.
  function handleCompetitorAddedFromLiveSearch(competitor: CompetitorApp) {
    setCompetitors((prev) =>
      prev.some((c) => c.storeId === competitor.storeId) ? prev : [...prev, competitor]
    );
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

      {relevancyLimitReached && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-indigo-500/10 border-b border-indigo-500/20 text-indigo-300 text-xs">
          <ExclamationTriangleIcon className="size-4 shrink-0" />
          <span className="flex-1">
            You&apos;ve used up your plan&apos;s relevancy &amp; opportunity scoring pool. New keywords will still be
            tracked, just without those scores.{" "}
            {isPlanAtLeast(planSlug, "pro_plus") ? (
              <a
                href={process.env.NEXT_PUBLIC_MANAGED_ASO_CALENDLY_URL ?? "mailto:hello@appaso.io"}
                className="underline underline-offset-2 hover:no-underline"
              >
                Contact us for a custom plan
              </a>
            ) : (
              <Link href="/dashboard/subscription" className="underline underline-offset-2 hover:no-underline">
                {planSlug === "free" ? "Upgrade to Basic for a bigger pool"
                  : planSlug === "pro" ? "Upgrade to Pro+ for a bigger pool"
                  : "Upgrade to Pro for a bigger pool"}
              </Link>
            )}
          </span>
          <button onClick={() => setRelevancyLimitReached(false)} className="shrink-0 hover:text-indigo-200">
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
          tourStep={tourStep}
          onAdvanceTour={advanceTour}
        />

        <KeywordTable
          keywords={keywords}
          store={activeApp?.store ?? "ios"}
          country={activeApp?.country ?? "us"}
          downloadsConnection={downloadsConnection}
          translateToggle={translateToggle && !translateLocked}
          translateLocked={translateLocked}
          onTranslateToggle={() => !translateLocked && setTranslateToggle((v) => !v)}
          adding={pendingAdds > 0}
          onAddKeywords={handleAddKeywords}
          onToggleStar={handleToggleStar}
          onStarSelected={handleStarSelected}
          onRemoveSelected={handleRemoveSelected}
          onRemoveKeyword={handleRemoveKeyword}
          onCompetitorAdded={handleCompetitorAddedFromLiveSearch}
          tourStep={tourStep}
          onAdvanceTour={advanceTour}
        />
      </div>
    </div>
  );
}

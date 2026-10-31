"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { MagnifyingGlassIcon, BeakerIcon, ExclamationTriangleIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { AppHeader } from "@/features/aso/AppHeader";
import { useActiveApp, useActiveAppResolving, ActiveAppLoading } from "@/features/dashboard/ActiveAppContext";
import { useWorkspaceId } from "@/features/dashboard/WorkspaceContext";
import { usePlanSlug } from "@/features/dashboard/PlanContext";
import { isPlanAtLeast } from "@/features/subscription/planTiers";
import { FeatureLocked } from "@/features/subscription/FeatureLocked";
import { PlanLimitMessage } from "@/features/subscription/PlanLimitMessage";
import { useDockedInspector, InspectorSplit } from "@/features/aso/keywords/inspector/InspectorSplit";
import { canUseInspector } from "@/features/aso/keywords/inspector/limits";
import type { Keyword, DownloadsConnection } from "@/features/aso/keywords/research/types";
import type { CompetitorApp } from "@/features/aso/keywords/research/ManageCompetitorsModal";
import { MetadataSection } from "@/features/aso/metadata/preview/MetadataFieldCard";
import { SimulatedCoverageTable } from "./SimulatedCoverageTable";
import { keywordCoverage, wastedKeywordFieldWords, COVERAGE_STRENGTH, KEYWORD_FIELD_LIMIT } from "./coverage";
import { getKeywordFieldAction, saveKeywordFieldAction } from "./actions";
import type { SavedKeyword, SimulatorRow } from "./types";

function NoAppSelected() {
  const resolving = useActiveAppResolving();
  if (resolving) return <ActiveAppLoading />;
  return (
    <div className="h-full flex items-center justify-center bg-[#0e0e10] light:bg-[#f7f7f8]">
      <div className="text-center">
        <MagnifyingGlassIcon className="size-10 text-gray-700 light:text-gray-300 mx-auto mb-4" />
        <p className="text-sm font-medium text-gray-400 light:text-gray-600">No apps yet</p>
        <p className="mt-1 text-sm text-gray-600 light:text-gray-400">Use the search bar above to find an app.</p>
      </div>
    </div>
  );
}

// /api/keywords/metrics, keyed by term. `true` marks a term the fast pass
// skipped.
type MetricsMap = Record<string, { volume: number; diff: number; chance: number; opportunity: number | null; results: number | null; relevancy: number | null; rank: number | null } | true>;

export default function KeywordSimulator() {
  const activeApp = useActiveApp();
  const workspaceId = useWorkspaceId();
  const planSlug = usePlanSlug();
  const isLocked = !isPlanAtLeast(planSlug, "pro_plus");

  const [storeSubtitle, setStoreSubtitle] = useState("");
  const [keywords, setKeywords] = useState<SavedKeyword[]>([]);
  const [loadingKeywords, setLoadingKeywords] = useState(true);
  const [downloadsConnection, setDownloadsConnection] = useState<DownloadsConnection | undefined>(undefined);
  const [competitors, setCompetitors] = useState<CompetitorApp[]>([]);
  const [saveError, setSaveError] = useState<string | null>(null);

  // The same side pane as Keyword Research (see InspectorSplit), docked here
  // instead of linking to the Inspector page, since leaving would lose the
  // edited title and subtitle.
  const inspector = useDockedInspector(activeApp, !canUseInspector(planSlug));

  const [hypotheticalTitle, setHypotheticalTitle] = useState("");
  const [hypotheticalSubtitle, setHypotheticalSubtitle] = useState("");
  // iOS only. Apple never publishes the keyword field, so "current" is
  // whatever the user saved for this app (see saveKeywordFieldAction).
  const [savedKeywordField, setSavedKeywordField] = useState("");
  const [hypotheticalKeywordField, setHypotheticalKeywordField] = useState("");
  const [keywordFieldSave, setKeywordFieldSave] = useState<{ status: "idle" | "saving" | "saved" } | { status: "error"; error: string }>({ status: "idle" });

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
    setSavedKeywordField("");
    setHypotheticalKeywordField("");
    setKeywordFieldSave({ status: "idle" });
    setKeywords([]);
    setLoadingKeywords(true);
    setDownloadsConnection(undefined);
    setCompetitors([]);
    setSaveError(null);
    inspector.closeInspector();

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

    if (activeApp?.store === "ios" && activeApp.id) {
      getKeywordFieldAction(activeApp.id)
        .then((value) => {
          setSavedKeywordField(value);
          setHypotheticalKeywordField(value);
        })
        .catch(() => {});
    }

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
      .then((data: { keywords: SavedKeyword[]; downloadsConnection?: DownloadsConnection }) => {
        setKeywords(data.keywords ?? []);
        setDownloadsConnection(data.downloadsConnection);
      })
      .finally(() => setLoadingKeywords(false));

    // For the pane: the Inspector's "Add as competitor" and the Performance
    // tab's visibility chart.
    fetch(`/api/competitors?${kwParams}`)
      .then((r) => r.json())
      .then((data: { competitors: CompetitorApp[] }) => setCompetitors(data.competitors ?? []))
      .catch(() => setCompetitors([]));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeApp?.id, activeApp?.bundle_id, isLocked]);

  // The pane reads Keyword Research's row shape (Performance tab, chance).
  const paneKeywords: Keyword[] = useMemo(() => keywords.map((k) => ({
    keyword: k.term,
    volume: k.volume,
    diff: k.diff,
    chance: k.chance,
    opportunity: k.opportunity,
    relevancy: k.relevancy,
    rank: k.rank,
    results: k.results,
    starred: false,
    frozen: k.frozen,
    estimatedDownloads: k.estimatedDownloads,
  })), [keywords]);
  const trackedTerms = useMemo(() => new Set(keywords.map((k) => k.term.toLowerCase())), [keywords]);

  // Track from the pane (Inspector or Long Tail), in the same steps as
  // Keyword Research: reserve the keywords first, so a plan-limit rejection
  // shows before anything is computed; then fast metrics (no AI relevancy),
  // which put the rows in the table within seconds; then full metrics, saved
  // with the keywords, which fill in relevancy. The full pass can take tens
  // of seconds, which is why the rows don't wait for it.
  async function handleTrack(terms: string[]) {
    const fresh = terms.filter((t) => !trackedTerms.has(t.toLowerCase()));
    if (!fresh.length || !workspaceId || !activeApp) return;
    const store = activeApp.store ?? "ios";
    const country = activeApp.country ?? "us";
    const saveBody = {
      terms: fresh,
      workspaceId,
      appId: activeApp.id,
      bundleId: activeApp.bundle_id,
      storeId: activeApp.store_id,
      appName: activeApp.name,
      iconUrl: activeApp.icon_url ?? undefined,
      store,
      country,
    };
    async function save(metrics?: MetricsMap) {
      const res = await fetch("/api/keywords/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(metrics ? { ...saveBody, metrics } : saveBody),
      }).catch(() => null);
      if (res && !res.ok) {
        const body: { error?: string } = await res.json().catch(() => ({}));
        setSaveError(body.error ?? "Couldn't save this keyword.");
        return false;
      }
      return !!res;
    }
    function fetchMetrics(fast: boolean): Promise<MetricsMap | null> {
      const params = new URLSearchParams({
        // Encoded one by one so a term containing a comma isn't split in two.
        terms: fresh.map(encodeURIComponent).join(","),
        store,
        country,
        appName: activeApp?.name ?? "",
        storeId: activeApp?.store_id ?? "",
        ...(activeApp?.id ? { appId: activeApp.id } : {}),
        workspaceId: workspaceId ?? "",
        ...(fast ? { fast: "1" } : {}),
      });
      return fetch(`/api/keywords/metrics?${params}`).then((r) => r.json()).catch(() => null);
    }
    function applyMetrics(data: MetricsMap | null) {
      setKeywords((prev) => prev.map((k) => {
        const m = fresh.includes(k.term) ? data?.[k.term] : undefined;
        return m && m !== true ? { ...k, ...m, hasCachedMetrics: true } : k;
      }));
    }

    setSaveError(null);
    if (!(await save())) return;

    const fastData = await fetchMetrics(true);
    setKeywords((prev) => [
      ...fresh.map((term): SavedKeyword => ({
        term,
        volume: 0, diff: 0, chance: 0,
        opportunity: null, relevancy: null, rank: null, results: null,
        intentThemeId: null,
        hasCachedMetrics: false,
        estimatedDownloads: null,
        frozen: false,
      })),
      ...prev,
    ]);
    applyMetrics(fastData);

    const fullData = await fetchMetrics(false);
    if (!fullData) return;
    applyMetrics(fullData);
    await save(fullData);
  }

  const originalTitle = activeApp?.name ?? "";
  const isIos = activeApp?.store === "ios";
  const currentKeywordField = isIos ? savedKeywordField : "";
  const simulatedKeywordField = isIos ? hypotheticalKeywordField : "";
  const hasChanges = hypotheticalTitle !== originalTitle || hypotheticalSubtitle !== storeSubtitle || simulatedKeywordField !== currentKeywordField;

  function handleClearAll() {
    setHypotheticalTitle(originalTitle);
    setHypotheticalSubtitle(storeSubtitle);
    setHypotheticalKeywordField(savedKeywordField);
  }

  async function handleSaveKeywordField() {
    if (!activeApp?.id) return;
    const value = hypotheticalKeywordField.trim();
    setKeywordFieldSave({ status: "saving" });
    const res = await saveKeywordFieldAction(activeApp.id, value).catch(() => ({ error: "Couldn't save the keyword field." }));
    if (res.error) {
      setKeywordFieldSave({ status: "error", error: res.error });
      return;
    }
    setSavedKeywordField(value);
    setHypotheticalKeywordField(value);
    setKeywordFieldSave({ status: "saved" });
  }

  const wastedWords = useMemo(
    () => (isIos ? wastedKeywordFieldWords(hypotheticalKeywordField, hypotheticalTitle, hypotheticalSubtitle) : []),
    [isIos, hypotheticalKeywordField, hypotheticalTitle, hypotheticalSubtitle],
  );

  // Pure text matching against the current vs. edited fields, so it updates
  // live as the user types: no store search, no AI, no scoring pool.
  const rows: SimulatorRow[] = useMemo(() => keywords.map((k) => ({
    term: k.term,
    volume: k.volume,
    rank: k.rank,
    relevancy: k.relevancy,
    currentCoverage: keywordCoverage(k.term, originalTitle, storeSubtitle, currentKeywordField),
    simulatedCoverage: keywordCoverage(k.term, hypotheticalTitle, hypotheticalSubtitle, simulatedKeywordField),
  })), [keywords, originalTitle, storeSubtitle, hypotheticalTitle, hypotheticalSubtitle, currentKeywordField, simulatedKeywordField]);

  const summary = useMemo(() => {
    let stronger = 0, weaker = 0;
    for (const r of rows) {
      const delta = COVERAGE_STRENGTH[r.simulatedCoverage] - COVERAGE_STRENGTH[r.currentCoverage];
      if (delta > 0) stronger++;
      else if (delta < 0) weaker++;
    }
    return { stronger, weaker };
  }, [rows]);

  if (isLocked) {
    return (
      <div className="h-full flex flex-col overflow-hidden bg-[#0e0e10] light:bg-[#f7f7f8]">
        <AppHeader app={activeApp ?? null} title="Keyword Simulator" />
        <FeatureLocked
          minPlan="pro_plus"
          icon={BeakerIcon}
          title="Keyword Simulator is a Pro+ feature"
          description="Upgrade to Pro+ or above to preview which of your tracked keywords a title or subtitle change would add to or drop from your listing, before you publish it."
          benefits={[
            "Try a new title & subtitle against your already-tracked keywords",
            "See which keywords you'd gain or lose, next to their volume, rank and relevancy",
          ]}
        />
      </div>
    );
  }

  if (!activeApp) {
    return <NoAppSelected />;
  }

  const subtitleLabel = activeApp.store === "android" ? "Short Description" : "Subtitle";
  const limits = activeApp.store === "android"
    ? { title: 30, subtitle: 80 }
    : { title: 30, subtitle: 30 };

  return (
    <div className="h-full flex flex-col overflow-hidden bg-[#0e0e10] light:bg-[#f7f7f8]">
      <AppHeader app={activeApp} title="Keyword Simulator" />

      <InspectorSplit
        inspector={inspector}
        trackedTerms={trackedTerms}
        onTrack={handleTrack}
        app={activeApp}
        keywords={paneKeywords}
        downloadsConnection={downloadsConnection}
        competitors={competitors}
        onCompetitorAdded={(competitor) => setCompetitors((prev) => prev.some((c) => c.storeId === competitor.storeId) ? prev : [...prev, competitor])}
        tourStep={null}
        onAdvanceTour={() => {}}
      >
        <div className="flex flex-1 min-w-0 flex-col overflow-y-auto lg:flex-row lg:overflow-hidden">
          {/* Left: hypothetical title/subtitle. Hidden while the pane is docked
              beside the table on screens that can't fit all three; the edits
              are kept, and closing the pane brings it back. */}
          <div className={`flex flex-col lg:w-[380px] lg:shrink-0 lg:overflow-y-auto lg:border-r lg:border-white/[0.07] light:border-black/[0.08] ${inspector.open ? "xl:hidden" : ""}`}>
            <div className="shrink-0 flex items-center justify-between px-6 py-3.5 border-b border-white/[0.07] light:border-black/[0.08] bg-[#0e0e10] light:bg-[#f7f7f8]">
              <p className="text-sm font-medium text-white light:text-gray-900">{isIos ? "Try new metadata" : <>Try a new title &amp; subtitle</>}</p>
              <button onClick={handleClearAll} className="text-xs text-gray-500 hover:text-gray-300 light:hover:text-gray-700 transition-colors">Clear all</button>
            </div>
            <div className="flex-1 p-6 space-y-4 bg-[#0e0e10] light:bg-[#f7f7f8]">
              <MetadataSection
                title="App Name"
                value={hypotheticalTitle}
                limit={limits.title}
                placeholder="Enter app name…"
                originalValue={originalTitle}
                onChange={setHypotheticalTitle}
              />
              <MetadataSection
                title={activeApp.store === "android" ? subtitleLabel : "App Subtitle"}
                value={hypotheticalSubtitle}
                limit={limits.subtitle}
                placeholder={activeApp.store === "android" ? "Enter short description…" : "Enter subtitle…"}
                rows={activeApp.store === "android" ? 3 : 2}
                originalValue={storeSubtitle}
                onChange={setHypotheticalSubtitle}
              />
              {isIos && (
                <div className="space-y-2">
                  <MetadataSection
                    title="Keyword Field"
                    value={hypotheticalKeywordField}
                    limit={KEYWORD_FIELD_LIMIT}
                    placeholder="keywords,separated,by,commas"
                    rows={3}
                    originalValue={savedKeywordField}
                    onChange={(value) => {
                      setHypotheticalKeywordField(value);
                      if (keywordFieldSave.status !== "saving") setKeywordFieldSave({ status: "idle" });
                    }}
                  />
                  {!savedKeywordField && (
                    <p className="text-xs text-gray-500">
                      Apple keeps this field private, so we can&rsquo;t read it. Paste your live one and save it, and &ldquo;Now&rdquo; will count it too.
                    </p>
                  )}
                  {wastedWords.length > 0 && (
                    <p className="text-xs text-amber-400 light:text-amber-600">
                      Already in your title or subtitle: {wastedWords.join(", ")}. Apple counts each word once, so you can drop these and use the characters for new words.
                    </p>
                  )}
                  {/,\s/.test(hypotheticalKeywordField) && (
                    <p className="text-xs text-amber-400 light:text-amber-600">
                      Leave out spaces after commas. They count toward the {KEYWORD_FIELD_LIMIT} characters.
                    </p>
                  )}
                  {activeApp.id ? (
                    hypotheticalKeywordField.trim() !== savedKeywordField && hypotheticalKeywordField.length <= KEYWORD_FIELD_LIMIT ? (
                      <button
                        onClick={handleSaveKeywordField}
                        disabled={keywordFieldSave.status === "saving"}
                        className="rounded-lg px-3 py-1.5 text-xs font-medium bg-indigo-500/15 light:bg-indigo-50 text-indigo-300 light:text-indigo-700 hover:bg-indigo-500/25 light:hover:bg-indigo-100 disabled:opacity-50 transition-colors"
                      >
                        {keywordFieldSave.status === "saving" ? "Saving…" : "Save as my live keyword field"}
                      </button>
                    ) : keywordFieldSave.status === "saved" ? (
                      <p className="text-xs text-green-400 light:text-green-600">Saved as your live keyword field.</p>
                    ) : null
                  ) : (
                    <p className="text-xs text-gray-500">Follow this app to save its keyword field.</p>
                  )}
                  {keywordFieldSave.status === "error" && (
                    <p className="text-xs text-red-400 light:text-red-600">{keywordFieldSave.error}</p>
                  )}
                </div>
              )}
              <p className="text-xs text-gray-600 light:text-gray-400">
                {isIos
                  ? <>Edit the title, {subtitleLabel.toLowerCase()} or keyword field to see which tracked keywords you&rsquo;d gain or lose. The store ranks you on the words in these fields, and the title counts most. Only the keyword field is saved, and only when you save it. Nothing is published.</>
                  : <>Edit the title or {subtitleLabel.toLowerCase()} to see which tracked keywords you&rsquo;d gain or lose. The store ranks you on the words in these fields, and the title counts most. Nothing here is saved or published.</>}
              </p>
            </div>
          </div>

          {/* Right: comparison table */}
          <div className="flex flex-col flex-1 min-w-0 lg:overflow-y-auto">
            {saveError && (
              <div className="flex items-center gap-2 px-4 py-2.5 bg-red-500/10 border-b border-red-500/20 text-red-400 light:text-red-600 text-xs">
                <ExclamationTriangleIcon className="size-4 shrink-0" />
                <span className="flex-1"><PlanLimitMessage message={saveError} /></span>
                <button onClick={() => setSaveError(null)} className="shrink-0 hover:text-red-300">
                  <XMarkIcon className="size-4" />
                </button>
              </div>
            )}
            {hasChanges && (summary.stronger > 0 || summary.weaker > 0) && (
              <div className="flex items-center gap-4 px-6 pt-6 text-sm">
                {summary.stronger > 0 && <span className="text-green-400 light:text-green-600">{summary.stronger} keyword{summary.stronger !== 1 ? "s" : ""} stronger</span>}
                {summary.weaker > 0 && <span className="text-red-400 light:text-red-600">{summary.weaker} keyword{summary.weaker !== 1 ? "s" : ""} weaker</span>}
              </div>
            )}
            <div className="p-6">
              <div className="rounded-2xl bg-[#141417] light:bg-white overflow-hidden ring-1 ring-white/[0.06] light:ring-gray-950/[0.07] light:shadow-sm">
                {loadingKeywords
                  ? <p className="px-5 py-8 text-center text-sm text-gray-600 light:text-gray-400">Loading tracked keywords…</p>
                  : <SimulatedCoverageTable rows={rows} subtitleLabel={subtitleLabel} hasKeywordField={isIos} onInspect={inspector.selectKeyword} inspectedKeyword={inspector.inspectedKeyword} />}
              </div>
            </div>
          </div>
        </div>
      </InspectorSplit>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { ExclamationTriangleIcon, XMarkIcon } from "@heroicons/react/24/outline";
import type { App, Workspace, StoreData, CategoryBenchmark } from "@/libs/contracts";
import { daysSince } from "@/libs/store/benchmark-utils";
import { AppHeader } from "@/features/aso/AppHeader";
import { ReportAsoScore, type CompetitorColumn, type ScoreTag } from "./ReportAsoScore";
import { computeAsoScoreSummary } from "./asoScore";
import { ReportSuggestions } from "./ReportSuggestions";
import { ReportMetadataComparison } from "./ReportMetadataComparison";
import { ManageCompetitorsModal, type CompetitorApp } from "@/features/aso/keywords/research/ManageCompetitorsModal";
import { PlanLimitMessage } from "@/features/subscription/PlanLimitMessage";

type KeywordMetric = { term: string; volume: number; diff: number; chance: number };

type CompetitorWithScore = CompetitorApp & {
  overallPercent: number;
  categoryPercents: number[];
  categoryTags: ScoreTag[][];
  title: string;
  subtitle: string;
  description: string;
  releaseNotes: string;
  screenshotUrls: string[];
  screenshotCount: number;
  hasPreviewVideo: boolean;
  rating?: number;
  ratingCount?: number;
  daysSinceUpdate?: number;
  languageCount?: number;
};

type Props = {
  app: App;
  allApps: App[];
  workspaces?: Workspace[];
  storeData: StoreData;
  benchmark?: CategoryBenchmark;
  keywordMetrics?: KeywordMetric[];
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ReportPage({ app, storeData, benchmark = null, keywordMetrics = [] }: Props) {
  const [competitors, setCompetitors] = useState<CompetitorWithScore[]>([]);
  const [showCompetitorModal, setShowCompetitorModal] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  // "__preview__" is a synthetic id for an app that isn't tracked/persisted
  // yet (see app/dashboard/preview/page.tsx) — it isn't a real row, so it
  // can't be used as a uuid FK. Adding a competitor to an unpersisted app
  // upserts the app row server-side and returns its real id, which we then
  // remember here for subsequent requests.
  const resolvedAppId = useRef<string | undefined>(app.id !== "__preview__" ? app.id : undefined);

  function fetchCompetitors() {
    if (!resolvedAppId.current) { setCompetitors([]); return; }
    fetch(`/api/competitors?appId=${resolvedAppId.current}`)
      .then((r) => r.json())
      .then((data: { competitors?: CompetitorWithScore[] }) => setCompetitors(data.competitors ?? []))
      .catch(() => setCompetitors([]));
  }

  useEffect(() => {
    resolvedAppId.current = app.id !== "__preview__" ? app.id : undefined;
    fetchCompetitors();
  }, [app.id]);

  async function handleCompetitorsChange(updated: CompetitorApp[]) {
    const previous = competitors;
    setSaveError(null);
    const optimistic: CompetitorWithScore[] = updated.map((u) => {
      const existing = previous.find((p) => p.storeId === u.storeId);
      return existing ?? {
        ...u,
        overallPercent: 0,
        categoryPercents: [0, 0, 0],
        categoryTags: [[], [], []],
        title: u.name,
        subtitle: "",
        description: "",
        releaseNotes: "",
        screenshotUrls: [],
        screenshotCount: 0,
        hasPreviewVideo: false,
      };
    });
    setCompetitors(optimistic);

    const additions = updated.filter((u) => !previous.some((p) => p.storeId === u.storeId));
    const removals = previous.filter((p) => !updated.some((u) => u.storeId === p.storeId));

    if (resolvedAppId.current) {
      await Promise.all(
        removals.map((removed) =>
          fetch("/api/competitors", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ appId: resolvedAppId.current, storeId: removed.storeId }),
          }).catch(() => {})
        )
      );
    }

    // Sequential, not Promise.all: the DB enforces a per-plan competitor
    // limit by counting existing rows at insert time, so firing these in
    // parallel could let several additions race past the check at once.
    for (const added of additions) {
      const res = await fetch("/api/competitors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId: app.workspace_id,
          appId: resolvedAppId.current,
          bundleId: app.bundle_id,
          storeId: app.store_id,
          appName: app.name,
          iconUrl: app.icon_url ?? undefined,
          store: app.store,
          country: app.country,
          competitor: added,
        }),
      }).catch(() => null);

      if (!res || !res.ok) {
        const body: { error?: string } = res ? await res.json().catch(() => ({})) : {};
        setSaveError(body.error ?? "Couldn't add this competitor.");
        setCompetitors((prev) => prev.filter((c) => c.storeId !== added.storeId));
        continue;
      }

      const data: { appId: string } = await res.json();
      resolvedAppId.current = data.appId;
    }

    // Re-fetch so successfully added competitors get their real computed
    // score instead of the 0% placeholder set above.
    fetchCompetitors();
  }

  async function handleRemoveCompetitor(storeId: string) {
    setSaveError(null);
    const previous = competitors;
    setCompetitors((prev) => prev.filter((c) => c.storeId !== storeId));

    if (!resolvedAppId.current) return;

    const res = await fetch("/api/competitors", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ appId: resolvedAppId.current, storeId }),
    }).catch(() => null);

    if (!res || !res.ok) {
      setSaveError("Couldn't remove this competitor.");
      setCompetitors(previous);
    }
  }

  const scoreSummaryItems = computeAsoScoreSummary(storeData, app.name, benchmark, app.store === "ios");
  const appScore = Math.round(scoreSummaryItems.reduce((sum, item) => sum + item.percent, 0) / scoreSummaryItems.length);
  const competitorColumns: CompetitorColumn[] = competitors.map((c) => ({
    key: c.storeId,
    name: c.name,
    iconUrl: c.icon || null,
    overallPercent: c.overallPercent,
    categoryPercents: c.categoryPercents,
    categoryTags: c.categoryTags,
  }));
  const topKeyword = [...keywordMetrics].sort((a, b) => b.volume - a.volume || b.chance - a.chance)[0];
  const suggestions = topKeyword
    ? [
        {
          title: `Lead with ${topKeyword.term}`,
          description: `Use ${topKeyword.term} in the title and subtitle to capture more of the demand behind this keyword.`,
        },
        {
          title: "Strengthen your app description",
          description: "Add a more natural, benefit-led description that matches the highest-opportunity terms you are tracking.",
        },
        {
          title: "Refresh creative assets",
          description: "Pair stronger metadata with updated screenshots and preview text to improve conversion from relevant traffic.",
        },
      ]
    : [
        {
          title: "Start tracking keywords",
          description: "Add target terms to unlock more precise ASO recommendations and visibility insights.",
        },
      ];

  return (
    <main className="h-full overflow-y-auto bg-[#111318]">
      <AppHeader app={app} title="ASO Report" />

      {saveError && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-red-500/10 border-b border-red-500/20 text-red-400 text-xs">
          <ExclamationTriangleIcon className="size-4 shrink-0" />
          <span className="flex-1"><PlanLimitMessage message={saveError} /></span>
          <button onClick={() => setSaveError(null)} className="shrink-0 hover:text-red-300">
            <XMarkIcon className="size-4" />
          </button>
        </div>
      )}

      <div className="p-6 space-y-5">
        <div className="space-y-5">
          <ReportAsoScore
            score={appScore}
            summaryItems={scoreSummaryItems}
            primaryApp={{ name: app.name, iconUrl: app.icon_url }}
            competitors={competitorColumns}
            onAddCompetitor={() => setShowCompetitorModal(true)}
            onRemoveCompetitor={handleRemoveCompetitor}
          />
        </div>

        <ReportSuggestions suggestions={suggestions} />

        <ReportMetadataComparison
          primaryApp={{
            name: app.name,
            iconUrl: app.icon_url,
            title: storeData?.name || app.name,
            subtitle: storeData?.subtitle ?? "",
            description: storeData?.description ?? "",
            releaseNotes: storeData?.releaseNotes ?? "",
            screenshotUrls: storeData?.screenshotUrls ?? [],
            screenshotCount: storeData?.screenshotUrls.length ?? 0,
            hasPreviewVideo: !!storeData?.hasPreviewVideo,
            rating: storeData?.rating,
            ratingCount: storeData?.ratingCount,
            daysSinceUpdate: daysSince(storeData?.lastUpdatedAt),
            languageCount: storeData?.languageCount,
          }}
          competitors={competitors.map((c) => ({
            key: c.storeId,
            name: c.name,
            iconUrl: c.icon || null,
            title: c.title,
            subtitle: c.subtitle,
            description: c.description,
            releaseNotes: c.releaseNotes,
            screenshotUrls: c.screenshotUrls,
            screenshotCount: c.screenshotCount,
            hasPreviewVideo: c.hasPreviewVideo,
            rating: c.rating,
            ratingCount: c.ratingCount,
            daysSinceUpdate: c.daysSinceUpdate,
            languageCount: c.languageCount,
          }))}
          isIos={app.store === "ios"}
          nameLimit={30}
          subtitleLimit={app.store === "ios" ? 30 : 80}
          onRemoveCompetitor={handleRemoveCompetitor}
        />
      </div>

      {showCompetitorModal && (
        <ManageCompetitorsModal
          activeApp={{
            id: app.id,
            bundle_id: app.bundle_id,
            store_id: app.store_id,
            name: app.name,
            icon_url: app.icon_url,
            store: app.store,
            country: app.country,
          }}
          selected={competitors}
          onSave={handleCompetitorsChange}
          onClose={() => setShowCompetitorModal(false)}
        />
      )}
    </main>
  );
}

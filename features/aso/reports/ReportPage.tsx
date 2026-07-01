"use client";

import { KeyIcon } from "@heroicons/react/24/outline";
import type { App, Workspace, StoreData } from "@/libs/contracts";
import { AppHeader } from "@/features/aso/AppHeader";
import { ReportAsoScore, type ScoreSummaryItem } from "./ReportAsoScore";
import { ReportVisibilityScore } from "./ReportVisibilityScore";
import { ReportSuggestions } from "./ReportSuggestions";

type KeywordMetric = { term: string; volume: number; diff: number; chance: number };

type Props = {
  app: App;
  allApps: App[];
  workspaces?: Workspace[];
  storeData: StoreData;
  trackedKeywords?: string[];
  keywordMetrics?: KeywordMetric[];
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ReportPage({ app, storeData: _storeData, trackedKeywords = [], keywordMetrics = [] }: Props) {
  // Visibility score: average keyword opportunity (volume × chance / 100) across tracked keywords.
  // Pure estimate — no rank history needed.
  const visibilityScore = keywordMetrics.length
    ? Math.round(keywordMetrics.reduce((sum, kw) => sum + (kw.volume * kw.chance) / 100, 0) / keywordMetrics.length)
    : null;

  const topKeyword = [...keywordMetrics].sort((a, b) => b.volume - a.volume || b.chance - a.chance)[0];
  const scoreSummaryItems: ScoreSummaryItem[] = [
    {
      label: "App Texts",
      percent: 100,
      tags: [
        { label: "Name", tone: "emerald" },
        { label: "Subtitle", tone: "emerald" },
        { label: "Promotional Text", tone: "amber" },
        { label: "Description", tone: "emerald" },
      ],
    },
    {
      label: "App Visuals",
      percent: 64,
      tags: [
        { label: "Screenshots", tone: "emerald" },
        { label: "Preview Video", tone: "rose" },
      ],
    },
    {
      label: "App Details",
      percent: 100,
      tags: [
        { label: "Size", tone: "emerald" },
        { label: "Apple Watch", tone: "rose" },
        { label: "Reviews and Ratings", tone: "emerald" },
        { label: "Versions", tone: "emerald" },
      ],
    },
  ];
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

      <div className="p-6 space-y-5">
        <div className="space-y-5">
          <ReportAsoScore score={visibilityScore ?? 0} summaryItems={scoreSummaryItems} />

          {trackedKeywords.length === 0 || visibilityScore === null ? (
            <div className="rounded-3xl bg-[#1a1d24] ring-1 ring-white/[0.08] overflow-hidden shadow-lg shadow-black/20">
              <div className="flex flex-col items-center justify-center gap-2 px-5 py-10 text-center">
                <KeyIcon className="size-8 text-gray-700" />
                <p className="text-sm font-medium text-gray-400">No tracked keywords yet</p>
                <p className="max-w-xs text-xs text-gray-600">Add keywords in Keyword Research or Keyword Performance to start tracking your visibility score.</p>
              </div>
            </div>
          ) : (
            <ReportVisibilityScore score={visibilityScore} />
          )}
        </div>

        <ReportSuggestions suggestions={suggestions} />
      </div>
    </main>
  );
}

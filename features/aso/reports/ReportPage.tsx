"use client";

import type { App, Workspace, StoreData } from "@/libs/contracts";
import { AppHeader } from "@/features/aso/AppHeader";
import { ReportAsoScore, type ScoreSummaryItem } from "./ReportAsoScore";
import { ReportSuggestions } from "./ReportSuggestions";

type KeywordMetric = { term: string; volume: number; diff: number; chance: number };

type Props = {
  app: App;
  allApps: App[];
  workspaces?: Workspace[];
  storeData: StoreData;
  keywordMetrics?: KeywordMetric[];
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ReportPage({ app, storeData: _storeData, keywordMetrics = [] }: Props) {
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
  const appScore = Math.round(scoreSummaryItems.reduce((sum, item) => sum + item.percent, 0) / scoreSummaryItems.length);
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

      <div className="p-6 space-y-5">
        <div className="space-y-5">
          <ReportAsoScore score={appScore} summaryItems={scoreSummaryItems} />
        </div>

        <ReportSuggestions suggestions={suggestions} />
      </div>
    </main>
  );
}

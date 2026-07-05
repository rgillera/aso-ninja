"use client";

import { Fragment, useState } from "react";
import { InformationCircleIcon, PlusIcon, ChevronRightIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { TAG_ANCHOR } from "./asoScore";

export type ScoreTag = { label: string; tone: "emerald" | "amber" | "rose" };
export type ScoreSummaryItem = { label: string; percent: number; tags: ScoreTag[] };

export type CompetitorColumn = {
  key: string;
  name: string;
  iconUrl: string | null;
  overallPercent: number;
  categoryPercents: number[];
  categoryTags: ScoreTag[][];
};

type Tone = "emerald" | "amber" | "rose";

const DOT_CLASS: Record<Tone, string> = {
  emerald: "bg-emerald-500",
  amber: "bg-amber-500",
  rose: "bg-rose-500",
};

function toneForPercent(percent: number): Tone {
  return percent >= 80 ? "emerald" : percent >= 60 ? "amber" : "rose";
}

function AppIconCell({ name, iconUrl, onRemove }: { name: string; iconUrl: string | null; onRemove?: () => void }) {
  return (
    <div className="group relative">
      {iconUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={iconUrl} alt={name} title={name} className="size-9 rounded-xl ring-1 ring-white/[0.08]" />
      ) : (
        <div
          title={name}
          className="flex size-9 items-center justify-center rounded-xl bg-white/[0.06] text-[11px] font-semibold text-gray-400 ring-1 ring-white/[0.08]"
        >
          {name.slice(0, 1).toUpperCase()}
        </div>
      )}
      {onRemove && (
        <button
          onClick={onRemove}
          title={`Remove ${name}`}
          className="absolute -top-1.5 -right-1.5 flex size-4 items-center justify-center rounded-full bg-rose-500 text-white opacity-0 shadow ring-1 ring-[#1a1d24] transition-opacity group-hover:opacity-100"
        >
          <XMarkIcon className="size-2.5" />
        </button>
      )}
    </div>
  );
}

type ReportAsoScoreProps = {
  score: number;
  summaryItems: ScoreSummaryItem[];
  primaryApp: { name: string; iconUrl: string | null };
  competitors: CompetitorColumn[];
  onAddCompetitor: () => void;
  onRemoveCompetitor: (key: string) => void;
};

export function ReportAsoScore({ score, summaryItems, primaryApp, competitors, onAddCompetitor, onRemoveCompetitor }: ReportAsoScoreProps) {
  const [expanded, setExpanded] = useState<string | null>(null);

  const columns = [
    {
      key: "primary",
      name: primaryApp.name,
      iconUrl: primaryApp.iconUrl,
      overallPercent: score,
      categoryPercents: summaryItems.map((i) => i.percent),
      categoryTags: summaryItems.map((i) => i.tags),
    },
    ...competitors,
  ];

  function scrollToAnchor(anchor: string | undefined) {
    if (!anchor) return;
    document.getElementById(anchor)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="rounded-3xl bg-[#1a1d24] ring-1 ring-white/[0.08] overflow-hidden shadow-lg shadow-black/20">
      <div className="flex items-center gap-2 border-b border-white/[0.07] px-5 py-3">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.24em] text-gray-500">Summary</h3>
        <InformationCircleIcon className="size-3.5 text-gray-600" />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="w-40" />
              {columns.map((col) => (
                <th key={col.key} className="px-4 py-4">
                  <div className="flex justify-center">
                    <AppIconCell
                      name={col.name}
                      iconUrl={col.iconUrl}
                      onRemove={col.key === "primary" ? undefined : () => onRemoveCompetitor(col.key)}
                    />
                  </div>
                </th>
              ))}
              <th className="px-4 py-4">
                <button
                  onClick={onAddCompetitor}
                  title="Add competitor"
                  className="flex size-9 items-center justify-center rounded-xl border border-dashed border-white/20 text-gray-500 transition-colors hover:border-white/40 hover:text-white"
                >
                  <PlusIcon className="size-4" />
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-white/[0.06]">
              <td className="px-5 py-3">
                <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-400">
                  ASO Score
                 
                </span>
              </td>
              {columns.map((col) => (
                <td key={col.key} className="px-4 py-3 text-center text-sm font-semibold text-white">
                  {col.overallPercent}%
                </td>
              ))}
              <td />
            </tr>
            {summaryItems.map((item, idx) => (
              <Fragment key={item.label}>
                <tr
                  role="button"
                  tabIndex={0}
                  onClick={() => setExpanded(expanded === item.label ? null : item.label)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setExpanded(expanded === item.label ? null : item.label); } }}
                  className="cursor-pointer border-t border-white/[0.06] transition-colors hover:bg-white/[0.03]"
                >
                  <td className="px-5 py-3">
                    <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-400">
                      {item.label}
                      <ChevronRightIcon className={`size-3.5 text-gray-600 transition-transform ${expanded === item.label ? "rotate-90" : ""}`} />
                    </span>
                  </td>
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3">
                      <div className="flex justify-center">
                        <span className={`size-3 rounded-full ${DOT_CLASS[toneForPercent(col.categoryPercents[idx] ?? 0)]}`} />
                      </div>
                    </td>
                  ))}
                  <td />
                </tr>
                {expanded === item.label && item.tags.map((tag, tagIdx) => {
                  const anchor = TAG_ANCHOR[tag.label];
                  return (
                    <tr key={tag.label} className="border-t border-white/[0.04] bg-[#14171d]">
                      <td className="whitespace-nowrap py-2.5 pl-9 pr-5">
                        {anchor ? (
                          <button
                            onClick={() => scrollToAnchor(anchor)}
                            className="text-xs font-medium text-gray-400 underline decoration-gray-600 underline-offset-2 transition-colors hover:text-white"
                          >
                            {tag.label}
                          </button>
                        ) : (
                          <span className="text-xs font-medium text-gray-400">{tag.label}</span>
                        )}
                      </td>
                      {columns.map((col) => (
                        <td key={col.key} className="px-4 py-2.5">
                          <div className="flex justify-center">
                            <span className={`size-3 rounded-full ${DOT_CLASS[col.key === "primary" ? tag.tone : col.categoryTags[idx]?.[tagIdx]?.tone ?? "rose"]}`} />
                          </div>
                        </td>
                      ))}
                      <td />
                    </tr>
                  );
                })}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

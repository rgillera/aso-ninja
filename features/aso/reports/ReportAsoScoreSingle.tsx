"use client";

import { InformationCircleIcon, PlusIcon } from "@heroicons/react/24/outline";
import { TAG_ANCHOR } from "./asoScore";
import type { ScoreSummaryItem } from "./ReportAsoScore";

type Tone = "emerald" | "amber" | "rose";

const RING_COLOR: Record<Tone, string> = {
  emerald: "#34d399",
  amber: "#f59e0b",
  rose: "#f87171",
};

const DOT_CLASS: Record<Tone, string> = {
  emerald: "bg-emerald-400",
  amber: "bg-amber-400",
  rose: "bg-rose-400",
};

const BAR_CLASS: Record<Tone, string> = {
  emerald: "bg-emerald-500",
  amber: "bg-amber-500",
  rose: "bg-rose-500",
};

function toneForPercent(percent: number): Tone {
  return percent >= 80 ? "emerald" : percent >= 60 ? "amber" : "rose";
}

function scrollToAnchor(anchor: string | undefined) {
  if (!anchor) return;
  document.getElementById(anchor)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function ScoreRing({ score }: { score: number }) {
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const tone = toneForPercent(score);
  return (
    <div className="flex flex-col items-center justify-center gap-2.5">
      <div className="relative size-32 shrink-0">
        <svg viewBox="0 0 120 120" className="size-32 -rotate-90">
          <circle cx="60" cy="60" r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10" />
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke={RING_COLOR[tone]}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - score / 100)}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center text-4xl font-bold text-white">{score}</div>
      </div>
      <span className="flex items-center gap-1.5 text-sm text-gray-400">
        ASO Score
        <InformationCircleIcon className="size-3.5 text-gray-600" />
      </span>
    </div>
  );
}

function CategoryRow({ item }: { item: ScoreSummaryItem }) {
  const tone = toneForPercent(item.percent);
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
      <div className="rounded-2xl bg-[#14171d] px-4 py-3 ring-1 ring-white/[0.06] lg:w-56 lg:shrink-0">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-gray-400">{item.label}</p>
        <div className="flex items-center gap-3">
          <div className="h-1.5 flex-1 rounded-full bg-white/[0.08]">
            <div className={`h-1.5 rounded-full ${BAR_CLASS[tone]}`} style={{ width: `${item.percent}%` }} />
          </div>
          <span className="text-sm font-semibold text-white">{item.percent}%</span>
        </div>
      </div>
      <div className="flex flex-1 flex-wrap gap-2">
        {item.tags.map((tag) => {
          const anchor = TAG_ANCHOR[tag.label];
          return (
            <button
              key={tag.label}
              onClick={() => scrollToAnchor(anchor)}
              disabled={!anchor}
              className="flex items-center gap-2 rounded-xl bg-[#14171d] px-3.5 py-2.5 text-sm text-gray-200 ring-1 ring-white/[0.06] transition-colors enabled:hover:text-white enabled:hover:ring-white/20"
            >
              <span className={`size-2.5 rounded-full ${DOT_CLASS[tag.tone]}`} />
              {tag.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

type ReportAsoScoreSingleProps = {
  score: number;
  summaryItems: ScoreSummaryItem[];
  onAddCompetitor: () => void;
};

// Shown instead of ReportAsoScore's comparison table while no competitor has
// been added yet — a table with one column of dots is a lot of chrome for a
// single app, so this leads with a bigger, more scannable score + per-metric
// breakdown. Switches to the table automatically once a competitor exists
// (see ReportPage), since that's the point where a table actually earns its
// keep.
export function ReportAsoScoreSingle({ score, summaryItems, onAddCompetitor }: ReportAsoScoreSingleProps) {
  return (
    <div className="rounded-3xl bg-[#1a1d24] p-5 shadow-lg shadow-black/20 ring-1 ring-white/[0.08]">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-stretch">
        <div className="flex shrink-0 items-center justify-center rounded-2xl bg-[#14171d] px-8 py-6 ring-1 ring-white/[0.06]">
          <ScoreRing score={score} />
        </div>
        <div className="flex flex-1 flex-col justify-center gap-3">
          {summaryItems.map((item) => (
            <CategoryRow key={item.label} item={item} />
          ))}
        </div>
        <button
          onClick={onAddCompetitor}
          title="Add competitor"
          className="flex size-9 shrink-0 items-center justify-center self-start rounded-xl border border-dashed border-white/20 text-gray-500 transition-colors hover:border-white/40 hover:text-white"
        >
          <PlusIcon className="size-4" />
        </button>
      </div>
    </div>
  );
}

"use client";

import { InformationCircleIcon } from "@heroicons/react/24/outline";

export type ScoreTag = { label: string; tone: "emerald" | "amber" | "rose" };
export type ScoreSummaryItem = { label: string; percent: number; tags: ScoreTag[] };

type ScoreGaugeProps = {
  score: number;
  label: string;
};

export function ScoreGauge({ score, label }: ScoreGaugeProps) {
  const r = 80;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - score / 100);
  const color = score >= 80 ? "#22c55e" : score >= 60 ? "#f97316" : "#ef4444";
  const glow =
    score >= 80
      ? "0 0 28px 4px rgba(34,197,94,0.25)"
      : score >= 60
      ? "0 0 28px 4px rgba(249,115,22,0.25)"
      : "0 0 28px 4px rgba(239,68,68,0.25)";

  return (
    <div className="flex flex-col items-center gap-3 shrink-0 p-4">
      <div className="relative" style={{ width: 200, height: 200 }}>
        <svg width="200" height="200" viewBox="0 0 200 200" style={{ filter: `drop-shadow(${glow})` }}>
          <circle cx="100" cy="100" r={r} fill="none" stroke="#0d0f14" strokeWidth="15" />
          <circle
            cx="100"
            cy="100"
            r={r}
            fill="none"
            stroke={color}
            strokeWidth="15"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            transform="rotate(-90 100 100)"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-5xl font-bold text-white leading-none">{score}</span>
          <span className="text-xs text-gray-500 mt-1">/ 100</span>
        </div>
      </div>
      <div className="flex items-center gap-1.5 text-sm font-medium text-gray-400">
        <span>{label}</span>
        <InformationCircleIcon className="size-3.5 text-gray-600" />
      </div>
    </div>
  );
}

type ReportAsoScoreProps = {
  score: number;
  summaryItems: ScoreSummaryItem[];
};

export function ReportAsoScore({ score, summaryItems }: ReportAsoScoreProps) {
  return (
    <div className="rounded-3xl bg-[#1a1d24] ring-1 ring-white/[0.08] overflow-hidden shadow-lg shadow-black/20">
      <div className="flex items-center gap-2 border-b border-white/[0.07] px-5 py-3">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.24em] text-gray-500">ASO Score</h3>
        <InformationCircleIcon className="size-3.5 text-gray-600" />
      </div>
      <div className="grid gap-4 px-5 py-5 text-left lg:grid-cols-[minmax(180px,260px)_minmax(0,1fr)]">
        <ScoreGauge score={score} label="ASO Score" />
        <div className="grid gap-2">
          {summaryItems.map((item) => (
            <div key={item.label} className="rounded-2xl bg-[#11141a] p-2.5 shadow-sm ring-1 ring-white/[0.04]">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-gray-500">{item.label}</span>
                <span className="text-sm font-semibold text-white">{item.percent}%</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {item.tags.map((tag) => (
                  <span
                    key={tag.label}
                    className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                      tag.tone === "emerald"
                        ? "border-emerald-500 bg-emerald-500/10 text-emerald-300"
                        : "border-amber-500 bg-amber-500/10 text-amber-300"
                    }`}
                  >
                    {tag.label}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

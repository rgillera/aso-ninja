"use client";

import { InformationCircleIcon } from "@heroicons/react/24/outline";
import { ScoreGauge } from "./ReportAsoScore";

type ReportVisibilityScoreProps = {
  score: number;
};

export function ReportVisibilityScore({ score }: ReportVisibilityScoreProps) {
  return (
    <div className="rounded-3xl bg-[#1a1d24] ring-1 ring-white/[0.08] overflow-hidden shadow-lg shadow-black/20">
      <div className="flex items-center gap-2 border-b border-white/[0.07] px-5 py-3">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.24em] text-gray-500">Keyword Visibility</h3>
        <InformationCircleIcon className="size-3.5 text-gray-600" />
      </div>
      <div className="grid gap-4 px-5 py-5 text-left lg:grid-cols-[minmax(180px,260px)_minmax(0,1fr)]">
        <ScoreGauge score={score} label="Visibility Score" />
        <div className="grid gap-2">
          <div className="rounded-2xl bg-[#11141a] p-2.5 shadow-sm ring-1 ring-white/[0.04]">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-gray-500">Visibility Score</span>
              <span className="text-sm font-semibold text-white">{score}%</span>
            </div>
            <p className="mt-2 text-sm leading-6 text-gray-500">
              A quick signal of how much opportunity your tracked keywords could bring to your app’s discoverability.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

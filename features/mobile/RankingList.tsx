"use client";

import type { SavedKeyword } from "@/app/api/keywords/list/route";
import type { PerformanceSnapshotResult } from "@/app/api/keywords/performance-snapshots/route";
import { effectiveRank, formatRank, rankGrowth } from "@/features/aso/keywords/performance/types";

function GrowthBadge({ value }: { value: number | null }) {
  if (value === null) return <span className="text-xs text-gray-600">–</span>;
  if (value === 0) return <span className="text-xs text-gray-500">0</span>;
  const up = value > 0;
  return (
    <span className={`text-xs font-medium ${up ? "text-emerald-400" : "text-red-400"}`}>
      {up ? "▲" : "▼"}
      {Math.abs(value)}
    </span>
  );
}

export function RankingList({
  keywords,
  snapshots,
}: {
  keywords: SavedKeyword[];
  snapshots: PerformanceSnapshotResult;
}) {
  if (!keywords.length) {
    return (
      <p className="px-4 py-8 text-center text-sm text-gray-500">
        No tracked keywords yet for this app.
      </p>
    );
  }

  const sorted = [...keywords].sort((a, b) => {
    const ra = effectiveRank(snapshots[a.term]?.rankLatest, a.rank);
    const rb = effectiveRank(snapshots[b.term]?.rankLatest, b.rank);
    const va = typeof ra === "number" ? ra : Infinity;
    const vb = typeof rb === "number" ? rb : Infinity;
    return va - vb;
  });

  return (
    <ul className="divide-y divide-white/[0.06]">
      {sorted.map((k) => {
        const snapshot = snapshots[k.term];
        const rank = effectiveRank(snapshot?.rankLatest, k.rank);
        const growth = rankGrowth(snapshot?.rankPrev, snapshot?.rankLatest);
        return (
          <li key={k.term} className="flex items-center justify-between px-4 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm text-gray-200">{k.term}</p>
              <p className="text-xs text-gray-600">Volume {k.volume}</p>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <GrowthBadge value={growth} />
              <span className={`text-sm tabular-nums ${rank === "unranked" ? "text-gray-600" : "text-gray-200"}`}>
                {formatRank(rank)}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

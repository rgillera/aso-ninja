"use client";

import { useState } from "react";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import type { SavedKeyword } from "@/app/api/keywords/list/route";
import type { PerformanceSnapshotResult } from "@/app/api/keywords/performance-snapshots/route";
import { effectiveRank, formatRank, rankGrowth } from "@/features/aso/keywords/performance/types";

const PAGE_SIZE = 20;

type SortKey = "rank" | "volume" | "growth";
type SortDir = "asc" | "desc";
type Row = { keyword: SavedKeyword; rank: ReturnType<typeof effectiveRank>; growth: number | null };

// Sensible default the first time each field is picked — rank ascending
// (best/#1 first, matching this list's original fixed sort), volume and
// growth descending (highest first). Picking the same field again reverses it.
const DEFAULT_DIR: Record<SortKey, SortDir> = { rank: "asc", volume: "desc", growth: "desc" };

function GrowthBadge({ value }: { value: number | null }) {
  if (value === null) return <span className="text-sm text-gray-600">–</span>;
  if (value === 0) return <span className="text-sm text-gray-500">0</span>;
  const up = value > 0;
  return (
    <span className={`text-sm font-medium ${up ? "text-emerald-400" : "text-red-400"}`}>
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
  // Caller passes key={appId} on this component, so switching apps remounts
  // it fresh (search/sort/page all reset) instead of carrying over stale state.
  const [page, setPage] = useState(0);
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("rank");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  if (!keywords.length) {
    return (
      <p className="px-4 py-8 text-center text-sm text-gray-500">
        No tracked keywords yet for this app.
      </p>
    );
  }

  const rows: Row[] = keywords.map((keyword) => {
    const snapshot = snapshots[keyword.term];
    return {
      keyword,
      rank: effectiveRank(snapshot?.rankLatest, keyword.rank),
      growth: rankGrowth(snapshot?.rankPrev, snapshot?.rankLatest),
    };
  });

  const trimmedQuery = query.trim().toLowerCase();
  const filtered = trimmedQuery
    ? rows.filter((r) => r.keyword.term.toLowerCase().includes(trimmedQuery))
    : rows;

  const dirMul = sortDir === "asc" ? 1 : -1;
  const sorted = [...filtered].sort((a, b) => {
    if (sortKey === "volume") return (a.keyword.volume - b.keyword.volume) * dirMul;

    if (sortKey === "growth") {
      // Nulls (no history to compare yet) always sort last, either direction.
      if (a.growth === null && b.growth === null) return 0;
      if (a.growth === null) return 1;
      if (b.growth === null) return -1;
      return (a.growth - b.growth) * dirMul;
    }

    // rank — unranked always sorts last, either direction.
    const va = typeof a.rank === "number" ? a.rank : Infinity;
    const vb = typeof b.rank === "number" ? b.rank : Infinity;
    return (va - vb) * dirMul;
  });

  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const start = safePage * PAGE_SIZE;
  const pageItems = sorted.slice(start, start + PAGE_SIZE);

  function toggleSort(key: SortKey) {
    if (key === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir(DEFAULT_DIR[key]);
    }
    setPage(0);
  }

  const SORT_LABELS: Record<SortKey, string> = { rank: "Rank", volume: "Volume", growth: "Growth" };

  return (
    <>
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-center gap-2.5 rounded-xl bg-white/[0.06] px-4 py-3.5">
          <MagnifyingGlassIcon className="size-5 shrink-0 text-gray-500" />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(0);
            }}
            placeholder="Search keywords…"
            className="w-full bg-transparent text-base text-gray-200 placeholder-gray-600 outline-none"
          />
        </div>
      </div>

      <div className="flex items-center gap-1 border-b border-white/[0.06] px-2 pb-2 text-sm text-gray-500">
        {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
          <button
            key={key}
            onClick={() => toggleSort(key)}
            className={`flex items-center gap-1 rounded-lg px-3 py-2.5 ${sortKey === key ? "font-medium text-gray-200" : "active:bg-white/[0.05]"}`}
          >
            {SORT_LABELS[key]}
            {sortKey === key && <span>{sortDir === "asc" ? "▲" : "▼"}</span>}
          </button>
        ))}
      </div>

      {sorted.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-gray-500">
          No keywords match &ldquo;{query}&rdquo;.
        </p>
      ) : (
        <ul className="divide-y divide-white/[0.06]">
          {pageItems.map(({ keyword, rank, growth }) => (
            <li key={keyword.term} className="flex items-center justify-between px-4 py-4">
              <div className="min-w-0">
                <p className="truncate text-base text-gray-200">{keyword.term}</p>
                <p className="mt-0.5 text-sm text-gray-600">Volume {keyword.volume}</p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <GrowthBadge value={growth} />
                <span className={`text-base font-medium tabular-nums ${rank === "unranked" ? "text-gray-600" : "text-gray-200"}`}>
                  {formatRank(rank)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}

      {pageCount > 1 && (
        <div className="flex items-center justify-between px-3 py-2 text-sm text-gray-500">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={safePage === 0}
            className="rounded-lg px-4 py-2.5 disabled:opacity-30 enabled:active:bg-white/[0.05] enabled:hover:text-gray-200"
          >
            ‹ Prev
          </button>
          <span className="text-xs">
            {start + 1}–{Math.min(start + PAGE_SIZE, sorted.length)} of {sorted.length}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
            disabled={safePage >= pageCount - 1}
            className="rounded-lg px-4 py-2.5 disabled:opacity-30 enabled:active:bg-white/[0.05] enabled:hover:text-gray-200"
          >
            Next ›
          </button>
        </div>
      )}
    </>
  );
}

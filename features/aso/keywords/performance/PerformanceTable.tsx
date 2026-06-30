"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import {
  PlusIcon,
  XMarkIcon,
  StarIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDoubleLeftIcon,
  ChevronDoubleRightIcon,
} from "@heroicons/react/24/outline";
import { VolumeBar } from "@/features/aso/keywords/research/ui";
import { formatRank, formatSnapshotDate, isBranded, rankGrowth, volumeGrowth } from "./types";
import type { Filters, PerformanceKeyword, TermSnapshot } from "./types";
import type { CompetitorApp } from "@/features/aso/keywords/research/ManageCompetitorsModal";
import { PerformanceFilters } from "./PerformanceFilters";

type Props = {
  keywords: PerformanceKeyword[];
  filtered: PerformanceKeyword[];
  appName: string;
  appIcon: string;
  competitors: CompetitorApp[];
  filters: Filters;
  onFiltersChange: (patch: Partial<Filters>) => void;
  snapshots: Record<string, TermSnapshot>;
  snapshotsLoading: boolean;
  adding?: boolean;
  onAddKeywords: (terms: string[]) => void;
  onToggleStar: (term: string) => void;
  onRemoveKeyword: (term: string) => void;
  onLiveSearch: (term: string) => void;
  onViewVolumeHistory: (term: string) => void;
  onRefetchRanks: () => void;
  refetchingRanks: boolean;
  stuckRankCount: number;
};

const PAGE_SIZE = 25;

// Fixed-width columns (px), matching their Tailwind col widths below —
// used to compute how much room is left for the Keyword column to grow into.
const VOLUME_COL_W = 208;     // w-52
const RANK_GROUP_W = 448;     // w-40 + w-40 + w-32
const ACTIONS_COL_W = 80;     // w-20
const KEYWORD_MIN_W = 320;    // w-80

function GrowthCell({ value }: { value: number | null }) {
  if (value === null) return <span className="text-xs text-gray-600">-</span>;
  if (value === 0) return <span className="text-xs text-gray-500">0</span>;
  const up = value > 0;
  return (
    <span className={`text-xs font-medium ${up ? "text-emerald-400" : "text-red-400"}`}>
      {up ? "▲" : "▼"}{Math.abs(value)}
    </span>
  );
}

function RankCell({ value, date }: { value: TermSnapshot["rankPrev"] | undefined; date?: string | null }) {
  const label = formatRank(value);
  const muted = label === "Unknown" || label === "Unranked";
  return (
    <div>
      <span className={`text-sm tabular-nums ${muted ? "text-gray-600" : "text-gray-300"}`}>{label}</span>
      {date && <p className="text-[10px] text-gray-600">{formatSnapshotDate(date)}</p>}
    </div>
  );
}

function VolumeCell({ value, growth, onClick }: { value: number | null | undefined; growth: number | null; onClick: () => void }) {
  if (value == null) return <span className="text-sm text-gray-600">-</span>;
  return (
    <button onClick={onClick} className="flex items-center gap-2 rounded px-1 -mx-1 py-0.5 hover:bg-white/[0.05] transition-colors" title="View volume history">
      <VolumeBar value={value} />
      {growth !== null && growth < 0
        ? <ArrowTrendingDownIcon className="size-3.5 text-red-400 shrink-0" />
        : <ArrowTrendingUpIcon className={`size-3.5 shrink-0 ${growth ? "text-indigo-400" : "text-gray-600"}`} />
      }
    </button>
  );
}

export function PerformanceTable({
  keywords, filtered, appName, appIcon, competitors,
  filters, onFiltersChange, snapshots, snapshotsLoading, adding = false,
  onAddKeywords, onToggleStar, onRemoveKeyword, onLiveSearch, onViewVolumeHistory,
  onRefetchRanks, refetchingRanks, stuckRankCount,
}: Props) {
  const [input, setInput] = useState("");
  const [page,  setPage]  = useState(1);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const clampedPage = Math.min(page, pageCount);
  const pageRows = filtered.slice((clampedPage - 1) * PAGE_SIZE, clampedPage * PAGE_SIZE);

  // Keyword column grows to fill any leftover width (so there's no dead gap
  // when there are few competitors), but never shrinks below its min — once
  // the fixed columns no longer fit, the table overflows and scrolls instead.
  const scrollRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => setContainerWidth(entries[0].contentRect.width));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const otherColsWidth = VOLUME_COL_W + RANK_GROUP_W * (1 + competitors.length) + ACTIONS_COL_W;
  const keywordWidth = Math.max(KEYWORD_MIN_W, containerWidth - otherColsWidth);

  function handleAdd() {
    const parts = input.split(",").map((s) => s.trim()).filter(Boolean);
    if (!parts.length) return;
    onAddKeywords(parts);
    setInput("");
  }

  const ranked = keywords.filter((k) => k.rank !== null);
  const avgRank = ranked.length ? Math.round(ranked.reduce((s, k) => s + (k.rank ?? 0), 0) / ranked.length) : null;

  const summary = useMemo(() => {
    const volLatests  = filtered.map((k) => snapshots[k.term]?.volumeLatest ?? k.volume).filter((v): v is number => v != null);
    const rankLatests = filtered.map((k) => snapshots[k.term]?.rankLatest).filter((v): v is number => typeof v === "number");
    const avg = (arr: number[]) => arr.length ? Math.round(arr.reduce((s, v) => s + v, 0) / arr.length) : null;
    return {
      volumeLatest: avg(volLatests),
      rankLatest:   avg(rankLatests),
    };
  }, [filtered, snapshots]);

  return (
    <div className="mx-6 mb-6 rounded-xl bg-[#1a1d24] ring-1 ring-white/[0.07] overflow-hidden">
      <PerformanceFilters
        filters={filters}
        onChange={onFiltersChange}
      />

      {keywords.length > 0 && (
        <div className="grid grid-cols-2 divide-x divide-white/[0.07] border-b border-white/[0.07]">
          <div className="px-5 py-3.5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Avg Ranking</p>
            <p className="text-lg font-semibold text-white mt-0.5">{avgRank ?? "—"}</p>
          </div>
          <div className="px-5 py-3.5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Ranked Keywords</p>
            <p className="text-lg font-semibold text-white mt-0.5">{ranked.length} <span className="text-sm text-gray-600">/ {keywords.length}</span></p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-white/[0.07]">
        <div className="flex-1 flex items-center rounded-lg bg-[#0d0f14] ring-1 ring-white/[0.08] focus-within:ring-indigo-500/40 px-3 py-2 transition-all min-w-[200px]">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder="Enter comma-separated keywords"
            className="flex-1 bg-transparent text-xs text-gray-300 placeholder-gray-600 outline-none"
          />
        </div>
        <button
          onClick={handleAdd}
          disabled={adding}
          title={adding ? "Saving keyword(s)… don't refresh yet" : undefined}
          className="flex items-center gap-1.5 rounded-lg bg-indigo-500 hover:bg-indigo-400 disabled:bg-indigo-500/50 disabled:cursor-wait px-4 py-2 text-xs font-semibold text-white transition-colors shrink-0"
        >
          {adding
            ? <span className="size-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
            : <PlusIcon className="size-3.5" />}
          {adding ? "Adding…" : "Add"}
        </button>
        {snapshotsLoading && <div className="size-3 rounded-full border-2 border-gray-600 border-t-indigo-400 animate-spin shrink-0" />}
        {stuckRankCount > 0 && (
          <button
            onClick={onRefetchRanks}
            disabled={refetchingRanks}
            title="Retry live search for keywords still showing an Unknown rank"
            className="flex items-center gap-1.5 rounded-lg bg-[#0d0f14] ring-1 ring-white/[0.08] disabled:opacity-50 disabled:cursor-wait px-3 py-1.5 text-xs font-medium text-gray-400 hover:text-white transition-colors shrink-0"
          >
            <ArrowPathIcon className={`size-3.5 ${refetchingRanks ? "animate-spin" : ""}`} />
            {refetchingRanks ? "Refetching…" : `Refetch ${stuckRankCount} unranked`}
          </button>
        )}
      </div>

      {keywords.length === 0 ? (
        <div className="py-12 text-center px-6">
          <MagnifyingGlassIcon className="size-8 text-gray-700 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-400">Your keyword list is empty</p>
          <p className="mt-1 text-xs text-gray-600">Add keywords to this list to monitor their performance.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-12 text-center px-6">
          <MagnifyingGlassIcon className="size-8 text-gray-700 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-400">No keywords match these filters</p>
        </div>
      ) : (
        <div ref={scrollRef} className="overflow-x-auto">
          <table className="table-fixed w-full border-collapse">
            <colgroup>
              <col style={{ width: keywordWidth, minWidth: keywordWidth }} />
              <col className="w-52" />
              <col className="w-40" />
              <col className="w-40" />
              <col className="w-32" />
              {competitors.map((c) => (
                <Fragment key={c.storeId}>
                  <col className="w-40" />
                  <col className="w-40" />
                  <col className="w-32" />
                </Fragment>
              ))}
              <col className="w-20" />
            </colgroup>
            <thead>
              <tr className="border-b border-white/[0.04]">
                <th rowSpan={2} className="sticky left-0 z-20 bg-[#1a1d24] border-r border-white/[0.07] px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-600 align-bottom whitespace-nowrap">Keyword</th>
                <th rowSpan={2} style={{ left: keywordWidth }} className="sticky z-20 bg-[#1a1d24] px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-500 align-bottom border-l border-r border-white/[0.07] whitespace-nowrap">Volume</th>
                <th colSpan={3} className="px-4 py-2 text-center text-[10px] font-semibold uppercase tracking-wider text-gray-500 border-l border-white/[0.07] whitespace-nowrap">
                  <div className="flex items-center justify-center gap-1.5 normal-case tracking-normal">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={appIcon} alt="" className="size-4 rounded shrink-0" />
                    <span className="truncate max-w-[140px]">{appName}</span>
                  </div>
                </th>
                {competitors.map((c) => (
                  <th key={c.storeId} colSpan={3} className="px-4 py-2 text-center text-[10px] font-semibold uppercase tracking-wider text-gray-500 border-l border-white/[0.07] whitespace-nowrap">
                    <div className="flex items-center justify-center gap-1.5 normal-case tracking-normal">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={c.icon} alt="" className="size-4 rounded shrink-0" />
                      <span className="truncate max-w-[140px]">{c.name}</span>
                    </div>
                  </th>
                ))}
                <th rowSpan={2} className="sticky right-0 z-20 bg-[#1a1d24] border-l border-white/[0.07] w-20 pr-4 py-2 text-right text-[10px] font-semibold uppercase tracking-wider text-gray-600 align-bottom whitespace-nowrap">Actions</th>
              </tr>
              <tr className="border-b border-white/[0.07]">
                <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-600 border-l border-white/[0.07] whitespace-nowrap">Prev</th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-600 whitespace-nowrap">Latest</th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-600 whitespace-nowrap">Growth</th>
                {competitors.map((c) => (
                  <Fragment key={c.storeId}>
                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-600 border-l border-white/[0.07] whitespace-nowrap">Prev</th>
                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-600 whitespace-nowrap">Latest</th>
                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-600 whitespace-nowrap">Growth</th>
                  </Fragment>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {pageRows.map((k) => {
                const s = snapshots[k.term];
                return (
                  <tr key={k.term} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="sticky left-0 z-10 bg-[#1a1d24] group-hover:bg-[#1d2029] border-r border-white/[0.04] px-4 py-3">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <button onClick={() => onToggleStar(k.term)} className="shrink-0 transition-colors">
                          <StarIcon className={`size-3.5 ${k.starred ? "fill-amber-400 text-amber-400" : "text-gray-600"}`} />
                        </button>
                        <span className="text-sm text-gray-300 truncate">{k.term}</span>
                        <span className={`text-[9px] rounded px-1 py-0.5 ring-1 shrink-0 ${
                          isBranded(k.term, appName)
                            ? "text-indigo-300 ring-indigo-500/30 bg-indigo-500/10"
                            : "text-gray-500 ring-white/[0.08] bg-white/[0.03]"
                        }`}>
                          {isBranded(k.term, appName) ? "B" : "G"}
                        </span>
                      </div>
                    </td>
                    <td style={{ left: keywordWidth }} className="sticky z-10 bg-[#1a1d24] group-hover:bg-[#1d2029] border-l border-r border-white/[0.04] px-3 py-3">
                      {k.loading ? (
                        <div className="h-3 w-16 rounded bg-white/[0.06] animate-pulse" />
                      ) : (
                        <VolumeCell
                          value={s?.volumeLatest ?? k.volume}
                          growth={volumeGrowth(s?.volumePrev, s?.volumeLatest)}
                          onClick={() => onViewVolumeHistory(k.term)}
                        />
                      )}
                    </td>
                    {k.loading ? (
                      <td colSpan={3 + competitors.length * 3} className="px-4 py-3"><div className="h-3 w-full rounded bg-white/[0.06] animate-pulse" /></td>
                    ) : (
                      <>
                        <td className="px-3 py-3 border-l border-white/[0.04]"><RankCell value={s?.rankPrev} date={s?.rankPrevDate} /></td>
                        <td className="px-3 py-3"><RankCell value={s?.rankLatest ?? (k.rank ?? "unknown")} date={s?.rankLatestDate} /></td>
                        <td className="px-3 py-3"><GrowthCell value={rankGrowth(s?.rankPrev, s?.rankLatest)} /></td>
                        {competitors.map((c) => {
                          const cs = s?.competitors?.[c.storeId];
                          return (
                            <Fragment key={c.storeId}>
                              <td className="px-3 py-3 border-l border-white/[0.04]"><RankCell value={cs?.rankPrev} date={cs?.rankPrevDate} /></td>
                              <td className="px-3 py-3"><RankCell value={cs?.rankLatest} date={cs?.rankLatestDate} /></td>
                              <td className="px-3 py-3"><GrowthCell value={rankGrowth(cs?.rankPrev, cs?.rankLatest)} /></td>
                            </Fragment>
                          );
                        })}
                      </>
                    )}
                    <td className="sticky right-0 z-10 bg-[#1a1d24] group-hover:bg-[#1d2029] border-l border-white/[0.04] pr-4 py-3">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100">
                        <button
                          onClick={() => onLiveSearch(k.term)}
                          title="Live search"
                          className="flex items-center justify-center rounded px-2 py-1 text-[10px] font-medium bg-[#0d0f14] ring-1 ring-white/[0.08] text-gray-400 hover:text-white transition-colors"
                        >
                          <MagnifyingGlassIcon className="size-3" />
                        </button>
                        <button
                          onClick={() => onRemoveKeyword(k.term)}
                          title="Remove keyword"
                          className="flex items-center justify-center rounded px-2 py-1 text-[10px] font-medium bg-[#0d0f14] ring-1 ring-white/[0.08] text-gray-400 hover:text-red-400 hover:ring-red-500/30 transition-colors"
                        >
                          <XMarkIcon className="size-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-white/[0.07] bg-white/[0.015]">
                <td className="sticky left-0 z-10 bg-[#1c1f27] border-r border-white/[0.07] px-4 py-3 text-xs text-gray-500 whitespace-nowrap">Average / Total of {filtered.length} keyword{filtered.length === 1 ? "" : "s"}</td>
                <td style={{ left: keywordWidth }} className="sticky z-10 bg-[#1c1f27] border-l border-r border-white/[0.07] px-3 py-3 text-sm text-gray-300 tabular-nums">{summary.volumeLatest ?? "-"}</td>
                <td className="px-3 py-3 border-l border-white/[0.04]" />
                <td className="px-3 py-3 text-sm text-gray-300 tabular-nums">{summary.rankLatest ?? "-"}</td>
                <td className="px-3 py-3" />
                {competitors.map((c) => (
                  <td key={c.storeId} colSpan={3} className="px-3 py-3 border-l border-white/[0.04]" />
                ))}
                <td className="sticky right-0 z-10 bg-[#1c1f27] border-l border-white/[0.07] pr-4 py-3" />
              </tr>
            </tfoot>
          </table>

          {pageCount > 1 && (
            <div className="flex items-center justify-center gap-2 px-4 py-3 border-t border-white/[0.07]">
              <button onClick={() => setPage(1)} disabled={clampedPage === 1} className="text-gray-500 hover:text-white disabled:opacity-30 disabled:hover:text-gray-500 transition-colors">
                <ChevronDoubleLeftIcon className="size-3.5" />
              </button>
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={clampedPage === 1} className="text-gray-500 hover:text-white disabled:opacity-30 disabled:hover:text-gray-500 transition-colors">
                <ChevronLeftIcon className="size-3.5" />
              </button>
              <span className="text-xs text-gray-400">Page {clampedPage} of {pageCount}</span>
              <button onClick={() => setPage((p) => Math.min(pageCount, p + 1))} disabled={clampedPage === pageCount} className="text-gray-500 hover:text-white disabled:opacity-30 disabled:hover:text-gray-500 transition-colors">
                <ChevronRightIcon className="size-3.5" />
              </button>
              <button onClick={() => setPage(pageCount)} disabled={clampedPage === pageCount} className="text-gray-500 hover:text-white disabled:opacity-30 disabled:hover:text-gray-500 transition-colors">
                <ChevronDoubleRightIcon className="size-3.5" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

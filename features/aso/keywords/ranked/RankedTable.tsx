"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeftIcon, ChevronRightIcon,
  ChevronDoubleLeftIcon, ChevronDoubleRightIcon,
  MagnifyingGlassIcon, ChevronDownIcon, CheckIcon, XMarkIcon,
  ArrowTrendingUpIcon, ArrowTrendingDownIcon,
} from "@heroicons/react/24/outline";
import { VolumeBar, TranslateToggle } from "@/features/aso/keywords/research/ui";
import { SelectionActionBar } from "@/features/aso/keywords/SelectionActionBar";
import { downloadCsv } from "@/features/aso/keywords/csvExport";
import {
  DEFAULT_FILTERS, isFiltersDefault, isBranded, wordCount, rankDelta, formatDate,
  type RankedKeyword, type Filters,
} from "./types";

type Props = {
  keywords: RankedKeyword[];
  filtered: RankedKeyword[];
  appName: string;
  filters: Filters;
  onFiltersChange: (patch: Partial<Filters>) => void;
  onViewVolumeHistory: (term: string) => void;
  translateToggle: boolean;
  translateLocked?: boolean;
  onTranslateToggle: () => void;
};

const PAGE_SIZE = 25;

function VolumeCell({ volume, onClick }: { volume: number | null; onClick: () => void }) {
  if (volume == null) return <span className="text-sm text-gray-600">—</span>;
  return (
    <button
      onClick={onClick}
      title="View volume history"
      className="flex items-center gap-2 rounded px-1 -mx-1 py-0.5 hover:bg-white/[0.05] transition-colors"
    >
      <VolumeBar value={volume} />
      <ArrowTrendingUpIcon className="size-3.5 text-gray-600 shrink-0" />
    </button>
  );
}

function GrowthCell({ value }: { value: number | null }) {
  if (value === null) return <span className="text-xs text-gray-600">—</span>;
  if (value === 0) return <span className="text-xs text-gray-500">0</span>;
  const up = value > 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${up ? "text-emerald-400" : "text-red-400"}`}>
      {up ? <ArrowTrendingUpIcon className="size-3" /> : <ArrowTrendingDownIcon className="size-3" />}
      {Math.abs(value)}
    </span>
  );
}

function Dropdown({ label, active, children }: { label: string; active?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs ring-1 transition-colors ${
          active
            ? "bg-indigo-500/10 ring-indigo-500/40 text-indigo-300"
            : open
              ? "bg-[#0d0f14] ring-indigo-500/40 text-white"
              : "bg-[#0d0f14] ring-white/[0.08] text-gray-400 hover:text-white"
        }`}
      >
        {label}
        <ChevronDownIcon className="size-3 text-gray-500" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute z-20 mt-1.5 min-w-[200px] rounded-lg bg-[#1a1d24] ring-1 ring-white/[0.1] shadow-2xl p-3">
            {children}
          </div>
        </>
      )}
    </div>
  );
}

function RangeFields({ min, max, onMin, onMax, cap }: {
  min: number; max: number; cap: number;
  onMin: (v: number) => void; onMax: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <input type="number" min={0} max={cap} value={min}
        onChange={(e) => onMin(Math.max(0, Math.min(cap, parseInt(e.target.value, 10) || 0)))}
        className="w-16 rounded-md bg-[#0d0f14] ring-1 ring-white/[0.08] px-2 py-1 text-xs text-gray-200 outline-none focus:ring-indigo-500/40"
      />
      <span className="text-xs text-gray-600">to</span>
      <input type="number" min={0} max={cap} value={max}
        onChange={(e) => onMax(Math.max(0, Math.min(cap, parseInt(e.target.value, 10) || 0)))}
        className="w-16 rounded-md bg-[#0d0f14] ring-1 ring-white/[0.08] px-2 py-1 text-xs text-gray-200 outline-none focus:ring-indigo-500/40"
      />
    </div>
  );
}

export function RankedTable({
  keywords, filtered, appName, filters, onFiltersChange, onViewVolumeHistory,
  translateToggle, translateLocked = false, onTranslateToggle,
}: Props) {
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sortKey, setSortKey] = useState<"rank" | "volume" | "delta">("rank");
  const [sortAsc, setSortAsc] = useState(true);
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [translating, setTranslating]   = useState(false);

  useEffect(() => {
    if (!translateToggle) return;
    const terms = [...new Set(keywords.map((k) => k.term))].filter((t) => !(t in translations));
    if (!terms.length) return;
    setTranslating(true);
    fetch("/api/keywords/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ terms }),
    })
      .then((r) => r.json())
      .then(({ translations: fresh }: { translations: Record<string, string> }) => {
        setTranslations((prev) => ({ ...prev, ...fresh }));
      })
      .catch(() => {})
      .finally(() => setTranslating(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [translateToggle, keywords]);

  function translationFor(term: string): string | undefined {
    if (!translateToggle) return undefined;
    const t = translations[term];
    return t && t.toLowerCase() !== term.toLowerCase() ? t : undefined;
  }

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let diff = 0;
      if (sortKey === "rank")   diff = a.rank - b.rank;
      if (sortKey === "volume") diff = (b.volume ?? -1) - (a.volume ?? -1);
      if (sortKey === "delta")  diff = (rankDelta(b.prevRank, b.rank) ?? 0) - (rankDelta(a.prevRank, a.rank) ?? 0);
      return sortAsc ? diff : -diff;
    });
  }, [filtered, sortKey, sortAsc]);

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  const pageRows   = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const pageTerms  = new Set(pageRows.map((k) => k.term));
  const allPageSel = pageRows.length > 0 && pageRows.every((k) => selected.has(k.term));

  function toggleSort(key: typeof sortKey) {
    if (sortKey === key) setSortAsc((v) => !v);
    else { setSortKey(key); setSortAsc(true); }
    setPage(0);
  }

  function toggleAll() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allPageSel) pageTerms.forEach((t) => next.delete(t));
      else pageTerms.forEach((t) => next.add(t));
      return next;
    });
  }

  function toggleOne(term: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(term) ? next.delete(term) : next.add(term);
      return next;
    });
  }

  function handleCopy() {
    navigator.clipboard.writeText([...selected].join("\n")).catch(() => {});
  }

  function handleExport() {
    const rows = keywords.filter((k) => selected.has(k.term));
    downloadCsv("ranked-keywords.csv",
      ["Keyword", "Volume", "Rank", "Prev Rank", "Change", "Type", "Date"],
      rows.map((k) => [
        k.term,
        k.volume ?? "",
        k.rank,
        k.prevRank ?? "",
        rankDelta(k.prevRank, k.rank) ?? "",
        isBranded(k.term, appName) ? "Branded" : "Generic",
        k.rankDate,
      ])
    );
  }

  const volumeActive = filters.volumeMin !== DEFAULT_FILTERS.volumeMin || filters.volumeMax !== DEFAULT_FILTERS.volumeMax;
  const rankActive   = filters.rankMin !== DEFAULT_FILTERS.rankMin || filters.rankMax !== DEFAULT_FILTERS.rankMax;

  const SortTh = ({ col, label, className = "" }: { col: typeof sortKey; label: string; className?: string }) => (
    <th
      className={`px-3 py-2.5 text-left text-xs font-medium text-gray-500 cursor-pointer select-none hover:text-gray-300 transition-colors whitespace-nowrap ${className}`}
      onClick={() => toggleSort(col)}
    >
      {label}{sortKey === col ? (sortAsc ? " ↑" : " ↓") : ""}
    </th>
  );

  return (
    <div className="mx-6 mb-6 rounded-xl bg-[#1a1d24] ring-1 ring-white/[0.07] overflow-hidden">
      {/* Filters */}
      <div className="px-4 py-3 border-b border-white/[0.07] flex flex-wrap items-center gap-2">
        <Dropdown label={filters.query ? `Keyword: ${filters.query}` : "Keyword"} active={!!filters.query}>
          <div className="flex items-center gap-1.5 rounded-md bg-[#0d0f14] ring-1 ring-white/[0.08] px-2 py-1.5">
            <MagnifyingGlassIcon className="size-3.5 text-gray-500 shrink-0" />
            <input autoFocus value={filters.query} onChange={(e) => { onFiltersChange({ query: e.target.value }); setPage(0); }}
              placeholder="Search keyword"
              className="flex-1 bg-transparent text-xs text-gray-300 placeholder-gray-600 outline-none min-w-0"
            />
          </div>
        </Dropdown>

        <Dropdown label={volumeActive ? `Volume ${filters.volumeMin}–${filters.volumeMax}` : "Volume"} active={volumeActive}>
          <RangeFields min={filters.volumeMin} max={filters.volumeMax} cap={100}
            onMin={(v) => { onFiltersChange({ volumeMin: v }); setPage(0); }}
            onMax={(v) => { onFiltersChange({ volumeMax: v }); setPage(0); }}
          />
        </Dropdown>

        <Dropdown label={rankActive ? `Rank ${filters.rankMin}–${filters.rankMax}` : "Rank"} active={rankActive}>
          <RangeFields min={filters.rankMin} max={filters.rankMax} cap={200}
            onMin={(v) => { onFiltersChange({ rankMin: v }); setPage(0); }}
            onMax={(v) => { onFiltersChange({ rankMax: v }); setPage(0); }}
          />
        </Dropdown>

        <Dropdown label={`Type${filters.type === "all" ? "" : `: ${filters.type === "branded" ? "Branded" : "Generic"}`}`} active={filters.type !== "all"}>
          <div className="flex flex-col gap-0.5">
            {(["all", "branded", "generic"] as const).map((t) => (
              <button key={t} onClick={() => { onFiltersChange({ type: t }); setPage(0); }}
                className={`flex items-center justify-between rounded-md px-2 py-1.5 text-xs text-left transition-colors ${filters.type === t ? "bg-indigo-500/15 text-indigo-300" : "text-gray-300 hover:bg-white/[0.05]"}`}
              >
                {t === "all" ? "All" : t === "branded" ? "Branded" : "Generic"}
                {filters.type === t && <CheckIcon className="size-3.5" />}
              </button>
            ))}
          </div>
        </Dropdown>

        <Dropdown label={`Words${filters.wordCount === "all" ? "" : `: ${filters.wordCount === 3 ? "3+" : filters.wordCount}`}`} active={filters.wordCount !== "all"}>
          <div className="flex flex-col gap-0.5">
            {([["all", "All"], [1, "1 word"], [2, "2 words"], [3, "3+ words"]] as const).map(([v, label]) => (
              <button key={String(v)} onClick={() => { onFiltersChange({ wordCount: v }); setPage(0); }}
                className={`flex items-center justify-between rounded-md px-2 py-1.5 text-xs text-left transition-colors ${filters.wordCount === v ? "bg-indigo-500/15 text-indigo-300" : "text-gray-300 hover:bg-white/[0.05]"}`}
              >
                {label}
                {filters.wordCount === v && <CheckIcon className="size-3.5" />}
              </button>
            ))}
          </div>
        </Dropdown>

        {!isFiltersDefault(filters) && (
          <button onClick={() => { onFiltersChange(DEFAULT_FILTERS); setPage(0); }}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            <XMarkIcon className="size-3.5" /> Clear
          </button>
        )}

        {translateToggle && translating && (
          <span className="size-3 rounded-full border-2 border-gray-500/40 border-t-gray-300 animate-spin shrink-0" />
        )}
        <TranslateToggle checked={translateToggle} onChange={onTranslateToggle} locked={translateLocked} />

        <span className="ml-auto text-xs text-gray-600">{filtered.length.toLocaleString()} / {keywords.length.toLocaleString()}</span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse">
          <thead>
            <tr className="border-b border-white/[0.07]">
              <th className="w-10 px-3 py-2.5">
                <input type="checkbox" checked={allPageSel} onChange={toggleAll}
                  className="rounded border-gray-600 bg-transparent accent-indigo-500 cursor-pointer"
                />
              </th>
              <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 w-52">Volume</th>
              <SortTh col="rank" label="Rank" />
              <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500">Prev</th>
              <SortTh col="delta" label="Change" />
              <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500">Keyword</th>
              <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500">Type</th>
              <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500">Date</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((kw) => {
              const delta   = rankDelta(kw.prevRank, kw.rank);
              const branded = isBranded(kw.term, appName);
              const sel     = selected.has(kw.term);
              return (
                <tr
                  key={kw.term}
                  className={`border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors ${sel ? "bg-indigo-500/5" : ""}`}
                >
                  <td className="px-3 py-2.5">
                    <input type="checkbox" checked={sel} onChange={() => toggleOne(kw.term)}
                      className="rounded border-gray-600 bg-transparent accent-indigo-500 cursor-pointer"
                    />
                  </td>
                  <td className="px-3 py-2.5 w-52">
                    <VolumeCell volume={kw.volume} onClick={() => onViewVolumeHistory(kw.term)} />
                  </td>
                  <td className="px-3 py-2.5 text-sm tabular-nums font-medium text-white">#{kw.rank}</td>
                  <td className="px-3 py-2.5 text-sm tabular-nums text-gray-500">
                    {kw.prevRank !== null ? `#${kw.prevRank}` : <span className="text-gray-700">—</span>}
                  </td>
                  <td className="px-3 py-2.5"><GrowthCell value={delta} /></td>
                  <td className="px-3 py-2.5 text-sm text-gray-200">
                    <span className="flex flex-col items-start leading-tight py-0.5">
                      <span>{kw.term}</span>
                      {translationFor(kw.term) && (
                        <span className="text-[10px] text-gray-500">(en) {translationFor(kw.term)}</span>
                      )}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${branded ? "bg-violet-500/15 text-violet-300" : "bg-gray-700/50 text-gray-400"}`}>
                      {branded ? "Branded" : "Generic"}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-gray-600 whitespace-nowrap">{formatDate(kw.rankDate)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <MagnifyingGlassIcon className="size-8 text-gray-700 mb-3" />
            <p className="text-sm font-medium text-gray-400">No keywords match your filters</p>
            <button onClick={() => onFiltersChange(DEFAULT_FILTERS)} className="mt-2 text-xs text-indigo-400 hover:text-indigo-300">
              Clear filters
            </button>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-white/[0.07] text-xs text-gray-500">
          <span>{page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, sorted.length)} of {sorted.length.toLocaleString()}</span>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(0)} disabled={page === 0} className="p-1.5 rounded hover:bg-white/[0.06] disabled:opacity-30 disabled:cursor-default transition-colors">
              <ChevronDoubleLeftIcon className="size-3.5" />
            </button>
            <button onClick={() => setPage((p) => p - 1)} disabled={page === 0} className="p-1.5 rounded hover:bg-white/[0.06] disabled:opacity-30 disabled:cursor-default transition-colors">
              <ChevronLeftIcon className="size-3.5" />
            </button>
            <span className="px-2">{page + 1} / {totalPages}</span>
            <button onClick={() => setPage((p) => p + 1)} disabled={page === totalPages - 1} className="p-1.5 rounded hover:bg-white/[0.06] disabled:opacity-30 disabled:cursor-default transition-colors">
              <ChevronRightIcon className="size-3.5" />
            </button>
            <button onClick={() => setPage(totalPages - 1)} disabled={page === totalPages - 1} className="p-1.5 rounded hover:bg-white/[0.06] disabled:opacity-30 disabled:cursor-default transition-colors">
              <ChevronDoubleRightIcon className="size-3.5" />
            </button>
          </div>
        </div>
      )}

      <SelectionActionBar
        count={selected.size}
        total={keywords.length}
        onClear={() => setSelected(new Set())}
        onCopy={handleCopy}
        onStar={() => {}}
        onExport={handleExport}
        onDelete={() => {}}
      />
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import { MagnifyingGlassIcon, ArrowDownTrayIcon } from "@heroicons/react/24/outline";
import { downloadCsv } from "@/features/aso/keywords/csvExport";
import { SelectionActionBar } from "@/features/aso/keywords/SelectionActionBar";
import { BID_TIER_ORDER, type BidSuggestion, type BidTier } from "./types";

type Props = { rows: BidSuggestion[] };

type SortKey = "term" | "volume" | "rank" | "opportunity" | "tier";

// Same pill language as the Opportunity column in
// features/aso/keywords/research/KeywordTable.tsx, extended with a tone for
// Skip/Unscored so the table reads as one system with the rest of the app.
const TIER_PILL: Record<BidTier, string> = {
  Aggressive: "bg-emerald-500/15 text-emerald-400",
  Moderate: "bg-yellow-500/15 text-yellow-400",
  Low: "bg-gray-500/10 text-gray-500",
  Skip: "bg-red-500/10 text-red-400/80",
  Unscored: "bg-gray-500/10 text-gray-600 italic",
};

function TierPill({ tier }: { tier: BidTier }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${TIER_PILL[tier]}`}>
      {tier}
    </span>
  );
}

function OpportunityCell({ value }: { value: number | null }) {
  if (value === null) return <span className="text-xs text-gray-600">—</span>;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${
        value >= 70 ? "bg-emerald-500/15 text-emerald-400" : value >= 40 ? "bg-yellow-500/15 text-yellow-400" : "bg-gray-500/10 text-gray-500"
      }`}
    >
      {value}
    </span>
  );
}

function RankCell({ rank }: { rank: number | null }) {
  if (rank === null) return <span className="text-xs text-gray-600 italic">Unranked</span>;
  return (
    <span className={`text-sm font-medium tabular-nums ${rank <= 3 ? "text-emerald-400" : rank <= 10 ? "text-yellow-400" : "text-gray-300"}`}>
      #{rank}
    </span>
  );
}

export function BidSuggestionsTable({ rows }: Props) {
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("tier");
  const [sortAsc, setSortAsc] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? rows.filter((r) => r.term.toLowerCase().includes(q)) : rows;
  }, [rows, query]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let diff = 0;
      if (sortKey === "term") diff = a.term.localeCompare(b.term);
      if (sortKey === "volume") diff = a.keyword.volume - b.keyword.volume;
      if (sortKey === "rank") diff = (a.keyword.rank ?? Infinity) - (b.keyword.rank ?? Infinity);
      if (sortKey === "opportunity") diff = (a.keyword.opportunity ?? -1) - (b.keyword.opportunity ?? -1);
      if (sortKey === "tier") diff = BID_TIER_ORDER[a.tier] - BID_TIER_ORDER[b.tier];
      return sortAsc ? diff : -diff;
    });
  }, [filtered, sortKey, sortAsc]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortAsc((v) => !v);
    else { setSortKey(key); setSortAsc(false); }
  }

  function handleExport() {
    downloadCsv(
      "asa-bid-suggestions.csv",
      ["Keyword", "Volume", "Organic Rank", "Opportunity", "Suggested Bid", "Why"],
      sorted.map((r) => [r.term, r.keyword.volume, r.keyword.rank ?? "", r.keyword.opportunity ?? "", r.tier, r.reason])
    );
  }

  const allVisibleSelected = sorted.length > 0 && sorted.every((r) => selected.has(r.term));

  function toggleAll() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) sorted.forEach((r) => next.delete(r.term));
      else sorted.forEach((r) => next.add(r.term));
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

  function handleCopySelection() {
    navigator.clipboard.writeText([...selected].join("\n")).catch(() => {});
  }

  function handleExportSelection() {
    const selectedRows = sorted.filter((r) => selected.has(r.term));
    downloadCsv(
      "asa-bid-suggestions-selection.csv",
      ["Keyword", "Volume", "Organic Rank", "Opportunity", "Suggested Bid", "Why"],
      selectedRows.map((r) => [r.term, r.keyword.volume, r.keyword.rank ?? "", r.keyword.opportunity ?? "", r.tier, r.reason])
    );
  }

  const SortTh = ({ col, label, className = "" }: { col: SortKey; label: string; className?: string }) => (
    <th
      className={`px-3 py-2.5 text-left text-xs font-medium text-gray-500 cursor-pointer select-none hover:text-gray-300 transition-colors whitespace-nowrap ${className}`}
      onClick={() => toggleSort(col)}
    >
      {label}{sortKey === col ? (sortAsc ? " ↑" : " ↓") : ""}
    </th>
  );

  return (
    <div className="mx-6 mb-6 rounded-xl bg-[#1a1d24] ring-1 ring-white/[0.07] overflow-hidden">
      <div className="px-4 py-3 border-b border-white/[0.07] flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5 rounded-md bg-[#0d0f14] ring-1 ring-white/[0.08] px-2 py-1.5">
          <MagnifyingGlassIcon className="size-3.5 text-gray-500 shrink-0" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search keyword"
            className="bg-transparent text-xs text-gray-300 placeholder-gray-600 outline-none min-w-0"
          />
        </div>

        <button
          onClick={handleExport}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-gray-400 ring-1 ring-white/[0.08] hover:text-white hover:bg-white/[0.05] transition-colors"
        >
          <ArrowDownTrayIcon className="size-3.5" />
          Export CSV
        </button>

        <span className="ml-auto text-xs text-gray-600">{filtered.length.toLocaleString()} / {rows.length.toLocaleString()}</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse">
          <thead>
            <tr className="border-b border-white/[0.07]">
              <th className="w-10 px-3 py-2.5">
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={toggleAll}
                  className="rounded border-gray-600 bg-transparent accent-indigo-500 cursor-pointer"
                />
              </th>
              <SortTh col="term" label="Keyword" />
              <SortTh col="volume" label="Volume" />
              <SortTh col="rank" label="Organic Rank" />
              <SortTh col="opportunity" label="Opportunity" />
              <SortTh col="tier" label="Suggested Bid" />
              <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500">Why</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => {
              const sel = selected.has(r.term);
              return (
                <tr key={r.term} className={`border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors ${sel ? "bg-indigo-500/5" : ""}`}>
                  <td className="px-3 py-2.5">
                    <input
                      type="checkbox"
                      checked={sel}
                      onChange={() => toggleOne(r.term)}
                      className="rounded border-gray-600 bg-transparent accent-indigo-500 cursor-pointer"
                    />
                  </td>
                  <td className="px-3 py-2.5 text-sm text-gray-200">{r.term}</td>
                  <td className="px-3 py-2.5 text-sm text-gray-300 tabular-nums">{r.keyword.volume}</td>
                  <td className="px-3 py-2.5"><RankCell rank={r.keyword.rank} /></td>
                  <td className="px-3 py-2.5"><OpportunityCell value={r.keyword.opportunity} /></td>
                  <td className="px-3 py-2.5"><TierPill tier={r.tier} /></td>
                  <td className="px-3 py-2.5 text-xs text-gray-500 max-w-sm">{r.reason}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <MagnifyingGlassIcon className="size-8 text-gray-700 mb-3" />
            <p className="text-sm font-medium text-gray-400">No keywords match your search</p>
          </div>
        )}
      </div>

      <SelectionActionBar
        count={selected.size}
        total={rows.length}
        onClear={() => setSelected(new Set())}
        onCopy={handleCopySelection}
        onExport={handleExportSelection}
      />
    </div>
  );
}

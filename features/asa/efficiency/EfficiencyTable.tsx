"use client";

import { useMemo, useState } from "react";
import { MagnifyingGlassIcon, ArrowDownTrayIcon } from "@heroicons/react/24/outline";
import { downloadCsv } from "@/features/aso/keywords/csvExport";
import type { EfficiencyRow, EfficiencyTag } from "./types";

type Props = { rows: EfficiencyRow[] };

type SortKey = "text" | "spend" | "installs" | "cpi";

const TAG_PILL: Record<EfficiencyTag, string> = {
  "Scale candidate": "bg-emerald-500/15 text-emerald-400",
  "Pause candidate": "bg-red-500/10 text-red-400/80",
  "Monitor": "bg-yellow-500/15 text-yellow-400",
  "No spend": "bg-gray-500/10 text-gray-600 italic",
};

function TagPill({ tag }: { tag: EfficiencyTag }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${TAG_PILL[tag]}`}>
      {tag}
    </span>
  );
}

function money(value: number | null, currency: string | null): string {
  if (value === null) return "—";
  return `${currency ?? ""} ${value.toFixed(2)}`.trim();
}

export function EfficiencyTable({ rows }: Props) {
  const [query, setQuery] = useState("");
  // Worst-to-best by default: keywords with no installs at all (cpi === null
  // but spend > 0) are the worst case — spend with zero conversions — so
  // they're treated as +Infinity and sort to the top alongside a high CPI.
  const [sortKey, setSortKey] = useState<SortKey>("cpi");
  const [sortAsc, setSortAsc] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? rows.filter((r) => r.text.toLowerCase().includes(q) || r.campaignName.toLowerCase().includes(q)) : rows;
  }, [rows, query]);

  const sorted = useMemo(() => {
    const cpiRank = (r: EfficiencyRow) => (r.cpi === null ? (r.spend && r.spend > 0 ? Infinity : -1) : r.cpi);
    return [...filtered].sort((a, b) => {
      let diff = 0;
      if (sortKey === "text") diff = a.text.localeCompare(b.text);
      if (sortKey === "spend") diff = (a.spend ?? -1) - (b.spend ?? -1);
      if (sortKey === "installs") diff = (a.installs ?? -1) - (b.installs ?? -1);
      if (sortKey === "cpi") diff = cpiRank(a) - cpiRank(b);
      return sortAsc ? diff : -diff;
    });
  }, [filtered, sortKey, sortAsc]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortAsc((v) => !v);
    else { setSortKey(key); setSortAsc(false); }
  }

  function handleExport() {
    downloadCsv(
      "asa-efficiency.csv",
      ["Campaign", "Ad Group", "Keyword", "Spend (30d)", "Installs", "CPI", "Efficiency"],
      sorted.map((r) => [r.campaignName, r.adGroupName, r.text, r.spend ?? "", r.installs ?? "", r.cpi ?? "", r.efficiency])
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
            placeholder="Search keyword or campaign"
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
        <table className="w-full min-w-[760px] border-collapse">
          <thead>
            <tr className="border-b border-white/[0.07]">
              <SortTh col="text" label="Keyword" />
              <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500">Campaign / Ad Group</th>
              <SortTh col="spend" label="Spend (30d)" />
              <SortTh col="installs" label="Installs" />
              <SortTh col="cpi" label="CPI" />
              <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500">Efficiency</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => (
              <tr key={r.keywordId} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                <td className="px-3 py-2.5 text-sm text-gray-200">{r.text}</td>
                <td className="px-3 py-2.5 text-xs text-gray-500">{r.campaignName} / {r.adGroupName}</td>
                <td className="px-3 py-2.5 text-sm text-gray-300 tabular-nums">{money(r.spend, r.currency)}</td>
                <td className="px-3 py-2.5 text-sm text-gray-300 tabular-nums">{r.installs ?? "—"}</td>
                <td className="px-3 py-2.5 text-sm font-medium tabular-nums text-gray-200">{money(r.cpi, r.currency)}</td>
                <td className="px-3 py-2.5"><TagPill tag={r.efficiency} /></td>
              </tr>
            ))}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <MagnifyingGlassIcon className="size-8 text-gray-700 mb-3" />
            <p className="text-sm font-medium text-gray-400">No keywords match your search</p>
          </div>
        )}
      </div>
    </div>
  );
}

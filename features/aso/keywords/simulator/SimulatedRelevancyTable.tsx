"use client";

import { useState, useMemo } from "react";
import { ArrowsUpDownIcon, ChevronUpIcon, ChevronDownIcon, MagnifyingGlassIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { ColumnTooltip } from "@/features/aso/keywords/ColumnTooltip";
import type { SimulatorRow } from "./types";

const PAGE_SIZE = 25;

type SortKey = "term" | "currentRelevancy" | "simulatedRelevancy" | "relevancyDelta" | "currentOpportunity" | "simulatedOpportunity" | "opportunityDelta";

function formatScore(n: number | null): string {
  return n === null ? "—" : String(n);
}

function relevancyDelta(row: SimulatorRow, hasSimulated: boolean): number | null {
  if (!hasSimulated || row.simulatedRelevancy === null || row.currentRelevancy === null) return null;
  return row.simulatedRelevancy - row.currentRelevancy;
}

function opportunityDelta(row: SimulatorRow, hasSimulated: boolean): number | null {
  if (!hasSimulated || row.simulatedOpportunity === null || row.currentOpportunity === null) return null;
  return row.simulatedOpportunity - row.currentOpportunity;
}

function SortIcon({ active, dir }: { active: boolean; dir: "asc" | "desc" }) {
  if (!active) return <ArrowsUpDownIcon className="size-3 text-gray-700" />;
  return dir === "asc"
    ? <ChevronUpIcon className="size-3 text-indigo-400" />
    : <ChevronDownIcon className="size-3 text-indigo-400" />;
}

export function SimulatedRelevancyTable({ rows, hasSimulated }: { rows: SimulatorRow[]; hasSimulated: boolean }) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(0);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  const filtered = useMemo(() => {
    if (!search) return rows;
    return rows.filter((r) => r.term.toLowerCase().includes(search.toLowerCase()));
  }, [rows, search]);

  const sorted = useMemo(() => {
    if (!sortKey) {
      // No explicit sort chosen yet: surface the keywords whose opportunity
      // (volume/chance-weighted, so the more decision-relevant number) would
      // shift most, once a simulation has run — otherwise keep tracked order.
      if (!hasSimulated) return filtered;
      return [...filtered].sort((a, b) => Math.abs(opportunityDelta(b, hasSimulated) ?? 0) - Math.abs(opportunityDelta(a, hasSimulated) ?? 0));
    }
    if (sortKey === "term") {
      return [...filtered].sort((a, b) => sortDir === "asc" ? a.term.localeCompare(b.term) : b.term.localeCompare(a.term));
    }
    const getValue = (row: SimulatorRow): number | null => {
      if (sortKey === "relevancyDelta") return relevancyDelta(row, hasSimulated);
      if (sortKey === "opportunityDelta") return opportunityDelta(row, hasSimulated);
      return row[sortKey];
    };
    return [...filtered].sort((a, b) => {
      const av = getValue(a);
      const bv = getValue(b);
      // Nulls (not-yet-scored / not-yet-simulated) always sort to the end,
      // regardless of direction — an unscored keyword isn't "low", it's unknown.
      if (av === null && bv === null) return 0;
      if (av === null) return 1;
      if (bv === null) return -1;
      if (av === bv) return 0;
      const cmp = av < bv ? -1 : 1;
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir, hasSimulated]);

  // A search/sort change invalidates whatever page the user was on — jump
  // back to the first page rather than staying on a now-confusing page of a
  // differently-filtered result. Adjusted during render (not an effect) per
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
  const filterKey = `${search}|${sortKey}|${sortDir}`;
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (filterKey !== prevFilterKey) {
    setPrevFilterKey(filterKey);
    setPage(0);
  }

  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const pageRows = sorted.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  if (rows.length === 0) {
    return <p className="px-5 py-8 text-center text-sm text-gray-600">No tracked keywords yet — add some in Keyword Research first.</p>;
  }

  function headerButton(key: SortKey, label: string) {
    return (
      <button onClick={() => handleSort(key)} className={`ml-auto flex items-center gap-1 hover:text-gray-300 transition-colors ${sortKey === key ? "text-gray-300" : ""}`}>
        {label} <SortIcon active={sortKey === key} dir={sortDir} />
      </button>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.08]">
        <div className="relative flex-1 max-w-xs">
          <MagnifyingGlassIcon className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-gray-600" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search keyword…"
            className="w-full rounded-lg bg-[#0d0f14] ring-1 ring-white/[0.08] pl-8 pr-7 py-1.5 text-xs text-white placeholder:text-gray-600 outline-none focus:ring-indigo-500/40"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-300">
              <XMarkIcon className="size-3.5" />
            </button>
          )}
        </div>
      </div>

      {sorted.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-gray-600">No keywords match &ldquo;{search}&rdquo;.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="border-t border-white/[0.08] px-4 py-3 text-left font-medium text-gray-400">
                  <button onClick={() => handleSort("term")} className={`flex items-center gap-1 hover:text-gray-300 transition-colors ${sortKey === "term" ? "text-gray-300" : ""}`}>
                    Keyword <SortIcon active={sortKey === "term"} dir={sortDir} />
                  </button>
                </th>
                <th className="border-t border-white/[0.08] px-4 py-3 text-right font-medium text-gray-400">{headerButton("currentRelevancy", "Current Relevancy")}</th>
                <th className="border-t border-white/[0.08] px-4 py-3 text-right font-medium text-gray-400">{headerButton("simulatedRelevancy", "Simulated Relevancy")}</th>
                <th className="border-t border-white/[0.08] px-4 py-3 text-right font-medium text-gray-400">
                  <span className="ml-auto inline-flex items-center justify-end gap-1.5">
                    {headerButton("relevancyDelta", "Δ")}
                    <ColumnTooltip text="The predicted change in relevancy from applying this title/subtitle: Simulated Relevancy minus Current Relevancy." />
                  </span>
                </th>
                <th className="border-t border-white/[0.08] px-4 py-3 text-right font-medium text-gray-400">{headerButton("currentOpportunity", "Current Opportunity")}</th>
                <th className="border-t border-white/[0.08] px-4 py-3 text-right font-medium text-gray-400">{headerButton("simulatedOpportunity", "Simulated Opportunity")}</th>
                <th className="border-t border-white/[0.08] px-4 py-3 text-right font-medium text-gray-400">
                  <span className="ml-auto inline-flex items-center justify-end gap-1.5">
                    {headerButton("opportunityDelta", "Δ")}
                    <ColumnTooltip text="The predicted change in opportunity from applying this title/subtitle: Simulated Opportunity minus Current Opportunity. Opportunity already weighs relevancy by search volume and current rank chance, so this is the more decision-relevant number." />
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((row) => {
                const relDelta = relevancyDelta(row, hasSimulated);
                const relDeltaColor = relDelta === null ? "text-gray-600" : relDelta > 0 ? "text-green-400" : relDelta < 0 ? "text-red-400" : "text-gray-500";
                const relDeltaLabel = relDelta === null ? "—" : relDelta > 0 ? `+${relDelta}` : relDelta < 0 ? `${relDelta}` : "0";
                const oppDelta = opportunityDelta(row, hasSimulated);
                const oppDeltaColor = oppDelta === null ? "text-gray-600" : oppDelta > 0 ? "text-green-400" : oppDelta < 0 ? "text-red-400" : "text-gray-500";
                const oppDeltaLabel = oppDelta === null ? "—" : oppDelta > 0 ? `+${oppDelta}` : oppDelta < 0 ? `${oppDelta}` : "0";
                return (
                  <tr key={row.term}>
                    <td className="border-t border-white/[0.08] px-4 py-3 text-gray-200">{row.term}</td>
                    <td className="border-t border-white/[0.08] px-4 py-3 text-right text-gray-400">{formatScore(row.currentRelevancy)}</td>
                    <td className="border-t border-white/[0.08] px-4 py-3 text-right text-white">
                      {hasSimulated ? formatScore(row.simulatedRelevancy) : "—"}
                    </td>
                    <td className={`border-t border-white/[0.08] px-4 py-3 text-right font-medium ${relDeltaColor}`}>{relDeltaLabel}</td>
                    <td className="border-t border-white/[0.08] px-4 py-3 text-right text-gray-400">{formatScore(row.currentOpportunity)}</td>
                    <td className="border-t border-white/[0.08] px-4 py-3 text-right text-white">
                      {hasSimulated ? formatScore(row.simulatedOpportunity) : "—"}
                    </td>
                    <td className={`border-t border-white/[0.08] px-4 py-3 text-right font-medium ${oppDeltaColor}`}>{oppDeltaLabel}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {sorted.length > 0 && (
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-white/[0.08]">
          <span className="text-xs text-gray-600">{sorted.length} keyword{sorted.length !== 1 ? "s" : ""}</span>
          {pageCount > 1 && (
            <div className="flex items-center gap-3">
              <button
                onClick={() => setPage(safePage - 1)}
                disabled={safePage === 0}
                className="text-xs font-medium text-gray-400 hover:text-white disabled:opacity-30 disabled:hover:text-gray-400 transition-colors"
              >
                ‹ Prev
              </button>
              <span className="text-xs text-gray-600 tabular-nums">Page {safePage + 1} of {pageCount}</span>
              <button
                onClick={() => setPage(safePage + 1)}
                disabled={safePage >= pageCount - 1}
                className="text-xs font-medium text-gray-400 hover:text-white disabled:opacity-30 disabled:hover:text-gray-400 transition-colors"
              >
                Next ›
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

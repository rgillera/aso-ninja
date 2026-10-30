"use client";

import { useState, useMemo } from "react";
import { ArrowsUpDownIcon, ChevronUpIcon, ChevronDownIcon, MagnifyingGlassIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { ColumnTooltip } from "@/features/aso/keywords/ColumnTooltip";
import { COVERAGE_STRENGTH, type Coverage } from "./coverage";
import type { SimulatorRow } from "./types";

const PAGE_SIZE = 25;

type SortKey = "term" | "volume" | "rank" | "relevancy" | "change";

const COVERAGE_COLOR: Record<Coverage, string> = {
  title: "text-green-400 light:text-green-600",
  split: "text-green-400/80 light:text-green-600/80",
  subtitle: "text-sky-400 light:text-sky-600",
  partial: "text-amber-400 light:text-amber-600",
  none: "text-gray-600 light:text-gray-400",
};

function coverageLabel(c: Coverage, subtitleLabel: string): string {
  switch (c) {
    case "title": return "Title";
    case "split": return `Title + ${subtitleLabel}`;
    case "subtitle": return subtitleLabel;
    case "partial": return "Some words";
    case "none": return "Not covered";
  }
}

function changeOf(row: SimulatorRow): number {
  return COVERAGE_STRENGTH[row.simulatedCoverage] - COVERAGE_STRENGTH[row.currentCoverage];
}

const isFull = (c: Coverage) => c !== "partial" && c !== "none";

// "Gained"/"Lost" when the whole keyword enters or leaves the index, which
// matters far more than moving between fields.
function changeLabel(row: SimulatorRow): { label: string; color: string } {
  const delta = changeOf(row);
  if (delta === 0) return { label: "No change", color: "text-gray-600 light:text-gray-400" };
  if (!isFull(row.currentCoverage) && isFull(row.simulatedCoverage)) return { label: "Gained", color: "text-green-400 light:text-green-600" };
  if (isFull(row.currentCoverage) && !isFull(row.simulatedCoverage)) return { label: "Lost", color: "text-red-400 light:text-red-600" };
  return delta > 0
    ? { label: "Stronger", color: "text-green-400/80 light:text-green-600/80" }
    : { label: "Weaker", color: "text-red-400/80 light:text-red-600/80" };
}

function SortIcon({ active, dir }: { active: boolean; dir: "asc" | "desc" }) {
  if (!active) return <ArrowsUpDownIcon className="size-3 text-gray-700 light:text-gray-300" />;
  return dir === "asc"
    ? <ChevronUpIcon className="size-3 text-indigo-400 light:text-indigo-600" />
    : <ChevronDownIcon className="size-3 text-indigo-400 light:text-indigo-600" />;
}

export function SimulatedCoverageTable({ rows, subtitleLabel }: { rows: SimulatorRow[]; subtitleLabel: string }) {
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
      // No explicit sort chosen: keywords the edit changes come first (biggest
      // change, then biggest volume), so the consequences of the edit are the
      // first thing on screen; everything else follows by volume.
      return [...filtered].sort((a, b) =>
        Math.abs(changeOf(b)) - Math.abs(changeOf(a)) || b.volume - a.volume);
    }
    if (sortKey === "term") {
      return [...filtered].sort((a, b) => sortDir === "asc" ? a.term.localeCompare(b.term) : b.term.localeCompare(a.term));
    }
    const getValue = (row: SimulatorRow): number | null => (sortKey === "change" ? changeOf(row) : row[sortKey]);
    return [...filtered].sort((a, b) => {
      const av = getValue(a);
      const bv = getValue(b);
      // Nulls (unranked / not yet scored) always sort to the end, regardless
      // of direction: unknown isn't "low".
      if (av === null && bv === null) return 0;
      if (av === null) return 1;
      if (bv === null) return -1;
      if (av === bv) return 0;
      const cmp = av < bv ? -1 : 1;
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

  // A search/sort change invalidates whatever page the user was on — jump
  // back to the first page. Adjusted during render (not an effect) per
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
    return <p className="px-5 py-8 text-center text-sm text-gray-600 light:text-gray-400">No tracked keywords yet. Add some in Keyword Research first.</p>;
  }

  function headerButton(key: SortKey, label: string) {
    return (
      <button onClick={() => handleSort(key)} className={`ml-auto flex items-center gap-1 hover:text-gray-300 light:hover:text-gray-700 transition-colors ${sortKey === key ? "text-gray-300 light:text-gray-700" : ""}`}>
        {label} <SortIcon active={sortKey === key} dir={sortDir} />
      </button>
    );
  }

  const th = "border-t border-white/[0.08] light:border-black/[0.08] px-4 py-3 text-right font-medium text-gray-400 light:text-gray-600";
  const td = "border-t border-white/[0.08] light:border-black/[0.08] px-4 py-3 text-right";

  return (
    <div>
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.08] light:border-black/[0.08]">
        <div className="relative flex-1 max-w-xs">
          <MagnifyingGlassIcon className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-gray-600 light:text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search keyword…"
            className="w-full rounded-lg bg-[#0a0a0c] light:bg-gray-50 pl-8 pr-7 py-1.5 text-xs text-white placeholder:text-gray-600 light:text-gray-400 outline-none focus:ring-indigo-500/40"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-600 light:text-gray-400 hover:text-gray-300 light:hover:text-gray-700">
              <XMarkIcon className="size-3.5" />
            </button>
          )}
        </div>
      </div>

      {sorted.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-gray-600 light:text-gray-400">No keywords match &ldquo;{search}&rdquo;.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="border-t border-white/[0.08] light:border-black/[0.08] px-4 py-3 text-left font-medium text-gray-400 light:text-gray-600">
                  <button onClick={() => handleSort("term")} className={`flex items-center gap-1 hover:text-gray-300 light:hover:text-gray-700 transition-colors ${sortKey === "term" ? "text-gray-300 light:text-gray-700" : ""}`}>
                    Keyword <SortIcon active={sortKey === "term"} dir={sortDir} />
                  </button>
                </th>
                <th className={th}>{headerButton("volume", "Volume")}</th>
                <th className={th}>{headerButton("rank", "Rank")}</th>
                <th className={th}>
                  <span className="ml-auto inline-flex items-center justify-end gap-1.5">
                    {headerButton("relevancy", "Relevancy")}
                    <ColumnTooltip text="How well your app serves what people searching this keyword want. High relevancy keywords are the ones worth putting in your title or subtitle." />
                  </span>
                </th>
                <th className={th}>Now</th>
                <th className={th}>With edit</th>
                <th className={th}>
                  <span className="ml-auto inline-flex items-center justify-end gap-1.5">
                    {headerButton("change", "Change")}
                    <ColumnTooltip text={`Whether the edit adds or removes this keyword from your title and ${subtitleLabel.toLowerCase()}, which the store uses to rank you for it. The title counts more than the ${subtitleLabel.toLowerCase()}.`} />
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((row) => {
                const change = changeLabel(row);
                return (
                  <tr key={row.term}>
                    <td className="border-t border-white/[0.08] light:border-black/[0.08] px-4 py-3 text-gray-200 light:text-gray-800">{row.term}</td>
                    <td className={`${td} text-gray-400 light:text-gray-600 tabular-nums`}>{row.volume}</td>
                    <td className={`${td} text-gray-400 light:text-gray-600 tabular-nums`}>{row.rank ?? "—"}</td>
                    <td className={`${td} text-gray-400 light:text-gray-600 tabular-nums`}>{row.relevancy ?? "—"}</td>
                    <td className={`${td} ${COVERAGE_COLOR[row.currentCoverage]}`}>{coverageLabel(row.currentCoverage, subtitleLabel)}</td>
                    <td className={`${td} ${COVERAGE_COLOR[row.simulatedCoverage]}`}>{coverageLabel(row.simulatedCoverage, subtitleLabel)}</td>
                    <td className={`${td} font-medium ${change.color}`}>{change.label}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {sorted.length > 0 && (
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-white/[0.08] light:border-black/[0.08]">
          <span className="text-xs text-gray-600 light:text-gray-400">{sorted.length} keyword{sorted.length !== 1 ? "s" : ""}</span>
          {pageCount > 1 && (
            <div className="flex items-center gap-3">
              <button
                onClick={() => setPage(safePage - 1)}
                disabled={safePage === 0}
                className="text-xs font-medium text-gray-400 light:text-gray-600 hover:text-white light:hover:text-gray-900 disabled:opacity-30 disabled:hover:text-gray-400 light:hover:text-gray-600 transition-colors"
              >
                ‹ Prev
              </button>
              <span className="text-xs text-gray-600 light:text-gray-400 tabular-nums">Page {safePage + 1} of {pageCount}</span>
              <button
                onClick={() => setPage(safePage + 1)}
                disabled={safePage >= pageCount - 1}
                className="text-xs font-medium text-gray-400 light:text-gray-600 hover:text-white light:hover:text-gray-900 disabled:opacity-30 disabled:hover:text-gray-400 light:hover:text-gray-600 transition-colors"
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

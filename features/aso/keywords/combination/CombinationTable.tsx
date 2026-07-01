"use client";

import { Fragment, useState } from "react";
import {
  PlusIcon,
  XMarkIcon,
  StarIcon,
  CheckIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ArrowsUpDownIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import { VolumeBar } from "@/features/aso/keywords/research/ui";
import { SelectionActionBar } from "@/features/aso/keywords/SelectionActionBar";
import type { CombinationGroup } from "./types";

type SortKey = "keyword" | "combinations" | "volume" | "totalResults" | "results";

type Props = {
  groups: CombinationGroup[];
  trackedSet: Set<string>;
  pendingSet: Set<string>;
  availableSeeds: string[];
  onAddSeeds: (seeds: string[]) => void;
  onToggleExpand: (seed: string) => void;
  onToggleStar: (seed: string, term: string) => void;
  onAddTerm: (term: string) => void;
  onAddTerms: (terms: string[]) => void;
  onDeleteTerms: (terms: string[]) => void;
  onRemoveGroup: (seed: string) => void;
  onLiveSearch: (term: string) => void;
};

function formatNum(n: number): string {
  return n.toLocaleString();
}

function SortIcon({ active, dir }: { active: boolean; dir: "asc" | "desc" }) {
  if (!active) return <ArrowsUpDownIcon className="size-3 text-gray-700" />;
  return dir === "asc"
    ? <ChevronUpIcon className="size-3 text-indigo-400" />
    : <ChevronDownIcon className="size-3 text-indigo-400" />;
}

function groupAggregates(group: CombinationGroup) {
  const combinations  = group.children.length;
  const avgVol        = combinations ? Math.round(group.children.reduce((s, c) => s + c.volume, 0) / combinations) : 0;
  const totalResults  = group.children.reduce((s, c) => s + c.results, 0);
  const avgResults    = combinations ? Math.round(group.children.reduce((s, c) => s + c.results, 0) / combinations) : 0;
  return { combinations, avgVol, totalResults, avgResults };
}

export function CombinationTable({
  groups, trackedSet, pendingSet, availableSeeds, onAddSeeds, onToggleExpand, onToggleStar, onAddTerm, onAddTerms, onDeleteTerms, onRemoveGroup, onLiveSearch,
}: Props) {
  const [seedInput, setSeedInput] = useState("");
  const [selected,  setSelected]  = useState<Set<string>>(new Set());
  const [sortKey,   setSortKey]   = useState<SortKey | null>(null);
  const [sortDir,   setSortDir]   = useState<"asc" | "desc">("desc");
  const [showAllSeeds, setShowAllSeeds] = useState(false);

  const SEED_PREVIEW_COUNT = 10;
  const visibleSeeds = showAllSeeds ? availableSeeds : availableSeeds.slice(0, SEED_PREVIEW_COUNT);

  function handleAdd() {
    const parts = seedInput.split(",").map((s) => s.trim()).filter(Boolean);
    if (!parts.length) return;
    onAddSeeds(parts);
    setSeedInput("");
  }

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  }

  function toggleChild(term: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(term) ? next.delete(term) : next.add(term);
      return next;
    });
  }

  function toggleGroupSelect(group: CombinationGroup) {
    const terms = group.children.map((c) => c.term);
    const allSelected = terms.every((t) => selected.has(t));
    setSelected((prev) => {
      const next = new Set(prev);
      terms.forEach((t) => allSelected ? next.delete(t) : next.add(t));
      return next;
    });
  }

  const sortedGroups = sortKey ? [...groups].sort((a, b) => {
    const aggA = groupAggregates(a), aggB = groupAggregates(b);
    let cmp = 0;
    if (sortKey === "keyword") cmp = a.seed.localeCompare(b.seed);
    else if (sortKey === "combinations") cmp = aggA.combinations - aggB.combinations;
    else if (sortKey === "volume") cmp = aggA.avgVol - aggB.avgVol;
    else if (sortKey === "totalResults") cmp = aggA.totalResults - aggB.totalResults;
    else if (sortKey === "results") cmp = aggA.avgResults - aggB.avgResults;
    return sortDir === "asc" ? cmp : -cmp;
  }) : groups;

  return (
    <div className="mx-6 mb-6 rounded-xl bg-[#1a1d24] ring-1 ring-white/[0.07] overflow-hidden">
      {/* Add seed keywords */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.07]">
        <div className="flex-1 flex items-center rounded-lg bg-[#0d0f14] ring-1 ring-white/[0.08] focus-within:ring-indigo-500/40 px-3 py-2 transition-all">
          <input
            value={seedInput}
            onChange={(e) => setSeedInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder="Add keywords separated with a comma e.g: games,…"
            className="flex-1 bg-transparent text-xs text-gray-300 placeholder-gray-600 outline-none"
          />
        </div>
        <button
          onClick={handleAdd}
          className="flex items-center gap-1.5 rounded-lg bg-indigo-500 hover:bg-indigo-400 px-4 py-2 text-xs font-semibold text-white transition-colors shrink-0"
        >
          <PlusIcon className="size-3.5" />
          Add
        </button>
      </div>

      {availableSeeds.length > 0 && (
        <div className="px-4 py-3 border-b border-white/[0.07]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">From Keyword Research</span>
            <button
              onClick={() => onAddSeeds(availableSeeds)}
              className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              + Add all
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {visibleSeeds.map((term) => (
              <button
                key={term}
                onClick={() => onAddSeeds([term])}
                className="flex items-center gap-1 rounded-md bg-[#0d0f14] ring-1 ring-white/[0.08] text-gray-300 hover:ring-indigo-500/50 hover:text-white px-2.5 py-1 text-xs transition-all"
              >
                <PlusIcon className="size-3 text-gray-500 shrink-0" />
                {term}
              </button>
            ))}
            {availableSeeds.length > SEED_PREVIEW_COUNT && (
              <button
                onClick={() => setShowAllSeeds((v) => !v)}
                className="flex items-center rounded-md px-2.5 py-1 text-xs text-gray-500 hover:text-gray-300 transition-colors"
              >
                {showAllSeeds ? "Show less" : `+${availableSeeds.length - SEED_PREVIEW_COUNT} more`}
              </button>
            )}
          </div>
        </div>
      )}


      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/[0.07]">
              <th className="w-10 px-4 py-3 text-left" />
              <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-600 whitespace-nowrap">
                <button onClick={() => handleSort("keyword")} className={`flex items-center gap-1 hover:text-gray-400 transition-colors ${sortKey === "keyword" ? "text-gray-300" : ""}`}>
                  Keywords <SortIcon active={sortKey === "keyword"} dir={sortDir} />
                </button>
              </th>
              <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-600 whitespace-nowrap">
                <button onClick={() => handleSort("combinations")} className={`flex items-center gap-1 hover:text-gray-400 transition-colors ${sortKey === "combinations" ? "text-gray-300" : ""}`}>
                  Combinations <SortIcon active={sortKey === "combinations"} dir={sortDir} />
                </button>
              </th>
              <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-600 whitespace-nowrap">
                <button onClick={() => handleSort("volume")} className={`flex items-center gap-1 hover:text-gray-400 transition-colors ${sortKey === "volume" ? "text-gray-300" : ""}`}>
                  Avg.Vol. <SortIcon active={sortKey === "volume"} dir={sortDir} />
                </button>
              </th>
              <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-600 whitespace-nowrap">
                <button onClick={() => handleSort("totalResults")} className={`flex items-center gap-1 hover:text-gray-400 transition-colors ${sortKey === "totalResults" ? "text-gray-300" : ""}`}>
                  Total Competition <SortIcon active={sortKey === "totalResults"} dir={sortDir} />
                </button>
              </th>
              <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-600 whitespace-nowrap">
                <button onClick={() => handleSort("results")} className={`flex items-center gap-1 hover:text-gray-400 transition-colors ${sortKey === "results" ? "text-gray-300" : ""}`}>
                  Avg.Competition <SortIcon active={sortKey === "results"} dir={sortDir} />
                </button>
              </th>
              <th className="w-24 pr-4" />
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {sortedGroups.map((group) => {
              const agg = groupAggregates(group);
              const terms = group.children.map((c) => c.term);
              const groupChecked = terms.length > 0 && terms.every((t) => selected.has(t));
              const pendingCount = group.children.filter((c) => pendingSet.has(c.term.toLowerCase())).length;
              return (
                <Fragment key={group.seed}>
                  <tr className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-4 py-3.5">
                      <input
                        type="checkbox"
                        checked={groupChecked}
                        onChange={() => toggleGroupSelect(group)}
                        disabled={!terms.length}
                        className="rounded border-gray-700 bg-[#0d0f14] text-indigo-500 accent-indigo-500"
                      />
                    </td>
                    <td className="px-4 py-3.5">
                      <button
                        onClick={() => onToggleExpand(group.seed)}
                        className="flex items-center gap-1.5 text-sm font-medium text-white"
                      >
                        {group.expanded
                          ? <ChevronDownIcon className="size-3.5 text-gray-500 shrink-0" />
                          : <ChevronRightIcon className="size-3.5 text-gray-500 shrink-0" />}
                        {group.seed}
                      </button>
                      {pendingCount > 0 && (
                        <span className="ml-2 inline-flex items-center gap-1 text-[10px] text-indigo-400">
                          <div className="size-2.5 rounded-full border border-indigo-400 border-t-transparent animate-spin" />
                          Adding {pendingCount}…
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-sm text-gray-300">
                      {group.loading ? <div className="h-3 w-6 rounded bg-white/[0.06] animate-pulse" /> : agg.combinations}
                    </td>
                    <td className="px-4 py-3.5">
                      {group.loading ? <div className="h-3 w-12 rounded bg-white/[0.06] animate-pulse" /> : <VolumeBar value={agg.avgVol} />}
                    </td>
                    <td className="px-4 py-3.5 text-sm text-gray-300 tabular-nums">
                      {group.loading ? <div className="h-3 w-14 rounded bg-white/[0.06] animate-pulse" /> : formatNum(agg.totalResults)}
                    </td>
                    <td className="px-4 py-3.5 text-sm text-gray-300 tabular-nums">
                      {group.loading ? <div className="h-3 w-10 rounded bg-white/[0.06] animate-pulse" /> : formatNum(agg.avgResults)}
                    </td>
                    <td className="pr-4 py-3.5">
                      <button
                        onClick={() => onRemoveGroup(group.seed)}
                        className="flex items-center justify-center rounded px-2 py-1 text-[10px] font-medium bg-[#0d0f14] ring-1 ring-white/[0.08] text-gray-400 hover:text-red-400 hover:ring-red-500/30 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <XMarkIcon className="size-3" />
                      </button>
                    </td>
                  </tr>

                  {group.expanded && group.children.map((child) => {
                    const tracked = trackedSet.has(child.term.toLowerCase());
                    const pending = pendingSet.has(child.term.toLowerCase());
                    return (
                      <tr key={child.term} className="hover:bg-white/[0.02] transition-colors group bg-white/[0.01]">
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selected.has(child.term)}
                            onChange={() => toggleChild(child.term)}
                            disabled={tracked || pending}
                            className="rounded border-gray-700 bg-[#0d0f14] text-indigo-500 accent-indigo-500 disabled:opacity-40"
                          />
                        </td>
                        <td className="px-4 py-3 pl-9">
                          <div className="flex items-center gap-1.5">
                            <button onClick={() => onToggleStar(group.seed, child.term)} className="shrink-0 transition-colors">
                              <StarIcon className={`size-3.5 ${child.starred ? "fill-amber-400 text-amber-400" : "text-gray-600"}`} />
                            </button>
                            <span className="text-sm text-gray-300">{child.term}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">—</td>
                        <td className="px-4 py-3">
                          {group.loading ? <div className="h-3 w-16 rounded bg-white/[0.06] animate-pulse" /> : <VolumeBar value={child.volume} />}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-300 tabular-nums">
                          {group.loading ? <div className="h-3 w-10 rounded bg-white/[0.06] animate-pulse" /> : formatNum(child.results)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-300 tabular-nums">
                          {group.loading ? <div className="h-3 w-10 rounded bg-white/[0.06] animate-pulse" /> : formatNum(child.results)}
                        </td>
                        <td className="pr-4 py-3">
                          <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => onLiveSearch(child.term)}
                              className="flex items-center gap-1 rounded px-2 py-1 text-[10px] font-medium bg-[#0d0f14] ring-1 ring-white/[0.08] text-gray-400 hover:text-white transition-colors whitespace-nowrap"
                            >
                              <MagnifyingGlassIcon className="size-3" />
                            </button>
                            <button
                              onClick={() => !tracked && !pending && onAddTerm(child.term)}
                              disabled={tracked || pending}
                              className={`flex items-center justify-center rounded px-2 py-1 text-[10px] font-medium ring-1 transition-colors ${
                                tracked
                                  ? "bg-indigo-500/20 ring-indigo-500/40 text-indigo-300"
                                  : pending
                                  ? "bg-white/[0.04] ring-white/[0.08] text-gray-600 cursor-wait"
                                  : "bg-[#0d0f14] ring-white/[0.08] text-gray-400 hover:text-white"
                              }`}
                            >
                              {tracked
                                ? <CheckIcon className="size-3" />
                                : pending
                                ? <div className="size-3 rounded-full border border-gray-500 border-t-transparent animate-spin" />
                                : <PlusIcon className="size-3" />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </Fragment>
              );
            })}
          </tbody>
        </table>

        {groups.length === 0 && (
          <div className="py-16 text-center">
            <MagnifyingGlassIcon className="size-8 text-gray-700 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-400">No keywords added yet</p>
            <p className="mt-1 text-xs text-gray-600">Add a seed keyword above to generate combinations.</p>
          </div>
        )}
      </div>

      <SelectionActionBar
        count={selected.size}
        total={groups.reduce((s, g) => s + g.children.length, 0)}
        onClear={() => setSelected(new Set())}
        onCopy={() => navigator.clipboard.writeText([...selected].join("\n")).catch(() => {})}
        onAdd={() => { onAddTerms([...selected]); setSelected(new Set()); }}
        onDelete={() => { onDeleteTerms([...selected]); setSelected(new Set()); }}
      />
    </div>
  );
}

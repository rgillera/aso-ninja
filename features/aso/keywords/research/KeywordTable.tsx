"use client";

import { useState, useMemo } from "react";
import {
  ChevronDownIcon,
  PlusIcon,
  XMarkIcon,
  StarIcon,
  CheckIcon,
  MagnifyingGlassIcon,
  TableCellsIcon,
  ArrowsUpDownIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import { Toggle, VolumeBar, GrowthCell } from "./ui";
import type { Keyword } from "./types";

type Props = {
  keywords: Keyword[];
  translateToggle: boolean;
  onTranslateToggle: () => void;
  onAddKeywords: (keywords: string[]) => void;
  onToggleStar: (index: number) => void;
  onRemoveSelected: (indices: Set<number>) => void;
};

const COLUMNS = ["Keywords", "Volume", "Max. Volume", "Diff.", "Chance", "KEI", "Rank", "Growth"];

export function KeywordTable({
  keywords,
  translateToggle,
  onTranslateToggle,
  onAddKeywords,
  onToggleStar,
  onRemoveSelected,
}: Props) {
  const [keywordInput, setKeywordInput] = useState("");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [tableFilter, setTableFilter] = useState<"all" | "checked" | "starred">("all");

  function handleAdd() {
    const parts = keywordInput.split(",").map((s) => s.trim()).filter(Boolean);
    if (!parts.length) return;
    onAddKeywords(parts);
    setKeywordInput("");
  }

  function toggleSelect(i: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  }

  const displayed = useMemo(() => {
    if (tableFilter === "starred") return keywords.filter((k) => k.starred);
    if (tableFilter === "checked") return keywords.filter((_, i) => selected.has(i));
    return keywords;
  }, [keywords, tableFilter, selected]);

  const allSelected = displayed.length > 0 && displayed.every((_, i) => selected.has(i));

  function handleRemoveSelected() {
    onRemoveSelected(selected);
    setSelected(new Set());
  }

  return (
    <div className="mx-6 mb-6 rounded-xl bg-[#1a1d24] ring-1 ring-white/[0.07] overflow-hidden">
      {/* Filter toolbar */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.07] flex-wrap gap-y-2">
        <button className="flex items-center gap-1.5 rounded-lg bg-[#0d0f14] ring-1 ring-white/[0.08] px-3 py-1.5 text-xs text-gray-400 hover:text-white transition-colors">
          <MagnifyingGlassIcon className="size-3.5" />
          Keyword
          <ChevronDownIcon className="size-3 text-gray-600" />
        </button>
        <button className="flex items-center gap-1.5 rounded-lg bg-[#0d0f14] ring-1 ring-white/[0.08] px-3 py-1.5 text-xs text-gray-400 hover:text-white transition-colors">
          Volume
          <ChevronDownIcon className="size-3 text-gray-600" />
        </button>
        <button className="flex items-center gap-1.5 rounded-lg bg-[#0d0f14] ring-1 ring-white/[0.08] px-3 py-1.5 text-xs text-gray-400 hover:text-white transition-colors">
          Rank
          <ChevronDownIcon className="size-3 text-gray-600" />
        </button>
        <button className="flex items-center gap-1.5 rounded-lg bg-[#0d0f14] ring-1 ring-white/[0.08] px-3 py-1.5 text-xs text-gray-400 hover:text-white transition-colors">
          <SparklesIcon className="size-3 text-violet-400" />
          Relevancy
          <ChevronDownIcon className="size-3 text-gray-600" />
        </button>

        {/* All / checked / starred segment */}
        <div className="flex items-center rounded-lg bg-[#0d0f14] ring-1 ring-white/[0.08] p-0.5">
          <button
            onClick={() => setTableFilter("all")}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${tableFilter === "all" ? "bg-white/10 text-white" : "text-gray-500 hover:text-white"}`}
          >
            All
          </button>
          <button
            onClick={() => setTableFilter("checked")}
            className={`rounded-md p-1.5 transition-colors ${tableFilter === "checked" ? "bg-white/10 text-white" : "text-gray-500 hover:text-white"}`}
          >
            <CheckIcon className="size-3.5" />
          </button>
          <button
            onClick={() => setTableFilter("starred")}
            className={`rounded-md p-1.5 transition-colors ${tableFilter === "starred" ? "bg-white/10 text-yellow-400" : "text-gray-500 hover:text-white"}`}
          >
            <StarIcon className="size-3.5" />
          </button>
        </div>

        <button className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-400 transition-colors">
          <PlusIcon className="size-3.5" />
          Add filters
        </button>
        <button
          onClick={() => setTableFilter("all")}
          className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-400 transition-colors"
        >
          <XMarkIcon className="size-3.5" />
          Clear
        </button>

        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-gray-500">Translate to English</span>
          <Toggle checked={translateToggle} onChange={onTranslateToggle} />
        </div>
      </div>

      {/* Add competitors */}
      <div className="px-4 py-2.5 border-b border-white/[0.07]">
        <button className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-400 transition-colors">
          <PlusIcon className="size-3.5" />
          Add competitors to compare
        </button>
      </div>

      {/* Add keyword input */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.07]">
        <div className="flex-1 flex items-center rounded-lg bg-[#0d0f14] ring-1 ring-white/[0.08] focus-within:ring-indigo-500/40 px-3 py-2 transition-all">
          <input
            value={keywordInput}
            onChange={(e) => setKeywordInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder="Enter comma-separated keywords to add…"
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
        <button className="flex items-center gap-1.5 rounded-lg bg-[#0d0f14] ring-1 ring-white/[0.08] px-3 py-2 text-xs text-gray-400 hover:text-white transition-colors shrink-0">
          <TableCellsIcon className="size-3.5" />
          Edit columns
          <ChevronDownIcon className="size-3 text-gray-600" />
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/[0.07]">
              <th className="w-10 px-4 py-3 text-left">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={() =>
                    setSelected(allSelected ? new Set() : new Set(displayed.map((_, i) => i)))
                  }
                  className="rounded border-gray-700 bg-[#0d0f14] text-indigo-500 accent-indigo-500"
                />
              </th>
              {COLUMNS.map((col) => (
                <th
                  key={col}
                  className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-600 whitespace-nowrap"
                >
                  <button className="flex items-center gap-1 hover:text-gray-400 transition-colors">
                    {col}
                    <ArrowsUpDownIcon className="size-3 text-gray-700" />
                  </button>
                </th>
              ))}
              <th className="w-4 pr-4" />
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {displayed.map((row, i) => (
              <tr key={i} className="hover:bg-white/[0.02] transition-colors group">
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onToggleStar(i)}
                      className={`transition-opacity shrink-0 ${row.starred ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
                    >
                      <StarIcon className={`size-3.5 ${row.starred ? "fill-yellow-400 text-yellow-400" : "text-gray-600"}`} />
                    </button>
                    <input
                      type="checkbox"
                      checked={selected.has(i)}
                      onChange={() => toggleSelect(i)}
                      className="rounded border-gray-700 bg-[#0d0f14] text-indigo-500 accent-indigo-500"
                    />
                  </div>
                </td>
                <td className="px-4 py-3.5">
                  <span className="text-sm text-gray-200">{row.keyword}</span>
                </td>
                <td className="px-4 py-3.5"><VolumeBar value={row.volume} /></td>
                <td className="px-4 py-3.5"><VolumeBar value={row.maxVolume} /></td>
                <td className="px-4 py-3.5">
                  <span className={`text-sm ${row.diff > 60 ? "text-red-400" : row.diff > 40 ? "text-yellow-400" : "text-emerald-400"}`}>
                    {row.diff}
                  </span>
                </td>
                <td className="px-4 py-3.5">
                  <span className={`text-sm ${row.chance > 15 ? "text-emerald-400" : "text-gray-400"}`}>
                    {row.chance}
                  </span>
                </td>
                <td className="px-4 py-3.5">
                  <span className="text-sm text-gray-300">{row.kei}</span>
                </td>
                <td className="px-4 py-3.5">
                  <span className="text-xs text-gray-500 italic">{row.rank}</span>
                </td>
                <td className="px-4 py-3.5">
                  <GrowthCell value={row.growth} />
                </td>
                <td className="pr-4 py-3.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button className="flex items-center gap-1 rounded px-2 py-1 text-[10px] font-medium bg-[#0d0f14] ring-1 ring-white/[0.08] text-gray-400 hover:text-white transition-colors whitespace-nowrap">
                    <MagnifyingGlassIcon className="size-3" />
                    Live search
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {displayed.length === 0 && (
          <div className="py-16 text-center">
            <MagnifyingGlassIcon className="size-8 text-gray-700 mx-auto mb-3" />
            <p className="text-sm text-gray-600">No keywords yet — add some above.</p>
          </div>
        )}
      </div>

      {/* Footer */}
      {displayed.length > 0 && (
        <div className="px-4 py-2.5 border-t border-white/[0.07] flex items-center justify-between">
          <span className="text-xs text-gray-600">
            {displayed.length} keyword{displayed.length !== 1 ? "s" : ""}
            {selected.size > 0 && ` · ${selected.size} selected`}
          </span>
          {selected.size > 0 && (
            <button
              onClick={handleRemoveSelected}
              className="text-xs text-red-400 hover:text-red-300 transition-colors"
            >
              Remove selected
            </button>
          )}
        </div>
      )}
    </div>
  );
}

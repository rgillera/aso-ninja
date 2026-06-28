"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
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
  ArrowTrendingUpIcon,
} from "@heroicons/react/24/outline";
import { Toggle, VolumeBar } from "./ui";
import { VolumeHistoryPanel } from "./VolumeHistoryPanel";
import type { Keyword } from "./types";

type Props = {
  keywords: Keyword[];
  store: "ios" | "android";
  country: string;
  translateToggle: boolean;
  onTranslateToggle: () => void;
  onAddKeywords: (keywords: string[]) => void;
  onToggleStar: (index: number) => void;
  onRemoveSelected: (indices: Set<number>) => void;
};

type ColumnDef = {
  key: string;
  label: string;
  tableLabel?: string;
  smart?: boolean;
  isNew?: boolean;
  defaultVisible: boolean;
  tooltip: string;
};

const COLUMN_DEFS: ColumnDef[] = [
  { key: "volume",      label: "Volume",        defaultVisible: true,  tooltip: "Search popularity (0–100), estimated from how many apps target this keyword in their title vs. total search results. Higher = more apps competing for it, which correlates with search demand." },
  { key: "results",     label: "Results",       defaultVisible: false, tooltip: "Number of apps returned when searching this keyword. More results = more competition." },
  { key: "diff",        label: "Difficulty",    defaultVisible: true,  tableLabel: "Diff.", tooltip: "How hard it is to rank (0–100), based on the average ratings of top-ranking apps. Higher = harder to break in." },
  { key: "chance",      label: "Chance",        defaultVisible: true,  tooltip: "Your likelihood of ranking for this keyword (0–100). Inverse of Difficulty — higher is better." },
  { key: "relevancy",   label: "Relevancy",     defaultVisible: true,  smart: true, tooltip: "How well this keyword matches your app (0–100), based on word overlap with your app name and the titles of top search results." },
  { key: "opportunity", label: "Opportunity",   defaultVisible: true,  smart: true, tooltip: "Combined score (0–100): geometric mean of Volume and Chance, scaled by Relevancy (0.3–1×). Both Volume and Chance must be strong for a high score — a keyword you can't rank for scores low regardless of its popularity." },
  { key: "rank",        label: "App Rank",      defaultVisible: true,  tooltip: "Your app's current position in search results for this keyword. Lower is better — blank means your app wasn't found in the top results." },
];

const DEFAULT_VISIBLE = new Set(
  COLUMN_DEFS.filter((c) => c.defaultVisible).map((c) => c.key)
);


function ColumnTooltip({ text }: { text: string }) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  return (
    <span
      className="inline-flex items-center"
      onMouseEnter={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        setPos({ x: r.left + r.width / 2, y: r.top });
      }}
      onMouseLeave={() => setPos(null)}
    >
      <span className="flex items-center justify-center size-3.5 rounded-full border border-gray-600 text-[8px] font-bold text-gray-500 hover:border-gray-400 hover:text-gray-300 cursor-default transition-colors leading-none select-none">
        ?
      </span>
      {pos && createPortal(
        <div
          style={{ position: "fixed", left: pos.x, top: pos.y - 8, transform: "translate(-50%, -100%)", zIndex: 99999 }}
          className="w-52 rounded-lg bg-[#0d0f14] ring-1 ring-white/[0.12] px-3 py-2.5 text-xs text-gray-300 leading-relaxed shadow-2xl pointer-events-none"
        >
          {text}
        </div>,
        document.body
      )}
    </span>
  );
}

export function KeywordTable({
  keywords,
  store,
  country,
  translateToggle,
  onTranslateToggle,
  onAddKeywords,
  onToggleStar,
  onRemoveSelected,
}: Props) {
  const [keywordInput, setKeywordInput] = useState("");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [tableFilter, setTableFilter] = useState<"all" | "checked" | "starred">("all");
  const [visibleCols, setVisibleCols] = useState<Set<string>>(DEFAULT_VISIBLE);
  const [colPickerOpen, setColPickerOpen] = useState(false);
  const [colSearch, setColSearch] = useState("");
  const [historyKeyword, setHistoryKeyword] = useState<string | null>(null);
  const colPickerRef = useRef<HTMLDivElement>(null);
  const colPickerMenuRef = useRef<HTMLDivElement>(null);
  const pickerRectRef = useRef<{ top: number; right: number } | null>(null);

  useEffect(() => {
    if (!colPickerOpen) return;
    function onMouseDown(e: MouseEvent) {
      if (
        colPickerRef.current?.contains(e.target as Node) ||
        colPickerMenuRef.current?.contains(e.target as Node)
      ) return;
      setColPickerOpen(false);
      setColSearch("");
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [colPickerOpen]);

  function openColPicker() {
    if (colPickerRef.current) {
      const r = colPickerRef.current.getBoundingClientRect();
      pickerRectRef.current = { top: r.bottom + 6, right: window.innerWidth - r.right };
    }
    setColPickerOpen((v) => !v);
    if (colPickerOpen) setColSearch("");
  }

  const visibleColDefs = useMemo(
    () => COLUMN_DEFS.filter((c) => visibleCols.has(c.key)),
    [visibleCols]
  );

  const filteredColDefs = useMemo(
    () =>
      colSearch
        ? COLUMN_DEFS.filter((c) =>
            c.label.toLowerCase().includes(colSearch.toLowerCase())
          )
        : COLUMN_DEFS,
    [colSearch]
  );

  function toggleCol(key: string) {
    setVisibleCols((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

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

  const allSelected =
    displayed.length > 0 && displayed.every((_, i) => selected.has(i));

  function handleRemoveSelected() {
    onRemoveSelected(selected);
    setSelected(new Set());
  }

  function renderCell(colKey: string, row: Keyword) {
    switch (colKey) {
      case "volume":      return (
        <div className="flex items-center gap-1.5 group/vol">
          <VolumeBar value={row.volume} />
          <button
            onClick={() => setHistoryKeyword(row.keyword)}
            className="opacity-0 group-hover/vol:opacity-100 transition-opacity text-gray-600 hover:text-indigo-400"
            title="View volume history"
          >
            <ArrowTrendingUpIcon className="size-3.5" />
          </button>
        </div>
      );
      case "diff":        return (
        <span className={`text-sm ${row.diff > 60 ? "text-red-400" : row.diff > 40 ? "text-yellow-400" : "text-emerald-400"}`}>
          {row.diff}
        </span>
      );
      case "chance":      return (
        <span className={`text-sm ${row.chance > 15 ? "text-emerald-400" : "text-gray-400"}`}>
          {row.chance}
        </span>
      );
      case "opportunity": return (
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${
          row.opportunity >= 70 ? "bg-emerald-500/15 text-emerald-400" :
          row.opportunity >= 40 ? "bg-yellow-500/15 text-yellow-400" :
                                  "bg-gray-500/10 text-gray-500"
        }`}>
          {row.opportunity}
        </span>
      );
      case "rank":        return row.rank !== null
        ? <span className={`text-sm font-medium tabular-nums ${row.rank <= 3 ? "text-emerald-400" : row.rank <= 10 ? "text-yellow-400" : "text-gray-300"}`}>#{row.rank}</span>
        : <span className="text-xs text-gray-600 italic">Unranked</span>;
      case "results":     return (
        row.results !== undefined
          ? <span className="text-sm text-gray-300">{row.results.toLocaleString()}</span>
          : <span className="text-sm text-gray-600">—</span>
      );
      case "relevancy":   return (
        row.relevancy !== undefined
          ? (
            <span className={`text-sm font-medium ${row.relevancy >= 70 ? "text-emerald-400" : row.relevancy >= 40 ? "text-yellow-400" : "text-gray-400"}`}>
              {row.relevancy}
            </span>
          )
          : <span className="text-sm text-gray-600">—</span>
      );
      default:            return <span className="text-sm text-gray-600">—</span>;
    }
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

      {/* Add keyword input + Edit columns */}
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

        {/* Column picker */}
        <div className="shrink-0" ref={colPickerRef}>
          <button
            onClick={openColPicker}
            className={`flex items-center gap-1.5 rounded-lg bg-[#0d0f14] ring-1 px-3 py-2 text-xs text-gray-400 hover:text-white transition-colors ${colPickerOpen ? "ring-indigo-500/50 text-white" : "ring-white/[0.08]"}`}
          >
            <TableCellsIcon className="size-3.5" />
            Edit columns
            <ChevronDownIcon className={`size-3 text-gray-600 transition-transform duration-150 ${colPickerOpen ? "rotate-180" : ""}`} />
          </button>
        </div>

        {colPickerOpen && pickerRectRef.current && createPortal(
          <div
            ref={colPickerMenuRef}
            style={{ position: "fixed", top: pickerRectRef.current.top, right: pickerRectRef.current.right, zIndex: 9999 }}
            className="w-60 bg-[#1a1d24] ring-1 ring-white/[0.12] rounded-xl overflow-hidden shadow-2xl"
          >
            {/* Search */}
            <div className="flex items-center gap-2 px-3 py-2.5 border-b border-white/[0.07]">
              <MagnifyingGlassIcon className="size-3.5 text-gray-600 shrink-0" />
              <input
                value={colSearch}
                onChange={(e) => setColSearch(e.target.value)}
                placeholder="Search…"
                autoFocus
                className="flex-1 bg-transparent text-xs text-gray-300 placeholder-gray-600 outline-none"
              />
            </div>

            {/* Add all / Remove all */}
            <div className="flex items-center gap-1 px-3 py-2 border-b border-white/[0.07]">
              <button
                onClick={() => setVisibleCols(new Set(COLUMN_DEFS.map((c) => c.key)))}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors"
              >
                <PlusIcon className="size-3" />
                Add all
              </button>
              <span className="text-gray-700 mx-1">·</span>
              <button
                onClick={() => setVisibleCols(new Set())}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors"
              >
                <XMarkIcon className="size-3" />
                Remove all
              </button>
            </div>

            {/* Column list */}
            <div className="overflow-y-auto max-h-72">
              {filteredColDefs.map((col) => {
                const active = visibleCols.has(col.key);
                return (
                  <button
                    key={col.key}
                    onClick={() => toggleCol(col.key)}
                    className={`flex items-center gap-2.5 w-full px-3 py-2.5 text-left transition-colors hover:bg-white/[0.04] ${active ? "bg-white/[0.03]" : ""}`}
                  >
                    <span
                      className={`flex-shrink-0 w-4 h-4 rounded border flex items-center justify-center transition-colors ${active ? "border-indigo-500 bg-indigo-500" : "border-gray-600"}`}
                    >
                      {active && <CheckIcon className="size-2.5 text-white" />}
                    </span>
                    <span className={`flex-1 text-xs ${active ? "text-white" : "text-gray-400"}`}>
                      {col.label}
                    </span>
                    {col.smart && <SparklesIcon className="size-3 text-indigo-400 shrink-0" />}
                    {col.isNew && (
                      <span className="rounded px-1.5 py-0.5 text-[9px] font-bold bg-red-500 text-white leading-none">
                        NEW
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>,
          document.body
        )}
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
                    setSelected(
                      allSelected ? new Set() : new Set(displayed.map((_, i) => i))
                    )
                  }
                  className="rounded border-gray-700 bg-[#0d0f14] text-indigo-500 accent-indigo-500"
                />
              </th>
              <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-600 whitespace-nowrap">
                <button className="flex items-center gap-1 hover:text-gray-400 transition-colors">
                  Keywords
                  <ArrowsUpDownIcon className="size-3 text-gray-700" />
                </button>
              </th>
              {visibleColDefs.map((col) => (
                <th
                  key={col.key}
                  className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-600 whitespace-nowrap"
                >
                  <div className="flex items-center gap-1.5">
                    <button className="flex items-center gap-1 hover:text-gray-400 transition-colors">
                      {col.tableLabel ?? col.label}
                      <ArrowsUpDownIcon className="size-3 text-gray-700" />
                    </button>
                    <ColumnTooltip text={col.tooltip} />
                  </div>
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
                      <StarIcon
                        className={`size-3.5 ${row.starred ? "fill-yellow-400 text-yellow-400" : "text-gray-600"}`}
                      />
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
                {row.loading ? (
                  visibleColDefs.map((col) => (
                    <td key={col.key} className="px-4 py-3.5">
                      <div className="h-3 w-10 rounded bg-white/[0.06] animate-pulse" />
                    </td>
                  ))
                ) : (
                  visibleColDefs.map((col) => (
                    <td key={col.key} className="px-4 py-3.5">
                      {renderCell(col.key, row)}
                    </td>
                  ))
                )}
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

      {historyKeyword && (
        <VolumeHistoryPanel
          keyword={historyKeyword}
          store={store}
          country={country}
          onClose={() => setHistoryKeyword(null)}
        />
      )}
    </div>
  );
}

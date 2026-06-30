"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  PlusIcon,
  XMarkIcon,
  StarIcon,
  CheckIcon,
  MagnifyingGlassIcon,
  TableCellsIcon,
  ArrowsUpDownIcon,
  SparklesIcon,
  ArrowTrendingUpIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";
import { Toggle, VolumeBar } from "./ui";
import { VolumeHistoryPanel } from "./VolumeHistoryPanel";
import { LiveSearchPanel } from "./LiveSearchPanel";
import type { Keyword } from "./types";

type Props = {
  keywords: Keyword[];
  store: "ios" | "android";
  country: string;
  translateToggle: boolean;
  onTranslateToggle: () => void;
  adding?: boolean;
  onAddKeywords: (keywords: string[]) => void;
  onToggleStar: (index: number) => void;
  onRemoveSelected: (keywords: string[]) => void;
  onRemoveKeyword: (keyword: string) => void;
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
  { key: "opportunity", label: "Opportunity",   defaultVisible: true,  smart: true, tooltip: "How valuable this keyword is for your app — high means people search for it, you can realistically rank for it, and it's a strong match for what your app does." },
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
  adding = false,
  onAddKeywords,
  onToggleStar,
  onRemoveSelected,
  onRemoveKeyword,
}: Props) {
  const [keywordInput, setKeywordInput] = useState("");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [tableFilter, setTableFilter] = useState<"all" | "checked" | "starred">("all");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [visibleCols, setVisibleCols] = useState<Set<string>>(DEFAULT_VISIBLE);
  const [colPickerOpen, setColPickerOpen] = useState(false);
  const [colSearch, setColSearch] = useState("");
  const [historyKeyword, setHistoryKeyword] = useState<string | null>(null);
  const [liveSearchKeyword, setLiveSearchKeyword] = useState<string | null>(null);

  // Filter state
  const [kwSearch, setKwSearch] = useState("");
  const [volumeFilter, setVolumeFilter] = useState<"any"|"low"|"medium"|"high">("any");
  const [rankFilter, setRankFilter] = useState<"any"|"ranked"|"unranked"|"top3"|"top10">("any");
  const [relevancyFilter, setRelevancyFilter] = useState<"any"|"low"|"medium"|"high">("any");
  const [openFilter, setOpenFilter] = useState<string|null>(null);
  const filterDropdownRef = useRef<HTMLDivElement>(null);
  const filterPosRef = useRef<{top:number;left:number}|null>(null);

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

  useEffect(() => {
    if (!openFilter) return;
    function onMouseDown(e: MouseEvent) {
      if (filterDropdownRef.current?.contains(e.target as Node)) return;
      setOpenFilter(null);
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [openFilter]);

  function toggleFilterDropdown(key: string, e: React.MouseEvent<HTMLButtonElement>) {
    if (openFilter === key) { setOpenFilter(null); return; }
    const r = e.currentTarget.getBoundingClientRect();
    filterPosRef.current = { top: r.bottom + 6, left: r.left };
    setOpenFilter(key);
  }

  function clearAllFilters() {
    setTableFilter("all");
    setKwSearch("");
    setVolumeFilter("any");
    setRankFilter("any");
    setRelevancyFilter("any");
  }

  const hasActiveFilters = tableFilter !== "all" || kwSearch !== "" || volumeFilter !== "any" || rankFilter !== "any" || relevancyFilter !== "any";

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

  function handleSort(key: string) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  function SortIcon({ colKey }: { colKey: string }) {
    if (sortKey !== colKey) return <ArrowsUpDownIcon className="size-3 text-gray-700" />;
    return sortDir === "asc"
      ? <ChevronUpIcon className="size-3 text-indigo-400" />
      : <ChevronDownIcon className="size-3 text-indigo-400" />;
  }

  const displayed = useMemo(() => {
    let rows = keywords;
    if (tableFilter === "starred") rows = rows.filter((k) => k.starred);
    else if (tableFilter === "checked") rows = rows.filter((_, i) => selected.has(i));

    if (kwSearch) rows = rows.filter((k) => k.keyword.toLowerCase().includes(kwSearch.toLowerCase()));

    if (volumeFilter === "low")    rows = rows.filter((k) => (k.volume ?? 0) < 20);
    else if (volumeFilter === "medium") rows = rows.filter((k) => (k.volume ?? 0) >= 20 && (k.volume ?? 0) <= 60);
    else if (volumeFilter === "high")   rows = rows.filter((k) => (k.volume ?? 0) > 60);

    if (rankFilter === "ranked")   rows = rows.filter((k) => k.rank !== null);
    else if (rankFilter === "unranked") rows = rows.filter((k) => k.rank === null);
    else if (rankFilter === "top3")     rows = rows.filter((k) => k.rank !== null && k.rank <= 3);
    else if (rankFilter === "top10")    rows = rows.filter((k) => k.rank !== null && k.rank <= 10);

    if (relevancyFilter === "low")    rows = rows.filter((k) => (k.relevancy ?? 0) < 40);
    else if (relevancyFilter === "medium") rows = rows.filter((k) => (k.relevancy ?? 0) >= 40 && (k.relevancy ?? 0) <= 70);
    else if (relevancyFilter === "high")   rows = rows.filter((k) => (k.relevancy ?? 0) > 70);

    if (!sortKey) return rows;

    return [...rows].sort((a, b) => {
      let av: number | string | null | undefined;
      let bv: number | string | null | undefined;

      if (sortKey === "keyword") {
        av = a.keyword.toLowerCase();
        bv = b.keyword.toLowerCase();
      } else if (sortKey === "rank") {
        // null (unranked) always sorts to the end
        if (a.rank === null && b.rank === null) return 0;
        if (a.rank === null) return 1;
        if (b.rank === null) return -1;
        av = a.rank; bv = b.rank;
      } else {
        av = (a as Record<string, unknown>)[sortKey] as number ?? 0;
        bv = (b as Record<string, unknown>)[sortKey] as number ?? 0;
      }

      if (av === bv) return 0;
      const cmp = (av ?? 0) < (bv ?? 0) ? -1 : 1;
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [keywords, tableFilter, selected, sortKey, sortDir, kwSearch, volumeFilter, rankFilter, relevancyFilter]);

  const allSelected =
    displayed.length > 0 && displayed.every((_, i) => selected.has(i));

  function handleRemoveSelected() {
    // `selected` holds indices into `displayed` (post sort/filter), not into
    // the `keywords` prop — resolve to terms here so the caller can match
    // unambiguously regardless of what sort/filter was active when checked.
    const terms = displayed.filter((_, i) => selected.has(i)).map((k) => k.keyword);
    onRemoveSelected(terms);
    setSelected(new Set());
  }

  function renderCell(colKey: string, row: Keyword) {
    switch (colKey) {
      case "volume":      return (
        <button
          onClick={() => setHistoryKeyword(row.keyword)}
          className="flex items-center gap-2 rounded px-1 -mx-1 py-0.5 hover:bg-white/[0.05] transition-colors"
          title="View volume history"
        >
          <VolumeBar value={row.volume} />
          <ArrowTrendingUpIcon className="size-3.5 text-gray-600 shrink-0" />
        </button>
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
        row.opportunity !== undefined
          ? (
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${
              row.opportunity >= 70 ? "bg-emerald-500/15 text-emerald-400" :
              row.opportunity >= 40 ? "bg-yellow-500/15 text-yellow-400" :
                                      "bg-gray-500/10 text-gray-500"
            }`}>
              {row.opportunity}
            </span>
          )
          : <ClockIcon className="size-4 text-gray-600 animate-pulse" />
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
          : <ClockIcon className="size-4 text-gray-600 animate-pulse" />
      );
      default:            return <span className="text-sm text-gray-600">—</span>;
    }
  }

  return (
    <div className="mx-6 mb-6 rounded-xl bg-[#1a1d24] ring-1 ring-white/[0.07] overflow-hidden">
      {/* Filter toolbar */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.07] flex-wrap gap-y-2">
        {/* Keyword search */}
        <button
          onClick={(e) => toggleFilterDropdown("keyword", e)}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs ring-1 transition-colors ${kwSearch ? "bg-indigo-500/10 ring-indigo-500/40 text-indigo-300" : openFilter === "keyword" ? "bg-[#0d0f14] ring-indigo-500/40 text-white" : "bg-[#0d0f14] ring-white/[0.08] text-gray-400 hover:text-white"}`}
        >
          <MagnifyingGlassIcon className="size-3.5" />
          {kwSearch ? `"${kwSearch}"` : "Keyword"}
          <ChevronDownIcon className="size-3 text-gray-600" />
        </button>

        {/* Volume filter */}
        <button
          onClick={(e) => toggleFilterDropdown("volume", e)}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs ring-1 transition-colors ${volumeFilter !== "any" ? "bg-indigo-500/10 ring-indigo-500/40 text-indigo-300" : openFilter === "volume" ? "bg-[#0d0f14] ring-indigo-500/40 text-white" : "bg-[#0d0f14] ring-white/[0.08] text-gray-400 hover:text-white"}`}
        >
          {volumeFilter !== "any" ? `Volume: ${volumeFilter.charAt(0).toUpperCase() + volumeFilter.slice(1)}` : "Volume"}
          <ChevronDownIcon className="size-3 text-gray-600" />
        </button>

        {/* Rank filter */}
        <button
          onClick={(e) => toggleFilterDropdown("rank", e)}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs ring-1 transition-colors ${rankFilter !== "any" ? "bg-indigo-500/10 ring-indigo-500/40 text-indigo-300" : openFilter === "rank" ? "bg-[#0d0f14] ring-indigo-500/40 text-white" : "bg-[#0d0f14] ring-white/[0.08] text-gray-400 hover:text-white"}`}
        >
          {rankFilter === "any" ? "Rank" : rankFilter === "ranked" ? "Ranked" : rankFilter === "unranked" ? "Unranked" : rankFilter === "top3" ? "Top 3" : "Top 10"}
          <ChevronDownIcon className="size-3 text-gray-600" />
        </button>

        {/* Relevancy filter */}
        <button
          onClick={(e) => toggleFilterDropdown("relevancy", e)}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs ring-1 transition-colors ${relevancyFilter !== "any" ? "bg-indigo-500/10 ring-indigo-500/40 text-indigo-300" : openFilter === "relevancy" ? "bg-[#0d0f14] ring-indigo-500/40 text-white" : "bg-[#0d0f14] ring-white/[0.08] text-gray-400 hover:text-white"}`}
        >
          <SparklesIcon className="size-3 text-violet-400" />
          {relevancyFilter !== "any" ? `Relevancy: ${relevancyFilter.charAt(0).toUpperCase() + relevancyFilter.slice(1)}` : "Relevancy"}
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

        {hasActiveFilters && (
          <button
            onClick={clearAllFilters}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            <XMarkIcon className="size-3.5" />
            Clear
          </button>
        )}

        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-gray-500">Translate to English</span>
          <Toggle checked={translateToggle} onChange={onTranslateToggle} />
        </div>
      </div>

      {/* Filter dropdowns (portal) */}
      {openFilter && filterPosRef.current && createPortal(
        <div
          ref={filterDropdownRef}
          style={{ position: "fixed", top: filterPosRef.current.top, left: filterPosRef.current.left, zIndex: 9999 }}
          className="bg-[#1a1d24] ring-1 ring-white/[0.12] rounded-xl overflow-hidden shadow-2xl"
        >
          {openFilter === "keyword" && (
            <div className="p-2 w-56">
              <div className="flex items-center gap-2 rounded-lg bg-[#0d0f14] ring-1 ring-white/[0.08] focus-within:ring-indigo-500/40 px-2.5 py-1.5 transition-all">
                <MagnifyingGlassIcon className="size-3.5 text-gray-600 shrink-0" />
                <input
                  autoFocus
                  value={kwSearch}
                  onChange={(e) => setKwSearch(e.target.value)}
                  placeholder="Search keywords…"
                  className="flex-1 bg-transparent text-xs text-gray-300 placeholder-gray-600 outline-none"
                />
                {kwSearch && (
                  <button onClick={() => setKwSearch("")}>
                    <XMarkIcon className="size-3 text-gray-600 hover:text-gray-300" />
                  </button>
                )}
              </div>
            </div>
          )}
          {openFilter === "volume" && (
            <div className="py-1 w-44">
              {([["any","Any"],["low","Low  (< 20)"],["medium","Medium  20–60"],["high","High  (> 60)"]] as const).map(([val, label]) => (
                <button key={val} onClick={() => { setVolumeFilter(val); setOpenFilter(null); }}
                  className={`flex items-center gap-2 w-full text-left px-3 py-2 text-xs transition-colors hover:bg-white/[0.04] ${volumeFilter === val ? "text-indigo-400" : "text-gray-400"}`}>
                  {volumeFilter === val && <CheckIcon className="size-3 shrink-0" />}
                  <span className={volumeFilter === val ? "" : "ml-5"}>{label}</span>
                </button>
              ))}
            </div>
          )}
          {openFilter === "rank" && (
            <div className="py-1 w-44">
              {([["any","Any"],["ranked","Ranked"],["unranked","Unranked"],["top3","Top 3"],["top10","Top 10"]] as const).map(([val, label]) => (
                <button key={val} onClick={() => { setRankFilter(val); setOpenFilter(null); }}
                  className={`flex items-center gap-2 w-full text-left px-3 py-2 text-xs transition-colors hover:bg-white/[0.04] ${rankFilter === val ? "text-indigo-400" : "text-gray-400"}`}>
                  {rankFilter === val && <CheckIcon className="size-3 shrink-0" />}
                  <span className={rankFilter === val ? "" : "ml-5"}>{label}</span>
                </button>
              ))}
            </div>
          )}
          {openFilter === "relevancy" && (
            <div className="py-1 w-44">
              {([["any","Any"],["low","Low  (< 40)"],["medium","Medium  40–70"],["high","High  (> 70)"]] as const).map(([val, label]) => (
                <button key={val} onClick={() => { setRelevancyFilter(val); setOpenFilter(null); }}
                  className={`flex items-center gap-2 w-full text-left px-3 py-2 text-xs transition-colors hover:bg-white/[0.04] ${relevancyFilter === val ? "text-indigo-400" : "text-gray-400"}`}>
                  {relevancyFilter === val && <CheckIcon className="size-3 shrink-0" />}
                  <span className={relevancyFilter === val ? "" : "ml-5"}>{label}</span>
                </button>
              ))}
            </div>
          )}
        </div>,
        document.body
      )}

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
          disabled={adding}
          title={adding ? "Saving keyword(s)… don't refresh yet" : undefined}
          className="flex items-center gap-1.5 rounded-lg bg-indigo-500 hover:bg-indigo-400 disabled:bg-indigo-500/50 disabled:cursor-wait px-4 py-2 text-xs font-semibold text-white transition-colors shrink-0"
        >
          {adding
            ? <span className="size-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
            : <PlusIcon className="size-3.5" />}
          {adding ? "Adding…" : "Add"}
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
                <button
                  onClick={() => handleSort("keyword")}
                  className={`flex items-center gap-1 hover:text-gray-400 transition-colors ${sortKey === "keyword" ? "text-gray-300" : ""}`}
                >
                  Keywords
                  <SortIcon colKey="keyword" />
                </button>
              </th>
              {visibleColDefs.map((col) => (
                <th
                  key={col.key}
                  className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-600 whitespace-nowrap"
                >
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleSort(col.key)}
                      className={`flex items-center gap-1 hover:text-gray-400 transition-colors ${sortKey === col.key ? "text-gray-300" : ""}`}
                    >
                      {col.tableLabel ?? col.label}
                      <SortIcon colKey={col.key} />
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
                  <input
                    type="checkbox"
                    checked={selected.has(i)}
                    onChange={() => toggleSelect(i)}
                    className="rounded border-gray-700 bg-[#0d0f14] text-indigo-500 accent-indigo-500"
                  />
                </td>
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-1.5 group/kw">
                    <button
                      onClick={() => onToggleStar(keywords.indexOf(row))}
                      className="shrink-0 transition-colors"
                    >
                      <StarIcon className={`size-3.5 ${row.starred ? "fill-yellow-400 text-yellow-400" : "text-gray-600"}`} />
                    </button>
                    <span className="text-sm text-gray-200">{row.keyword}</span>
                  </div>
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
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setLiveSearchKeyword(row.keyword)}
                      className="flex items-center gap-1 rounded px-2 py-1 text-[10px] font-medium bg-[#0d0f14] ring-1 ring-white/[0.08] text-gray-400 hover:text-white transition-colors whitespace-nowrap"
                    >
                      <MagnifyingGlassIcon className="size-3" />
                      Live search
                    </button>
                    <button
                      onClick={() => onRemoveKeyword(row.keyword)}
                      className="flex items-center justify-center rounded px-2 py-1 text-[10px] font-medium bg-[#0d0f14] ring-1 ring-white/[0.08] text-gray-400 hover:text-red-400 hover:ring-red-500/30 transition-colors"
                    >
                      <XMarkIcon className="size-3" />
                    </button>
                  </div>
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

      {liveSearchKeyword && (
        <LiveSearchPanel
          keyword={liveSearchKeyword}
          store={store}
          country={country}
          onClose={() => setLiveSearchKeyword(null)}
        />
      )}
    </div>
  );
}

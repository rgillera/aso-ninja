"use client";

import { useEffect, useRef, useState } from "react";
import {
  MagnifyingGlassIcon,
  ChevronDownIcon,
  CheckIcon,
  StarIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { DEFAULT_FILTERS, isFiltersDefault, type Filters } from "./types";

type Props = {
  filters: Filters;
  onChange: (patch: Partial<Filters>) => void;
};

function Dropdown({ label, active, children }: { label: string; active?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <div ref={ref} className="relative">
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
        <div className="absolute z-20 mt-1.5 min-w-[220px] rounded-lg bg-[#1a1d24] ring-1 ring-white/[0.1] shadow-2xl p-3">
          {children}
        </div>
      )}
    </div>
  );
}

function RangeFields({
  min, max, onMin, onMax, cap,
}: { min: number; max: number; onMin: (v: number) => void; onMax: (v: number) => void; cap: number }) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        min={0}
        max={cap}
        value={min}
        onChange={(e) => onMin(Math.max(0, Math.min(cap, parseInt(e.target.value, 10) || 0)))}
        className="w-16 rounded-md bg-[#0d0f14] ring-1 ring-white/[0.08] px-2 py-1 text-xs text-gray-200 outline-none focus:ring-indigo-500/40"
      />
      <span className="text-xs text-gray-600">to</span>
      <input
        type="number"
        min={0}
        max={cap}
        value={max}
        onChange={(e) => onMax(Math.max(0, Math.min(cap, parseInt(e.target.value, 10) || 0)))}
        className="w-16 rounded-md bg-[#0d0f14] ring-1 ring-white/[0.08] px-2 py-1 text-xs text-gray-200 outline-none focus:ring-indigo-500/40"
      />
    </div>
  );
}

export function PerformanceFilters({ filters, onChange }: Props) {
  const volumeActive = filters.volumeMin !== DEFAULT_FILTERS.volumeMin || filters.volumeMax !== DEFAULT_FILTERS.volumeMax;
  const rankActive = filters.rankMin !== DEFAULT_FILTERS.rankMin || filters.rankMax !== DEFAULT_FILTERS.rankMax;

  return (
    <div className="px-4 py-3 border-b border-white/[0.07]">
      <div className="flex flex-wrap items-center gap-2">
        <Dropdown label={filters.query ? `Keyword: ${filters.query}` : "Keyword"} active={!!filters.query}>
          <div className="flex items-center gap-1.5 rounded-md bg-[#0d0f14] ring-1 ring-white/[0.08] px-2 py-1.5">
            <MagnifyingGlassIcon className="size-3.5 text-gray-500 shrink-0" />
            <input
              autoFocus
              value={filters.query}
              onChange={(e) => onChange({ query: e.target.value })}
              placeholder="Search keyword"
              className="flex-1 bg-transparent text-xs text-gray-300 placeholder-gray-600 outline-none min-w-0"
            />
          </div>
        </Dropdown>

        <Dropdown label={volumeActive ? `Volume ${filters.volumeMin}-${filters.volumeMax}` : "Volume"} active={volumeActive}>
          <RangeFields
            min={filters.volumeMin} max={filters.volumeMax} cap={100}
            onMin={(v) => onChange({ volumeMin: v })}
            onMax={(v) => onChange({ volumeMax: v })}
          />
        </Dropdown>

        <Dropdown label={rankActive ? `Rank ${filters.rankMin}-${filters.rankMax}` : "Rank"} active={rankActive}>
          <RangeFields
            min={filters.rankMin} max={filters.rankMax} cap={200}
            onMin={(v) => onChange({ rankMin: v })}
            onMax={(v) => onChange({ rankMax: v })}
          />
        </Dropdown>

        <div className="flex items-center rounded-lg bg-[#0d0f14] ring-1 ring-white/[0.08] p-0.5">
          <button
            onClick={() => onChange({ starredOnly: false })}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              !filters.starredOnly ? "bg-white/10 text-white" : "text-gray-500 hover:text-white"
            }`}
          >
            All
          </button>
          <button
            onClick={() => onChange({ starredOnly: true })}
            className={`rounded-md p-1.5 transition-colors ${
              filters.starredOnly ? "bg-white/10 text-amber-400" : "text-gray-500 hover:text-white"
            }`}
          >
            <StarIcon className={`size-3.5 ${filters.starredOnly ? "fill-amber-400" : ""}`} />
          </button>
        </div>

        <Dropdown label={`Type${filters.type === "all" ? "" : `: ${filters.type === "branded" ? "Branded" : "Generic"}`}`} active={filters.type !== "all"}>
          <div className="flex flex-col gap-0.5">
            {(["all", "branded", "generic"] as const).map((t) => (
              <button
                key={t}
                onClick={() => onChange({ type: t })}
                className={`flex items-center justify-between rounded-md px-2 py-1.5 text-xs text-left transition-colors ${
                  filters.type === t ? "bg-indigo-500/15 text-indigo-300" : "text-gray-300 hover:bg-white/[0.05]"
                }`}
              >
                {t === "all" ? "All" : t === "branded" ? "Branded" : "Generic"}
                {filters.type === t && <CheckIcon className="size-3.5" />}
              </button>
            ))}
          </div>
        </Dropdown>

        <Dropdown label={`Word counts${filters.wordCount === "all" ? "" : `: ${filters.wordCount === 3 ? "3+" : filters.wordCount}`}`} active={filters.wordCount !== "all"}>
          <div className="flex flex-col gap-0.5">
            {([
              ["all", "All"],
              [1, "1 word"],
              [2, "2 words"],
              [3, "3+ words"],
            ] as const).map(([v, label]) => (
              <button
                key={String(v)}
                onClick={() => onChange({ wordCount: v })}
                className={`flex items-center justify-between rounded-md px-2 py-1.5 text-xs text-left transition-colors ${
                  filters.wordCount === v ? "bg-indigo-500/15 text-indigo-300" : "text-gray-300 hover:bg-white/[0.05]"
                }`}
              >
                {label}
                {filters.wordCount === v && <CheckIcon className="size-3.5" />}
              </button>
            ))}
          </div>
        </Dropdown>

        {!isFiltersDefault(filters) && (
          <button
            onClick={() => onChange(DEFAULT_FILTERS)}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            <XMarkIcon className="size-3.5" />
            Clear
          </button>
        )}
      </div>
    </div>
  );
}

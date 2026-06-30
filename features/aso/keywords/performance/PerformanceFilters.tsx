"use client";

import { useEffect, useRef, useState } from "react";
import {
  MagnifyingGlassIcon,
  ChevronDownIcon,
  CheckIcon,
  StarIcon,
  XMarkIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import type { ActiveApp } from "@/features/dashboard/ActiveAppContext";
import type { CompetitorApp } from "@/features/aso/keywords/research/ManageCompetitorsModal";
import { ManageCompetitorsModal } from "@/features/aso/keywords/research/ManageCompetitorsModal";
import { DEFAULT_FILTERS, isFiltersDefault, type Filters } from "./types";

type Props = {
  filters: Filters;
  onChange: (patch: Partial<Filters>) => void;
  activeApp: ActiveApp;
  competitors: CompetitorApp[];
  onCompetitorsChange: (competitors: CompetitorApp[]) => void;
};

function Dropdown({ label, children }: { label: string; children: React.ReactNode }) {
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
        className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium ring-1 transition-colors ${
          open ? "bg-[#0d0f14] ring-indigo-500/40 text-white" : "bg-[#0d0f14] ring-white/[0.08] text-gray-300 hover:text-white"
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

export function PerformanceFilters({ filters, onChange, activeApp, competitors, onCompetitorsChange }: Props) {
  const [showCompetitorModal, setShowCompetitorModal] = useState(false);

  return (
    <div className="px-6 py-3 border-b border-white/[0.07] space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5 rounded-lg bg-[#0d0f14] ring-1 ring-white/[0.08] px-3 py-2 w-48 shrink-0">
          <MagnifyingGlassIcon className="size-3.5 text-gray-500 shrink-0" />
          <input
            value={filters.query}
            onChange={(e) => onChange({ query: e.target.value })}
            placeholder="Keyword"
            className="flex-1 bg-transparent text-xs text-gray-300 placeholder-gray-600 outline-none min-w-0"
          />
        </div>

        <Dropdown label={`Volume ${filters.volumeMin}-${filters.volumeMax}`}>
          <RangeFields
            min={filters.volumeMin} max={filters.volumeMax} cap={100}
            onMin={(v) => onChange({ volumeMin: v })}
            onMax={(v) => onChange({ volumeMax: v })}
          />
        </Dropdown>

        <Dropdown label={`Rank ${filters.rankMin}-${filters.rankMax}`}>
          <RangeFields
            min={filters.rankMin} max={filters.rankMax} cap={200}
            onMin={(v) => onChange({ rankMin: v })}
            onMax={(v) => onChange({ rankMax: v })}
          />
        </Dropdown>

        <button
          onClick={() => onChange({ starredOnly: !filters.starredOnly })}
          className="flex items-center gap-1.5 rounded-lg bg-[#0d0f14] ring-1 ring-white/[0.08] px-3 py-2 text-xs font-medium text-gray-300 hover:text-white transition-colors"
        >
          {filters.starredOnly ? "Starred" : "All"}
          {filters.starredOnly
            ? <StarIcon className="size-3.5 fill-amber-400 text-amber-400" />
            : <CheckIcon className="size-3.5 text-gray-500" />}
        </button>

        <Dropdown label={`Type${filters.type === "all" ? "" : `: ${filters.type === "branded" ? "Branded" : "Generic"}`}`}>
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

        <Dropdown label={`Word counts${filters.wordCount === "all" ? "" : `: ${filters.wordCount === 3 ? "3+" : filters.wordCount}`}`}>
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

      <button
        onClick={() => setShowCompetitorModal(true)}
        className="flex items-center gap-2 w-full rounded-lg bg-[#0d0f14] ring-1 ring-white/[0.08] hover:ring-white/[0.16] px-3 py-2.5 text-xs font-medium text-gray-300 hover:text-white transition-colors"
      >
        <PlusIcon className="size-3.5" />
        {competitors.length === 0 ? "Add competitors to compare" : `Comparing against ${competitors.length} competitor${competitors.length === 1 ? "" : "s"}`}
        {competitors.length > 0 && (
          <span className="flex items-center -space-x-1.5 ml-1">
            {competitors.slice(0, 5).map((c) => (
              c.icon
                // eslint-disable-next-line @next/next/no-img-element
                ? <img key={c.storeId} src={c.icon} alt={c.name} className="size-5 rounded-md ring-2 ring-[#0d0f14]" />
                : null
            ))}
          </span>
        )}
      </button>

      {showCompetitorModal && (
        <ManageCompetitorsModal
          activeApp={activeApp}
          selected={competitors}
          onSave={onCompetitorsChange}
          onClose={() => setShowCompetitorModal(false)}
        />
      )}
    </div>
  );
}

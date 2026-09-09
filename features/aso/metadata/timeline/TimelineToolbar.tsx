"use client";

import { useState, useRef, useEffect } from "react";
import {
  ArrowDownTrayIcon,
  CheckIcon,
  ChevronDownIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import { ALL_FIELDS } from "./constants";

type Props = {
  selectedFields: Set<string>;
  onToggle: (field: string) => void;
  onClearAll: () => void;
};

export function TimelineToolbar({ selectedFields, onToggle, onClearAll }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const options = ALL_FIELDS.filter(f => f.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="shrink-0 flex items-center justify-between px-6 py-3 border-b border-white/[0.07] light:border-black/[0.08]">
      {/* Metadata filter dropdown */}
      <div className="relative" ref={dropRef}>
        <button
          onClick={() => setOpen(v => !v)}
          className="flex items-center gap-2 rounded-lg bg-[#1a1d24] light:bg-white px-3 py-1.5 text-xs text-gray-300 light:text-gray-700 hover:text-white light:hover:text-gray-900 transition-colors"
        >
          Metadata
          <span className="rounded bg-indigo-500/20 text-indigo-400 light:text-indigo-700 px-1.5 py-0.5 text-[10px] font-semibold">{selectedFields.size}</span>
          <ChevronDownIcon className={`size-3 text-gray-600 light:text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>

        {open && (
          <div className="absolute left-0 top-full mt-1.5 z-50 w-52 rounded-xl bg-[#1a1d24] light:bg-white shadow-xl shadow-black/30 light:shadow-black/10 overflow-hidden">
            <div className="p-2 border-b border-white/[0.07] light:border-black/[0.08]">
              <div className="flex items-center gap-2 rounded-lg bg-[#0d0f14] light:bg-gray-50 px-2.5 py-1.5">
                <MagnifyingGlassIcon className="size-3.5 text-gray-500 shrink-0" />
                <input
                  autoFocus
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search…"
                  className="bg-transparent text-xs text-white light:text-gray-900 placeholder-gray-600 light:placeholder-gray-400 outline-none flex-1"
                />
              </div>
            </div>
            <button onClick={onClearAll} className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-gray-400 light:text-gray-600 hover:bg-white/[0.05] light:hover:bg-black/[0.04] border-b border-white/[0.07] light:border-black/[0.08] transition-colors">
              <span className="size-4 flex items-center justify-center text-gray-500">—</span>
              Remove all
            </button>
            <div className="max-h-60 overflow-y-auto py-1">
              {options.map(f => {
                const active = selectedFields.has(f);
                return (
                  <button key={f} onClick={() => onToggle(f)} className="flex items-center gap-2.5 w-full px-3 py-2 text-xs hover:bg-white/[0.05] light:hover:bg-black/[0.04] transition-colors">
                    <span className={`flex items-center justify-center size-4 rounded shrink-0 ring-1 ${active ? "bg-indigo-500 ring-indigo-500" : "ring-white/20 light:ring-black/20"}`}>
                      {active && <CheckIcon className="size-3 text-white stroke-[3]" />}
                    </span>
                    <span className={active ? "text-white light:text-gray-900" : "text-gray-400 light:text-gray-600"}>{f}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Legend + download */}
      <div className="flex items-center gap-5">
        <span className="flex items-center gap-1.5 text-xs text-gray-500">
          <span className="size-2 rounded-full bg-teal-400 shrink-0" />Update
        </span>
        <span className="flex items-center gap-1.5 text-xs text-gray-500">
          <span className="h-px w-5 bg-orange-400 shrink-0" />Product Page Optimization
        </span>
        <button className="flex items-center justify-center rounded-lg bg-[#1a1d24] light:bg-white p-2 text-gray-400 light:text-gray-600 hover:text-white light:hover:text-gray-900 transition-colors">
          <ArrowDownTrayIcon className="size-4" />
        </button>
      </div>
    </div>
  );
}

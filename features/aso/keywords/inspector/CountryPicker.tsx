"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import { COUNTRIES, COUNTRY_MAP, countryFlag } from "@/libs/countries";

// Code order (AE, AG, AI...), same as the app search's country picker.
const OPTIONS = COUNTRIES;

// Searchable country dropdown for Keyword Inspector. A native <select> over
// 170+ countries was hard to scan, and its flag-prefixed labels broke
// type-to-jump, so this adds a search box (name or code) above the same
// flag + name list.
export function CountryPicker({ value, onChange }: { value: string; onChange: (code: string) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selected = value.toUpperCase();
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return OPTIONS;
    // Name matches first (starts-with before contains), then exact code hits.
    const byName = OPTIONS.filter((c) => c.label.toLowerCase().includes(q))
      .sort((a, b) => Number(!a.label.toLowerCase().startsWith(q)) - Number(!b.label.toLowerCase().startsWith(q)));
    const byCode = OPTIONS.filter((c) => c.code.toLowerCase() === q && !byName.includes(c));
    return [...byCode, ...byName];
  }, [query]);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  // Keep the keyboard-highlighted row in view while arrowing through the list.
  useEffect(() => {
    if (!open) return;
    listRef.current?.querySelector<HTMLElement>(`[data-idx="${activeIdx}"]`)?.scrollIntoView({ block: "nearest" });
  }, [activeIdx, open]);

  function openList() {
    setQuery("");
    // Start on the current pick so Enter keeps it and the list opens there.
    setActiveIdx(Math.max(0, OPTIONS.findIndex((c) => c.code === selected)));
    setOpen(true);
  }

  function pick(code: string) {
    onChange(code.toLowerCase());
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") { e.preventDefault(); setActiveIdx((i) => Math.min(i + 1, filtered.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActiveIdx((i) => Math.max(i - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); if (filtered[activeIdx]) pick(filtered[activeIdx].code); }
    else if (e.key === "Escape") { e.preventDefault(); setOpen(false); }
  }

  return (
    <div ref={rootRef} className="relative h-full w-full @3xl:w-52">
      <button
        type="button"
        onClick={() => (open ? setOpen(false) : openList())}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Country"
        className="flex h-full w-full items-center gap-2 rounded-xl bg-[#0e0e10] light:bg-[#f7f7f8] py-2.5 pl-3 pr-10 text-left text-sm text-white light:text-gray-900 outline-none focus-visible:ring-1 focus-visible:ring-indigo-500/60"
      >
        <span className="shrink-0">{countryFlag(selected)}</span>
        <span className="truncate">{COUNTRY_MAP[selected] ?? selected}</span>
        <ChevronDownIcon className={`pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-gray-500 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {/* Styled to match the country picker in the app search
          (features/dashboard/DashboardSearch.tsx). */}
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1.5 w-full min-w-[14rem] overflow-hidden rounded-xl bg-[#141417] light:bg-white shadow-xl shadow-black/30 light:shadow-black/10">
          <div className="px-2 pt-2 pb-1">
            <input
              autoFocus
              type="text"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setActiveIdx(0); }}
              onKeyDown={onKeyDown}
              placeholder="Search country…"
              aria-label="Search country"
              className="w-full rounded-md bg-white/[0.06] light:bg-black/[0.04] px-2.5 py-1.5 text-xs text-white light:text-gray-900 placeholder-gray-500 light:placeholder-gray-400 outline-none"
            />
          </div>
          <ul ref={listRef} role="listbox" aria-label="Countries" className="max-h-64 overflow-y-auto py-1">
            {filtered.length === 0 && <li className="px-3 py-2 text-xs text-gray-500">No countries match &ldquo;{query}&rdquo;</li>}
            {filtered.map((c, i) => (
              <li key={c.code} role="option" aria-selected={c.code === selected} data-idx={i}>
                <button
                  type="button"
                  onMouseEnter={() => setActiveIdx(i)}
                  onClick={() => pick(c.code)}
                  className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors ${
                    i === activeIdx ? "bg-white/[0.05] light:bg-black/[0.04]" : ""
                  } ${c.code === selected ? "text-white light:text-gray-900" : "text-gray-400 light:text-gray-600"}`}
                >
                  <span className="text-base leading-none">{countryFlag(c.code)}</span>
                  <span className="flex-1 truncate">{c.label}</span>
                  <span className="text-xs text-gray-600 light:text-gray-400">{c.code}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDownIcon, CheckIcon } from "@heroicons/react/24/outline";
import { countryFlag, COUNTRY_MAP } from "@/libs/countries";
import type { App } from "@/libs/contracts";

type Props = {
  currentId?: string;
  currentCountry: string;
  siblings: App[];
  onSelect: (target: App) => void;
  /** "inline" matches AppHeader's plain-text country label; "pill" matches the standalone badge on the Metadata preview page. */
  variant?: "inline" | "pill";
};

export function CountrySwitcher({ currentId, currentCountry, siblings, onSelect, variant = "inline" }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  const sorted = [...siblings].sort((a, b) => (a.country ?? "").localeCompare(b.country ?? ""));

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className={
          variant === "pill"
            ? "flex items-center gap-1.5 rounded-lg bg-[#1a1d24] ring-1 ring-white/[0.08] px-3 py-3.5 text-xs text-gray-300 hover:bg-white/[0.06] transition-colors"
            : "ml-1 flex items-center gap-0.5 rounded px-1 -mx-1 hover:bg-white/[0.06] transition-colors"
        }
      >
        {variant === "pill" ? (
          <>{countryFlag(currentCountry)} {COUNTRY_MAP[currentCountry] ?? currentCountry}</>
        ) : (
          <>&middot; {countryFlag(currentCountry)} {currentCountry.toUpperCase()}</>
        )}
        <ChevronDownIcon className={`size-3 text-gray-600 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1.5 z-50 w-44 rounded-xl bg-[#1a1d24] ring-1 ring-white/[0.08] shadow-xl shadow-black/30 overflow-hidden">
          <div className="max-h-64 overflow-y-auto py-1">
            {sorted.map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  setOpen(false);
                  if (s.id !== currentId) onSelect(s);
                }}
                className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-left hover:bg-white/[0.05] transition-colors"
              >
                <span className="text-base leading-none">{countryFlag(s.country ?? "")}</span>
                <span className={s.id === currentId ? "font-medium text-white" : "text-gray-400"}>
                  {(s.country ?? "").toUpperCase()}
                </span>
                {s.id === currentId && <CheckIcon className="size-3 text-indigo-400 ml-auto shrink-0" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

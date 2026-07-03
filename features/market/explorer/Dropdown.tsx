"use client";

import { useState } from "react";
import { ChevronDownIcon } from "@heroicons/react/24/outline";

export function Dropdown({ label, active, children }: { label: React.ReactNode; active?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
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
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute z-20 mt-1.5 min-w-[220px] max-h-80 overflow-y-auto rounded-lg bg-[#1a1d24] ring-1 ring-white/[0.1] shadow-2xl p-1.5"
            onClick={(e) => e.stopPropagation()}
          >
            {children}
          </div>
        </>
      )}
    </div>
  );
}

export function DropdownOption({ label, active, onClick }: { label: React.ReactNode; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`block w-full rounded-md px-2.5 py-1.5 text-left text-xs transition-colors ${
        active ? "bg-indigo-500/15 text-indigo-300" : "text-gray-300 hover:bg-white/[0.05]"
      }`}
    >
      {label}
    </button>
  );
}

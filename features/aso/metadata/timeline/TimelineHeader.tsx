"use client";

import { useState, useRef, useEffect } from "react";
import { CalendarIcon, InformationCircleIcon, DevicePhoneMobileIcon } from "@heroicons/react/24/outline";
import type { App } from "@/libs/contracts";
import { countryFlag } from "@/libs/countries";
import { FollowButton, StoreLinkButton } from "@/features/aso/AppHeader";
import { fmtDate, toDateStr } from "./utils";

type Props = {
  app: App;
  rangeStart: Date;
  rangeEnd: Date;
  onRangeChange: (start: Date, end: Date) => void;
};

export function TimelineHeader({ app, rangeStart, rangeEnd, onRangeChange }: Props) {
  const [open, setOpen]           = useState(false);
  const [draftStart, setDraftStart] = useState(toDateStr(rangeStart));
  const [draftEnd,   setDraftEnd]   = useState(toDateStr(rangeEnd));
  const ref = useRef<HTMLDivElement>(null);

  // Sync drafts when parent range changes (e.g., on app switch)
  useEffect(() => {
    setDraftStart(toDateStr(rangeStart));
    setDraftEnd(toDateStr(rangeEnd));
  }, [rangeStart, rangeEnd]);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function apply() {
    if (draftStart && draftEnd && draftStart <= draftEnd) {
      onRangeChange(new Date(draftStart + "T00:00:00"), new Date(draftEnd + "T00:00:00"));
    }
    setOpen(false);
  }

  function setPreset(days: number) {
    const end   = new Date();
    const start = new Date(end);
    start.setDate(start.getDate() - days);
    setDraftStart(toDateStr(start));
    setDraftEnd(toDateStr(end));
  }

  return (
    <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-white/[0.07]">
      <div className="flex items-center gap-3">
        {app.icon_url ? (
          <img src={app.icon_url} alt={app.name} className="size-8 rounded-xl object-cover shrink-0" />
        ) : (
          <div className="size-8 rounded-xl bg-[#0d0f14] shrink-0 flex items-center justify-center">
            <DevicePhoneMobileIcon className="size-4 text-gray-500" />
          </div>
        )}
        <div>
          <p className="text-sm font-semibold text-white leading-tight">{app.name}</p>
          <p className="text-xs text-gray-500 leading-tight">
            {app.store === "ios" ? "App Store" : "Google Play"}
            {app.country && <span className="ml-1.5">&middot; {countryFlag(app.country)} {app.country.toUpperCase()}</span>}
          </p>
        </div>
        <FollowButton app={app} />
        <StoreLinkButton app={app} />
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <h1 className="text-sm font-semibold text-white">Timeline</h1>
          <InformationCircleIcon className="size-4 text-gray-500" />
        </div>

        {/* Date range picker */}
        <div className="relative" ref={ref}>
          <button
            onClick={() => setOpen(v => !v)}
            className="flex items-center gap-2 rounded-lg bg-[#1a1d24] ring-1 ring-white/[0.08] px-3 py-2 text-xs text-gray-300 hover:text-white transition-colors"
          >
            <CalendarIcon className="size-3.5 text-gray-500" />
            {fmtDate(rangeStart)} – {fmtDate(rangeEnd)}
          </button>

          {open && (
            <div className="absolute right-0 top-full mt-2 z-50 w-64 rounded-xl bg-[#1a1d24] ring-1 ring-white/[0.08] shadow-xl shadow-black/40 p-4 space-y-3">
              <p className="text-xs font-semibold text-white">Date range</p>

              <div className="flex gap-1.5">
                {[{ label: "30d", days: 30 }, { label: "90d", days: 90 }, { label: "180d", days: 180 }, { label: "1y", days: 365 }].map(p => (
                  <button key={p.label} onClick={() => setPreset(p.days)} className="flex-1 rounded-md bg-[#0d0f14] ring-1 ring-white/[0.07] py-1 text-[10px] text-gray-400 hover:text-white hover:ring-white/20 transition-colors">
                    {p.label}
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-[10px] text-gray-500 mb-1">From</label>
                <input type="date" value={draftStart} onChange={e => setDraftStart(e.target.value)} className="w-full rounded-lg bg-[#0d0f14] border border-white/[0.07] px-3 py-1.5 text-xs text-white [color-scheme:dark] focus:outline-none focus:ring-1 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-[10px] text-gray-500 mb-1">To</label>
                <input type="date" value={draftEnd} onChange={e => setDraftEnd(e.target.value)} className="w-full rounded-lg bg-[#0d0f14] border border-white/[0.07] px-3 py-1.5 text-xs text-white [color-scheme:dark] focus:outline-none focus:ring-1 focus:ring-indigo-500" />
              </div>

              <div className="flex gap-2 pt-1">
                <button onClick={() => setOpen(false)} className="flex-1 rounded-lg bg-[#0d0f14] ring-1 ring-white/[0.07] py-1.5 text-xs text-gray-400 hover:text-white transition-colors">Cancel</button>
                <button onClick={apply} className="flex-1 rounded-lg bg-indigo-500 hover:bg-indigo-400 py-1.5 text-xs font-semibold text-white transition-colors">Apply</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

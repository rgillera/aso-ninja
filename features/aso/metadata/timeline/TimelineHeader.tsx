"use client";

import { useState, useRef, useEffect } from "react";
import { CalendarIcon, InformationCircleIcon, DevicePhoneMobileIcon } from "@heroicons/react/24/outline";
import type { App } from "@/libs/contracts";
import { countryFlag } from "@/libs/countries";
import { FollowButton, StoreLinkButton } from "@/features/aso/AppHeader";
import { daysAgo, fmtRange, fromDateStr, toDateStr, today } from "./utils";

type Props = {
  app: App;
  rangeStart: Date;
  rangeEnd: Date;
  onRangeChange: (start: Date, end: Date) => void;
};

const PRESETS = [
  { label: "30D", days: 30 },
  { label: "90D", days: 90 },
  { label: "6M", days: 180 },
  { label: "1Y", days: 365 },
];

export function TimelineHeader({ app, rangeStart, rangeEnd, onRangeChange }: Props) {
  const [open, setOpen] = useState(false);
  const [draftStart, setDraftStart] = useState(toDateStr(rangeStart));
  const [draftEnd, setDraftEnd] = useState(toDateStr(rangeEnd));
  const ref = useRef<HTMLDivElement>(null);
  const todayStr = toDateStr(today());

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function openCustom() {
    setDraftStart(toDateStr(rangeStart));
    setDraftEnd(toDateStr(rangeEnd));
    setOpen(v => !v);
  }

  const draftValid = !!draftStart && !!draftEnd && draftStart <= draftEnd && draftEnd <= todayStr;

  function apply() {
    if (!draftValid) return;
    onRangeChange(fromDateStr(draftStart), fromDateStr(draftEnd));
    setOpen(false);
  }

  const activePreset = toDateStr(rangeEnd) === todayStr
    ? PRESETS.find(p => toDateStr(daysAgo(p.days)) === toDateStr(rangeStart))
    : undefined;

  return (
    <div className="shrink-0 flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-white/[0.07] light:border-black/[0.08]">
      <div className="flex items-center gap-3">
        {app.icon_url ? (
          <img src={app.icon_url} alt={app.name} className="size-8 rounded-xl object-cover shrink-0" />
        ) : (
          <div className="size-8 rounded-xl bg-[#0a0a0c] light:bg-gray-100 shrink-0 flex items-center justify-center">
            <DevicePhoneMobileIcon className="size-4 text-gray-500" />
          </div>
        )}
        <div>
          <p className="text-sm font-semibold text-white light:text-gray-900 leading-tight">{app.name}</p>
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
          <h1 className="text-sm font-semibold text-white light:text-gray-900">Timeline</h1>
          <span title="The store listing is saved once a day for your app and its competitors. A dot marks a day something changed.">
            <InformationCircleIcon className="size-4 text-gray-500" />
          </span>
        </div>

        <div className="flex items-center rounded-lg bg-[#141417] light:bg-white p-0.5">
          {PRESETS.map(p => (
            <button
              key={p.label}
              onClick={() => onRangeChange(daysAgo(p.days), today())}
              className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                activePreset?.label === p.label
                  ? "bg-white/10 light:bg-indigo-50 text-white light:text-indigo-700"
                  : "text-gray-400 light:text-gray-600 hover:text-white light:hover:text-gray-900"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="relative" ref={ref}>
          <button
            onClick={openCustom}
            className={`flex items-center gap-2 rounded-lg bg-[#141417] light:bg-white px-3 py-2 text-xs transition-colors ${
              activePreset ? "text-gray-400 light:text-gray-600" : "text-white light:text-indigo-700 ring-1 ring-indigo-500/40"
            } hover:text-white light:hover:text-gray-900`}
          >
            <CalendarIcon className="size-3.5 text-gray-500" />
            {fmtRange(rangeStart, rangeEnd)}
          </button>

          {open && (
            <div className="absolute right-0 top-full mt-2 z-50 w-64 rounded-xl bg-[#141417] light:bg-white shadow-xl shadow-black/40 light:shadow-black/10 p-4 space-y-3">
              <p className="text-xs font-semibold text-white light:text-gray-900">Custom range</p>
              <div>
                <label className="block text-[10px] text-gray-500 mb-1">From</label>
                <input type="date" value={draftStart} max={draftEnd || todayStr} onChange={e => setDraftStart(e.target.value)} className="w-full rounded-lg bg-[#0a0a0c] light:bg-gray-50 px-3 py-1.5 text-xs text-white light:text-gray-900 [color-scheme:dark] light:[color-scheme:light] focus:outline-none focus:ring-1 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-[10px] text-gray-500 mb-1">To</label>
                <input type="date" value={draftEnd} min={draftStart} max={todayStr} onChange={e => setDraftEnd(e.target.value)} className="w-full rounded-lg bg-[#0a0a0c] light:bg-gray-50 px-3 py-1.5 text-xs text-white light:text-gray-900 [color-scheme:dark] light:[color-scheme:light] focus:outline-none focus:ring-1 focus:ring-indigo-500" />
              </div>
              {!draftValid && draftStart && draftEnd && (
                <p className="text-[10px] text-red-400 light:text-red-600">
                  {draftEnd > todayStr ? "End date can't be in the future." : "Start date must be before the end date."}
                </p>
              )}
              <div className="flex gap-2 pt-1">
                <button onClick={() => setOpen(false)} className="flex-1 rounded-lg bg-[#0a0a0c] light:bg-gray-50 py-1.5 text-xs text-gray-400 light:text-gray-600 hover:text-white light:hover:text-gray-900 transition-colors">Cancel</button>
                <button onClick={apply} disabled={!draftValid} className="flex-1 rounded-lg bg-indigo-500 hover:bg-indigo-400 disabled:opacity-40 disabled:hover:bg-indigo-500 py-1.5 text-xs font-semibold text-white transition-colors">Apply</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

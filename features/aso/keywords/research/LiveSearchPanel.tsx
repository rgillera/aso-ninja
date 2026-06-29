"use client";

import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { XMarkIcon, CalendarDaysIcon } from "@heroicons/react/24/outline";
import type { AppSearchResult } from "@/app/api/keywords/search/route";
import type { RankingEntry } from "@/app/api/keywords/rankings-history/route";

type Props = {
  keyword: string;
  store: "ios" | "android";
  country: string;
  onClose: () => void;
};

const TABS = ["Live Search", "Past Results"];

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return String(n);
}

function Stars({ rating }: { rating: number }) {
  const full    = Math.floor(rating);
  const partial = rating - full;
  return (
    <div className="flex items-center gap-px">
      {[1, 2, 3, 4, 5].map((i) => {
        const fill = i <= full ? 1 : i === full + 1 && partial > 0 ? partial : 0;
        return (
          <svg key={i} className="size-2.5" viewBox="0 0 20 20">
            <defs>
              <linearGradient id={`star-${rating}-${i}`} x1="0" x2="1" y1="0" y2="0">
                <stop offset={`${fill * 100}%`} stopColor="#F59E0B" />
                <stop offset={`${fill * 100}%`} stopColor="#D1D5DB" />
              </linearGradient>
            </defs>
            <path
              fill={`url(#star-${rating}-${i})`}
              d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
            />
          </svg>
        );
      })}
    </div>
  );
}

function AppRow({ app }: { app: AppSearchResult }) {
  const slots = [app.screenshotUrls[0] ?? "", app.screenshotUrls[1] ?? "", app.screenshotUrls[2] ?? ""];

  return (
    <div className="border-b border-gray-100 last:border-0">
      {/* App info */}
      <div className="flex items-center gap-2.5 px-3 pt-2.5 pb-2">
        <span className="text-[9px] font-bold text-gray-300 w-3 shrink-0 text-center">{app.position}</span>
        <div className="w-12 h-12 rounded-2xl overflow-hidden shrink-0 bg-gray-100 border border-black/[0.06]">
          {app.icon && <img src={app.icon} alt="" className="w-full h-full object-cover" />} {/* eslint-disable-line @next/next/no-img-element */}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold text-gray-900 truncate leading-tight">{app.name}</p>
          <p className="text-[10px] text-gray-500 truncate leading-tight">{app.subtitle || app.developer}</p>
          {app.rating > 0 && (
            <div className="flex items-center gap-1 mt-0.5">
              <Stars rating={app.rating} />
              <span className="text-[9px] text-gray-400">{formatCount(app.ratingCount)}</span>
            </div>
          )}
        </div>
        <span className="text-[10px] font-semibold text-[#007AFF] bg-[#007AFF]/10 rounded-full px-2.5 py-1 whitespace-nowrap shrink-0">
          {app.price === "Free" ? "GET" : app.price}
        </span>
      </div>
      {/* Screenshots */}
      {slots.some(Boolean) && (
        <div className="flex gap-1.5 px-3 pb-2.5">
          {slots.map((url, si) => (
            <div key={si} className="flex-1 rounded-xl overflow-hidden bg-gray-100 aspect-[9/19.5]">
              {url
                ? <img src={url} alt="" className="w-full h-full object-cover" /> /* eslint-disable-line @next/next/no-img-element */
                : <div className="w-full h-full bg-gray-200" />
              }
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PhoneFrame({ keyword, apps, loading }: { keyword: string; apps: AppSearchResult[]; loading: boolean }) {
  return (
    <div
      className="relative shrink-0 bg-black rounded-[3rem] shadow-2xl"
      style={{ width: 390, height: 780, boxShadow: "0 0 0 9px #1e1e1e, 0 0 0 11px #111, 0 30px 80px rgba(0,0,0,0.5)" }}
    >
      {/* Side buttons */}
      <div className="absolute -left-2.5 top-20 w-1.5 h-8 bg-[#2a2a2a] rounded-l-sm" />
      <div className="absolute -left-2.5 top-32 w-1.5 h-12 bg-[#2a2a2a] rounded-l-sm" />
      <div className="absolute -left-2.5 top-48 w-1.5 h-12 bg-[#2a2a2a] rounded-l-sm" />
      <div className="absolute -right-2.5 top-28 w-1.5 h-16 bg-[#2a2a2a] rounded-r-sm" />

      {/* Screen */}
      <div className="absolute inset-[3px] bg-white rounded-[2.6rem] overflow-hidden flex flex-col">
        {/* Dynamic island */}
        <div className="flex justify-center pt-2.5 shrink-0">
          <div className="w-24 h-6 bg-black rounded-full" />
        </div>

        {/* Status bar */}
        <div className="flex items-center justify-between px-5 pt-1 pb-0.5 shrink-0">
          <span className="text-[11px] font-semibold text-black leading-none">9:41</span>
          <div className="flex items-center gap-1">
            {/* Signal bars */}
            <svg className="size-3.5" viewBox="0 0 17 12" fill="black">
              <rect x="0" y="8" width="3" height="4" rx="0.5" />
              <rect x="4" y="5" width="3" height="7" rx="0.5" />
              <rect x="8" y="2" width="3" height="10" rx="0.5" />
              <rect x="12" y="0" width="3" height="12" rx="0.5" opacity="0.3" />
            </svg>
            {/* Wifi */}
            <svg className="size-3.5" viewBox="0 0 16 12" fill="black">
              <path d="M8 9.5a1.5 1.5 0 110 3 1.5 1.5 0 010-3z" />
              <path d="M4.5 6.5A4.97 4.97 0 018 5c1.38 0 2.63.56 3.54 1.46L13 5a7 7 0 00-10 0l1.5 1.5z" opacity="0.7" />
              <path d="M1.5 3.5A9.95 9.95 0 018 1c2.76 0 5.26 1.12 7.07 2.93L16.5 2.5A12 12 0 000 2.5l1.5 1z" opacity="0.3" />
            </svg>
            {/* Battery */}
            <div className="flex items-center">
              <div className="w-6 h-3 rounded-[3px] border border-black/40 p-px">
                <div className="h-full w-full bg-black rounded-[2px]" />
              </div>
              <div className="w-0.5 h-1.5 bg-black/40 rounded-r-sm ml-px" />
            </div>
          </div>
        </div>

        {/* App Store search bar */}
        <div className="px-3 py-2 shrink-0">
          <div className="flex items-center gap-2 bg-[#f2f2f7] rounded-xl px-3 py-2">
            <svg className="size-3.5 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
            <span className="flex-1 text-[12px] text-gray-900 font-normal truncate">{keyword}</span>
            <svg className="size-3 text-gray-400 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </div>
        </div>

        {/* Results label */}
        <div className="px-3 pb-1 shrink-0">
          <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
            {loading ? "Loading…" : `${apps.length} results`}
          </span>
        </div>

        {/* App list */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {loading
            ? [...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-2 px-3 py-2.5 border-b border-gray-100 animate-pulse">
                  <div className="w-12 h-12 rounded-2xl bg-gray-200 shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-2.5 bg-gray-200 rounded w-3/4" />
                    <div className="h-2 bg-gray-200 rounded w-1/2" />
                    <div className="h-2 bg-gray-200 rounded w-2/3" />
                  </div>
                  <div className="w-10 h-6 bg-gray-200 rounded-full" />
                </div>
              ))
            : apps.map((app) => (
                <AppRow key={app.position} app={app} />
              ))}
        </div>

        {/* Home indicator */}
        <div className="flex justify-center py-2 shrink-0">
          <div className="w-24 h-1 bg-black/20 rounded-full" />
        </div>
      </div>
    </div>
  );
}

// ── Past Results grid ────────────────────────────────────────────────────────

function toYMD(d: Date) {
  return d.toISOString().split("T")[0];
}

function dateRange(from: string, to: string): string[] {
  const dates: string[] = [];
  const cur = new Date(from + "T00:00:00");
  const end = new Date(to   + "T00:00:00");
  while (cur <= end) { dates.push(toYMD(cur)); cur.setDate(cur.getDate() + 1); }
  return dates;
}

function PastResultsGrid({
  keyword, store, country,
}: { keyword: string; store: string; country: string }) {
  const defaultTo   = toYMD(new Date());
  const defaultFrom = toYMD(new Date(Date.now() - 29 * 86400_000));

  const [from, setFrom] = useState(defaultFrom);
  const [to,   setTo]   = useState(defaultTo);
  const [rows, setRows] = useState<RankingEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(
      `/api/keywords/rankings-history?keyword=${encodeURIComponent(keyword)}&store=${store}&country=${country}&from=${from}&to=${to}`
    )
      .then((r) => r.json())
      .then((d) => { setRows(d.rows ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [keyword, store, country, from, to]);

  const dates = useMemo(() => dateRange(from, to), [from, to]);

  // Build lookup: date → position → entry
  const grid = useMemo(() => {
    const map = new Map<string, Map<number, RankingEntry>>();
    for (const r of rows) {
      if (!map.has(r.recorded_on)) map.set(r.recorded_on, new Map());
      map.get(r.recorded_on)!.set(r.position, r);
    }
    return map;
  }, [rows]);

  const maxPos = useMemo(() => {
    let m = 0;
    for (const r of rows) if (r.position > m) m = r.position;
    return Math.max(m, 10);
  }, [rows]);

  // Group dates by month for header
  const months = useMemo(() => {
    const groups: { label: string; dates: string[] }[] = [];
    for (const d of dates) {
      const label = new Date(d + "T00:00:00").toLocaleString("en", { month: "long", year: "numeric" });
      if (!groups.length || groups[groups.length - 1].label !== label)
        groups.push({ label, dates: [] });
      groups[groups.length - 1].dates.push(d);
    }
    return groups;
  }, [dates]);

  const hasData = rows.length > 0;

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Header row: title + date range */}
      <div className="flex items-center justify-between gap-4 shrink-0">
        <p className="text-sm font-medium text-gray-300">
          Ranking History on the selected period for this keyword
        </p>
        <div className="flex items-center gap-2 rounded-lg bg-[#0d0f14] ring-1 ring-white/[0.08] px-3 py-1.5 text-xs text-gray-400 shrink-0">
          <CalendarDaysIcon className="size-3.5 text-gray-500" />
          <input
            type="date"
            value={from}
            max={to}
            onChange={(e) => setFrom(e.target.value)}
            className="bg-transparent text-gray-300 outline-none"
            style={{ colorScheme: "dark", width: "6.5rem" }}
          />
          <span className="text-gray-600">–</span>
          <input
            type="date"
            value={to}
            min={from}
            onChange={(e) => setTo(e.target.value)}
            className="bg-transparent text-gray-300 outline-none"
            style={{ colorScheme: "dark", width: "6.5rem" }}
          />
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="text-xs text-gray-600 animate-pulse">Loading ranking history…</div>
          </div>
        ) : !hasData ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2">
            <p className="text-sm text-gray-600">No history yet for this keyword.</p>
            <p className="text-xs text-gray-700">Open Live Search to start recording daily rankings.</p>
          </div>
        ) : (
          <table className="border-separate border-spacing-0 text-[10px]">
            <thead>
              {/* Month groups */}
              <tr>
                <th className="sticky left-0 z-20 bg-[#141417] w-8" />
                {months.map((m) => (
                  <th
                    key={m.label}
                    colSpan={m.dates.length}
                    className="text-left text-gray-500 font-medium px-1 pb-0.5 whitespace-nowrap"
                  >
                    {m.label}
                  </th>
                ))}
              </tr>
              {/* Day numbers */}
              <tr>
                <th className="sticky left-0 z-20 bg-[#141417] w-8" />
                {dates.map((d) => {
                  const day = new Date(d + "T00:00:00").getDate();
                  const hasEntries = grid.has(d);
                  return (
                    <th key={d} className={`text-center pb-2 px-0.5 font-medium ${hasEntries ? "text-gray-400" : "text-gray-700"}`}>
                      {day}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: maxPos }, (_, idx) => idx + 1).map((pos) => (
                <tr key={pos}>
                  {/* Position label */}
                  <td className="sticky left-0 z-10 bg-[#141417] text-right pr-2 text-gray-600 font-bold tabular-nums align-middle">
                    {pos}
                  </td>
                  {dates.map((d) => {
                    const entry = grid.get(d)?.get(pos);
                    return (
                      <td key={d} className="p-0.5 align-middle">
                        {entry ? (
                          <div className="relative group/cell">
                            <div className="w-8 h-8 rounded-xl overflow-hidden bg-white/[0.05]">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={entry.app_icon} alt="" className="w-full h-full object-cover" />
                            </div>
                            {/* Tooltip */}
                            <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-30 opacity-0 group-hover/cell:opacity-100 transition-opacity">
                              <div className="bg-[#0d0f14] ring-1 ring-white/[0.12] rounded-lg px-2 py-1.5 text-[9px] text-gray-200 whitespace-nowrap shadow-xl">
                                <p className="font-semibold">#{pos}</p>
                                <p>{entry.app_name}</p>
                                <p className="text-gray-500">{d}</p>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="w-8 h-8" />
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ── Main panel ────────────────────────────────────────────────────────────────

export function LiveSearchPanel({ keyword, store, country, onClose }: Props) {
  const [apps, setApps]           = useState<AppSearchResult[]>([]);
  const [loading, setLoading]     = useState(true);
  const [activeTab, setActiveTab] = useState("Live Search");

  useEffect(() => {
    setLoading(true);
    setApps([]);
    fetch(`/api/keywords/search?term=${encodeURIComponent(keyword)}&store=${store}&country=${country}`)
      .then((r) => r.json())
      .then((data) => { setApps(data.apps ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [keyword, store, country]);

  const isPastResults = activeTab === "Past Results";

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Modal card — wider for Past Results */}
      <div className={`relative z-10 w-full bg-[#141417] rounded-2xl ring-1 ring-white/[0.1] shadow-2xl overflow-hidden flex flex-col transition-all ${isPastResults ? "max-w-5xl" : "max-w-4xl"}`}
        style={{ maxHeight: "90vh" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.07] shrink-0">
          <h2 className="text-sm font-medium text-gray-300">
            Live Search insights for{" "}
            <span className="font-bold text-white">{keyword}</span>
          </h2>
          <button onClick={onClose} className="text-gray-600 hover:text-white transition-colors">
            <XMarkIcon className="size-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-0 px-6 border-b border-white/[0.07] shrink-0">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-3 text-xs font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
                activeTab === tab
                  ? "border-indigo-500 text-white"
                  : "border-transparent text-gray-500 hover:text-gray-300"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Body */}
        {isPastResults ? (
          <div className="p-6 flex-1 overflow-hidden flex flex-col min-h-0">
            <PastResultsGrid keyword={keyword} store={store} country={country} />
          </div>
        ) : (
          <div className="flex items-start gap-10 p-8 overflow-auto">
            {/* Phone */}
            <PhoneFrame keyword={keyword} apps={apps} loading={loading} />

            {/* Side list */}
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500 mb-4">
                Top {loading ? "—" : apps.length} apps ranking for{" "}
                <span className="text-gray-300 font-medium">"{keyword}"</span>
                {" "}in the {store === "ios" ? "App Store" : "Play Store"} ({country.toUpperCase()})
              </p>
              <div className="space-y-2">
                {loading
                  ? [...Array(12)].map((_, i) => (
                      <div key={i} className="flex items-center gap-2 py-1 animate-pulse">
                        <div className="w-4 h-3 bg-white/[0.05] rounded shrink-0" />
                        <div className="w-6 h-6 rounded-lg bg-white/[0.05] shrink-0" />
                        <div className="flex-1 space-y-1">
                          <div className="h-2 bg-white/[0.05] rounded w-3/4" />
                          <div className="h-1.5 bg-white/[0.05] rounded w-1/2" />
                        </div>
                      </div>
                    ))
                  : apps.slice(0, 15).map((app) => (
                      <div key={app.position} className="flex items-center gap-2 py-1 rounded-md hover:bg-white/[0.03] px-1.5 -mx-1.5 transition-colors">
                        <span className={`text-[10px] font-bold tabular-nums w-4 text-right shrink-0 ${
                          app.position === 1 ? "text-yellow-400" :
                          app.position <= 3  ? "text-orange-400" :
                                               "text-gray-600"
                        }`}>
                          {app.position}
                        </span>
                        <div className="w-6 h-6 rounded-lg overflow-hidden shrink-0 bg-white/[0.05]">
                          {app.icon && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={app.icon} alt="" className="w-full h-full object-cover" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-medium text-gray-300 truncate leading-tight">{app.name}</p>
                          <p className="text-[9px] text-gray-700 truncate leading-tight">{app.developer}</p>
                        </div>
                        {app.rating > 0 && (
                          <span className="shrink-0 text-[9px] font-medium text-yellow-500 tabular-nums">
                            {app.rating.toFixed(1)}
                          </span>
                        )}
                      </div>
                    ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

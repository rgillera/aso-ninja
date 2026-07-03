"use client";

import { useMemo, useState } from "react";
import {
  ChevronLeftIcon, ChevronRightIcon,
  ChevronDoubleLeftIcon, ChevronDoubleRightIcon,
  MagnifyingGlassIcon, StarIcon, CheckCircleIcon,
} from "@heroicons/react/24/outline";
import type { ChartApp } from "./types";
import type { MarketStatusMap } from "@/app/api/market/status/route";
import { Dropdown, DropdownOption } from "./Dropdown";
import { StoreIcon } from "./StoreIcon";

type SortKey = "rank" | "price" | "rating" | "updated";
type StatusFilter = "all" | "connected" | "unconnected";

type Props = {
  apps: ChartApp[];
  loading: boolean;
  country: string;
  connected: MarketStatusMap;
  onToggleConnected: (storeId: string, store: "ios" | "android") => void;
};

const PAGE_SIZE = 25;

const STATUS_LABEL: Record<StatusFilter, string> = {
  all: "All statuses",
  connected: "Connected",
  unconnected: "Unconnected",
};

// Routed through a server redirect that looks up the developer's privacy
// policy (scraped from the store page for iOS, a real field on Play for
// Android) and forwards there — useful for the growth team vetting an app
// before outreach. Falls back to the store listing if no privacy link is found.
function privacyRedirectHref(app: ChartApp, country: string): string {
  const params = new URLSearchParams({ store: app.store, storeId: app.storeId, country, fallback: app.url });
  return `/api/market/redirect?${params}`;
}

function formatRatingCount(n: number | null): string {
  if (n === null) return "";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function formatUpdated(ts: number | null): string {
  if (ts === null) return "—";
  return new Date(ts).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export function ExplorerTable({ apps, loading, country, connected, onToggleConnected }: Props) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [page, setPage] = useState(0);
  const [sortKey, setSortKey] = useState<SortKey>("rank");
  const [sortAsc, setSortAsc] = useState(true);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return apps.filter((a) => {
      if (q && !a.name.toLowerCase().includes(q) && !a.developer.toLowerCase().includes(q)) return false;
      const isConnected = !!connected[a.storeId];
      if (statusFilter === "connected" && !isConnected) return false;
      if (statusFilter === "unconnected" && isConnected) return false;
      return true;
    });
  }, [apps, query, statusFilter, connected]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let diff = 0;
      if (sortKey === "rank") diff = a.rank - b.rank;
      if (sortKey === "price") diff = a.price - b.price;
      if (sortKey === "rating") diff = (b.rating ?? -1) - (a.rating ?? -1);
      if (sortKey === "updated") diff = (b.lastUpdatedAt ?? -1) - (a.lastUpdatedAt ?? -1);
      return sortAsc ? diff : -diff;
    });
  }, [filtered, sortKey, sortAsc]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const pageRows = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortAsc((v) => !v);
    else { setSortKey(key); setSortAsc(true); }
    setPage(0);
  }

  const SortTh = ({ col, label, className = "" }: { col: SortKey; label: string; className?: string }) => (
    <th
      className={`px-3 py-2.5 text-left text-xs font-medium text-gray-500 cursor-pointer select-none hover:text-gray-300 transition-colors whitespace-nowrap ${className}`}
      onClick={() => toggleSort(col)}
    >
      {label}{sortKey === col ? (sortAsc ? " ↑" : " ↓") : ""}
    </th>
  );

  return (
    <div className="mx-6 mb-6 rounded-xl bg-[#1a1d24] ring-1 ring-white/[0.07] overflow-hidden">
      {/* Search + count */}
      <div className="px-4 py-3 border-b border-white/[0.07] flex items-center gap-3">
        <div className="flex items-center gap-1.5 rounded-md bg-[#0d0f14] ring-1 ring-white/[0.08] px-2.5 py-1.5 w-64">
          <MagnifyingGlassIcon className="size-3.5 text-gray-500 shrink-0" />
          <input
            value={query}
            onChange={(e) => { setQuery(e.target.value); setPage(0); }}
            placeholder="Search apps"
            className="flex-1 bg-transparent text-xs text-gray-300 placeholder-gray-600 outline-none min-w-0"
          />
        </div>

        <Dropdown label={STATUS_LABEL[statusFilter]} active={statusFilter !== "all"}>
          <div className="flex flex-col gap-0.5">
            {(Object.keys(STATUS_LABEL) as StatusFilter[]).map((s) => (
              <DropdownOption key={s} label={STATUS_LABEL[s]} active={statusFilter === s} onClick={() => { setStatusFilter(s); setPage(0); }} />
            ))}
          </div>
        </Dropdown>

        <span className="ml-auto text-xs text-gray-600">
          {loading ? "Loading…" : `${sorted.length.toLocaleString()} app${sorted.length !== 1 ? "s" : ""}`}
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] border-collapse">
          <thead>
            <tr className="border-b border-white/[0.07]">
              <SortTh col="rank" label="Rank" className="w-16" />
              <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500">App</th>
              <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500">Category</th>
              <SortTh col="price" label="Price" />
              <SortTh col="rating" label="Rating" />
              <SortTh col="updated" label="Last Updated" />
              <th className="px-3 py-2.5 text-right text-xs font-medium text-gray-500">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-white/[0.04]">
                    <td colSpan={7} className="px-3 py-3.5">
                      <div className="h-4 rounded bg-white/[0.04] animate-pulse" />
                    </td>
                  </tr>
                ))
              : pageRows.map((app) => (
                  <tr key={app.storeId} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                    <td className="px-3 py-2.5 text-sm tabular-nums font-medium text-white">#{app.rank}</td>
                    <td className="px-3 py-2.5">
                      <a href={privacyRedirectHref(app, country)} target="_blank" rel="noreferrer" className="flex items-center gap-3 min-w-0 group" title="Open developer's privacy policy">
                        <div className="relative shrink-0">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={app.iconUrl} alt="" className="size-9 rounded-lg bg-white/[0.05]" />
                          <span className="absolute -bottom-1 -right-1 flex size-4 items-center justify-center rounded-full bg-[#1a1d24] ring-1 ring-white/10">
                            <StoreIcon store={app.store} className="size-2.5 text-gray-300" />
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm text-gray-200 group-hover:text-white truncate">{app.name}</p>
                          <p className="text-xs text-gray-600 truncate">{app.developer}</p>
                        </div>
                      </a>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-gray-400 whitespace-nowrap">{app.genre}</td>
                    <td className="px-3 py-2.5 text-sm text-gray-300 whitespace-nowrap">{app.priceLabel}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      {app.rating !== null ? (
                        <span className="inline-flex items-center gap-1 text-sm text-gray-300">
                          <StarIcon className="size-3.5 text-amber-400" />
                          {app.rating.toFixed(1)}
                          {app.ratingCount !== null && (
                            <span className="text-xs text-gray-600">({formatRatingCount(app.ratingCount)})</span>
                          )}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-600">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-gray-500 whitespace-nowrap">{formatUpdated(app.lastUpdatedAt)}</td>
                    <td className="px-3 py-2.5 text-right whitespace-nowrap">
                      <button
                        onClick={() => onToggleConnected(app.storeId, app.store)}
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
                          connected[app.storeId]
                            ? "bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25"
                            : "bg-white/[0.05] text-gray-500 hover:bg-white/[0.08] hover:text-gray-300"
                        }`}
                      >
                        {connected[app.storeId] && <CheckCircleIcon className="size-3.5" />}
                        {connected[app.storeId] ? "Connected" : "Unconnected"}
                      </button>
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>

        {!loading && sorted.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <MagnifyingGlassIcon className="size-8 text-gray-700 mb-3" />
            <p className="text-sm font-medium text-gray-400">No apps match your filters</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-white/[0.07] text-xs text-gray-500">
          <span>{page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, sorted.length)} of {sorted.length.toLocaleString()}</span>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(0)} disabled={page === 0} className="p-1.5 rounded hover:bg-white/[0.06] disabled:opacity-30 disabled:cursor-default transition-colors">
              <ChevronDoubleLeftIcon className="size-3.5" />
            </button>
            <button onClick={() => setPage((p) => p - 1)} disabled={page === 0} className="p-1.5 rounded hover:bg-white/[0.06] disabled:opacity-30 disabled:cursor-default transition-colors">
              <ChevronLeftIcon className="size-3.5" />
            </button>
            <span className="px-2">{page + 1} / {totalPages}</span>
            <button onClick={() => setPage((p) => p + 1)} disabled={page === totalPages - 1} className="p-1.5 rounded hover:bg-white/[0.06] disabled:opacity-30 disabled:cursor-default transition-colors">
              <ChevronRightIcon className="size-3.5" />
            </button>
            <button onClick={() => setPage(totalPages - 1)} disabled={page === totalPages - 1} className="p-1.5 rounded hover:bg-white/[0.06] disabled:opacity-30 disabled:cursor-default transition-colors">
              <ChevronDoubleRightIcon className="size-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

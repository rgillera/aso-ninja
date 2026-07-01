"use client";

import { useEffect, useMemo, useState } from "react";
import { ChartBarIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";
import { AppHeader } from "@/features/aso/AppHeader";
import { useActiveApp } from "@/features/dashboard/ActiveAppContext";
import { VolumeHistoryPanel } from "@/features/aso/keywords/performance/VolumeHistoryPanel";
import { RankedTable } from "./RankedTable";
import {
  DEFAULT_FILTERS, isBranded, wordCount,
  type RankedKeyword, type RankedHistoryPoint, type Filters,
} from "./types";
import type { RankedKeywordsResult } from "@/app/api/keywords/ranked/route";

function formatDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

function NoAppSelected() {
  return (
    <div className="h-full flex items-center justify-center bg-[#111318]">
      <div className="text-center">
        <MagnifyingGlassIcon className="size-10 text-gray-700 mx-auto mb-4" />
        <p className="text-sm font-medium text-gray-400">No apps yet</p>
        <p className="mt-1 text-sm text-gray-600">Use the search bar above to find an app.</p>
      </div>
    </div>
  );
}

function RankedChart({ history, loading }: { history: RankedHistoryPoint[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="flex h-72 items-center justify-center text-xs text-gray-500">
        Loading history…
      </div>
    );
  }
  if (history.length === 0) {
    return (
      <div className="flex h-72 flex-col items-center justify-center text-center px-6">
        <ChartBarIcon className="size-8 text-gray-700 mb-3" />
        <p className="text-sm font-medium text-gray-400">No ranking history yet</p>
        <p className="mt-1 text-xs text-gray-600 max-w-xs">
          Run Live Search on a keyword to start capturing which positions your app holds over time.
        </p>
      </div>
    );
  }
  return (
    <div className="px-2 pt-4">
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={history} margin={{ top: 8, right: 24, left: 0, bottom: 8 }}>
          <defs>
            <linearGradient id="rk-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            tick={{ fill: "#6b7280", fontSize: 11 }}
            axisLine={{ stroke: "#ffffff1a" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "#6b7280", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={48}
          />
          <Tooltip
            labelFormatter={(d) => formatDate(String(d))}
            formatter={(v) => [v, "Ranked keywords"]}
            contentStyle={{ background: "#1a1d24", border: "1px solid #ffffff1a", borderRadius: 8, fontSize: 12 }}
            labelStyle={{ color: "#9ca3af" }}
          />
          <Area
            type="monotone"
            dataKey="count"
            name="Ranked keywords"
            stroke="#6366f1"
            strokeWidth={2}
            fill="url(#rk-grad)"
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function RankedKeywordsPage() {
  const activeApp = useActiveApp();
  const [keywords, setKeywords] = useState<RankedKeyword[]>([]);
  const [history,  setHistory]  = useState<RankedHistoryPoint[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [tab,               setTab]               = useState<"chart" | "table">("table");
  const [filters,           setFilters]           = useState<Filters>(DEFAULT_FILTERS);
  const [volumeHistoryTerm, setVolumeHistoryTerm] = useState<string | null>(null);

  useEffect(() => {
    const storeId = activeApp?.store_id;
    if (!storeId) return;
    setLoading(true);
    const params = new URLSearchParams({
      storeId,
      store:   activeApp.store ?? "ios",
      country: activeApp.country ?? "us",
    });
    fetch(`/api/keywords/ranked?${params}`)
      .then((r) => r.json())
      .then((data: RankedKeywordsResult) => {
        setKeywords(data.keywords ?? []);
        setHistory(data.history ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [activeApp?.store_id, activeApp?.store, activeApp?.country]);

  const filtered = useMemo(() => {
    if (!activeApp) return [];
    const q = filters.query.trim().toLowerCase();
    return keywords.filter((k) => {
      if (q && !k.term.toLowerCase().includes(q)) return false;
      const vol = k.volume ?? 0;
      if (vol < filters.volumeMin || vol > filters.volumeMax) return false;
      if (k.rank < filters.rankMin || k.rank > filters.rankMax) return false;
      if (filters.type !== "all") {
        const branded = isBranded(k.term, activeApp.name);
        if (filters.type === "branded" && !branded) return false;
        if (filters.type === "generic" && branded)  return false;
      }
      if (filters.wordCount !== "all" && wordCount(k.term) !== filters.wordCount) return false;
      return true;
    });
  }, [keywords, filters, activeApp]);

  if (!activeApp) return <NoAppSelected />;

  return (
    <div className="h-full flex flex-col overflow-hidden bg-[#111318]">
      <AppHeader app={activeApp} title="All Ranked Keywords" />

      <div className="flex-1 overflow-y-auto">
        {/* Tabs + count */}
        <div className="flex items-center justify-between gap-2 px-6 pt-3 pb-1">
          <div className="flex items-center gap-1">
            {([["chart", "Ranked Over Time"], ["table", "Keyword Table"]] as const).map(([id, label]) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  tab === id ? "bg-white/[0.08] text-white" : "text-gray-500 hover:text-gray-300"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <span className="text-xs text-gray-600">
            {loading
              ? "Loading…"
              : `${keywords.length.toLocaleString()} keyword${keywords.length !== 1 ? "s" : ""} ranked`}
          </span>
        </div>

        {tab === "chart" ? (
          <div className="mx-6 mb-6 rounded-xl bg-[#1a1d24] ring-1 ring-white/[0.07] overflow-hidden">
            <RankedChart history={history} loading={loading} />
          </div>
        ) : (
          <div className="pt-4">
            {loading ? (
              <div className="flex items-center justify-center py-16 text-xs text-gray-500">
                Loading ranked keywords…
              </div>
            ) : keywords.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center px-6">
                <ChartBarIcon className="size-8 text-gray-700 mb-3" />
                <p className="text-sm font-medium text-gray-400">No ranked keywords found</p>
                <p className="mt-1 text-xs text-gray-600 max-w-xs">
                  Use Live Search on tracked keywords to record which positions your app holds.
                </p>
              </div>
            ) : (
              <RankedTable
                keywords={keywords}
                filtered={filtered}
                appName={activeApp.name}
                filters={filters}
                onFiltersChange={(patch) => setFilters((prev) => ({ ...prev, ...patch }))}
                onViewVolumeHistory={setVolumeHistoryTerm}
              />
            )}
          </div>
        )}
      </div>

      {volumeHistoryTerm && (
        <VolumeHistoryPanel
          term={volumeHistoryTerm}
          store={activeApp.store ?? "ios"}
          country={activeApp.country ?? "us"}
          onClose={() => setVolumeHistoryTerm(null)}
        />
      )}
    </div>
  );
}

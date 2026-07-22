"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";
import { XMarkIcon, ArrowTrendingUpIcon } from "@heroicons/react/24/outline";

type HistoryPoint = { recorded_on: string; downloads: number; estimated: number };
type HistoryResponse = { history: HistoryPoint[]; share: number };

type Props = {
  term: string;
  appId: string;
  onClose: () => void;
};

function formatDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export function DownloadsHistoryPanel({ term, appId, onClose }: Props) {
  const [data, setData] = useState<HistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);

  // No reset-to-true at the top: this panel only ever mounts fresh (the
  // caller unmounts it to null before showing a different keyword), so
  // `loading` already starts true via useState above.
  useEffect(() => {
    const params = new URLSearchParams({ appId, keyword: term, days: "90" });
    fetch(`/api/keywords/downloads-history?${params}`)
      .then((r) => r.json())
      .then((d: HistoryResponse) => setData(d))
      .catch(() => setData({ history: [], share: 0 }))
      .finally(() => setLoading(false));
  }, [term, appId]);

  const rows = data?.history ?? [];

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 w-full max-w-2xl bg-[#141417] rounded-2xl ring-1 ring-white/[0.1] shadow-2xl overflow-hidden flex flex-col" style={{ maxHeight: "85vh" }}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.07] shrink-0">
          <h2 className="text-sm font-medium text-gray-300">
            Est. downloads history for{" "}
            <span className="font-bold text-white">{term}</span>
          </h2>
          <button onClick={onClose} className="text-gray-600 hover:text-white transition-colors">
            <XMarkIcon className="size-5" />
          </button>
        </div>

        <div className="p-6 flex-1 overflow-auto">
          {loading ? (
            <div className="flex h-64 items-center justify-center text-xs text-gray-500">
              Loading downloads history…
            </div>
          ) : rows.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center text-center px-6">
              <ArrowTrendingUpIcon className="size-8 text-gray-700 mb-3" />
              <p className="text-sm font-medium text-gray-400">No history yet</p>
              <p className="mt-1 text-xs text-gray-600 max-w-xs">
                A day is added here each time your connected app syncs real download data.
              </p>
            </div>
          ) : rows.length === 1 ? (
            <div className="flex h-64 flex-col items-center justify-center text-center px-6">
              <p className="text-3xl font-semibold text-white">~{rows[0].estimated}</p>
              <p className="mt-1 text-xs text-gray-600">Only synced day so far — {formatDate(rows[0].recorded_on)}</p>
              <p className="mt-3 text-xs text-gray-600 max-w-xs">A trend will appear once your app keeps syncing.</p>
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={rows} margin={{ top: 16, right: 24, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                  <XAxis
                    dataKey="recorded_on"
                    tickFormatter={formatDate}
                    tick={{ fill: "#6b7280", fontSize: 11 }}
                    axisLine={{ stroke: "#ffffff1a" }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "#6b7280", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    width={32}
                    allowDecimals={false}
                  />
                  <Tooltip
                    labelFormatter={(d) => formatDate(String(d))}
                    formatter={(value) => [value, "Est. downloads"]}
                    contentStyle={{ background: "#1a1d24", border: "1px solid #ffffff1a", borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: "#9ca3af" }}
                  />
                  <Line
                    type="stepAfter"
                    dataKey="estimated"
                    name="Est. downloads"
                    stroke="#34d399"
                    strokeWidth={2}
                    dot={{ r: 3, fill: "#34d399", strokeWidth: 0 }}
                  />
                </LineChart>
              </ResponsiveContainer>
              <p className="mt-3 text-center text-[11px] text-gray-600">
                {Math.round((data?.share ?? 0) * 100)}% of total downloads (today&apos;s search-volume/rank weight, applied to each past day)
              </p>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

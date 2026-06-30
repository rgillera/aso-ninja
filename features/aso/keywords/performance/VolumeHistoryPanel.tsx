"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";
import { XMarkIcon, ChartBarIcon } from "@heroicons/react/24/outline";
import type { VolumeHistoryEntry } from "@/app/api/keywords/volume-history/route";

type Props = {
  term: string;
  store: "ios" | "android";
  country: string;
  onClose: () => void;
};

function formatDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export function VolumeHistoryPanel({ term, store, country, onClose }: Props) {
  const [rows, setRows]       = useState<VolumeHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ term, store, country });
    fetch(`/api/keywords/volume-history?${params}`)
      .then((r) => r.json())
      .then((d) => setRows(d.rows ?? []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [term, store, country]);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 w-full max-w-2xl bg-[#141417] rounded-2xl ring-1 ring-white/[0.1] shadow-2xl overflow-hidden flex flex-col" style={{ maxHeight: "85vh" }}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.07] shrink-0">
          <h2 className="text-sm font-medium text-gray-300">
            Volume history for{" "}
            <span className="font-bold text-white">{term}</span>
          </h2>
          <button onClick={onClose} className="text-gray-600 hover:text-white transition-colors">
            <XMarkIcon className="size-5" />
          </button>
        </div>

        <div className="p-6 flex-1 overflow-auto">
          {loading ? (
            <div className="flex h-64 items-center justify-center text-xs text-gray-500">
              Loading volume history…
            </div>
          ) : rows.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center text-center px-6">
              <ChartBarIcon className="size-8 text-gray-700 mb-3" />
              <p className="text-sm font-medium text-gray-400">No history yet for this keyword</p>
              <p className="mt-1 text-xs text-gray-600 max-w-xs">
                Volume snapshots accumulate automatically each time this keyword is checked.
              </p>
            </div>
          ) : rows.length === 1 ? (
            <div className="flex h-64 flex-col items-center justify-center text-center px-6">
              <p className="text-3xl font-semibold text-white">{rows[0].score}</p>
              <p className="mt-1 text-xs text-gray-600">Only snapshot so far — {formatDate(rows[0].recorded_on)}</p>
              <p className="mt-3 text-xs text-gray-600 max-w-xs">A trend will appear once more snapshots accumulate.</p>
            </div>
          ) : (
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
                  domain={[0, 100]}
                  tick={{ fill: "#6b7280", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={32}
                />
                <Tooltip
                  labelFormatter={(d) => formatDate(String(d))}
                  formatter={(value) => [value, "Volume"]}
                  contentStyle={{ background: "#1a1d24", border: "1px solid #ffffff1a", borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: "#9ca3af" }}
                />
                <Line
                  type="stepAfter"
                  dataKey="score"
                  name="Volume"
                  stroke="#818cf8"
                  strokeWidth={2}
                  dot={{ r: 3, fill: "#818cf8", strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

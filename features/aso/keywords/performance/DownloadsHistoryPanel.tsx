"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";
import { XMarkIcon, ArrowTrendingUpIcon } from "@heroicons/react/24/outline";

import type { DownloadsHistoryWeek } from "@/app/api/keywords/downloads-history/route";

type HistoryResponse = { history: DownloadsHistoryWeek[] };

const DOWNLOADS_FORMATTER = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });

function formatRank(rank: number | null | undefined): string {
  if (rank === undefined) return "Not checked yet";
  return rank === null ? "Unranked" : `#${rank}`;
}

type Props = {
  term: string;
  appId: string;
  onClose: () => void;
};

function formatDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function formatShortDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

// Same dot as Rank/Volume History: none on a week with no estimate, where
// connectNulls={false} already breaks the line.
function dotShape(props: unknown) {
  const { cx, cy, payload } = props as { cx: number; cy: number; payload: DownloadsHistoryWeek };
  if (payload.estimated == null) return <></>;
  return <circle cx={cx} cy={cy} r={3} fill="#818cf8" />;
}

function tooltipContent(props: unknown) {
  const { active, payload } = props as { active?: boolean; payload?: { payload: DownloadsHistoryWeek }[] };
  if (!active || !payload || !payload.length) return null;
  const week = payload[0].payload;
  return (
    <div className="rounded-lg border border-white/10 bg-[#1a1d24] light:bg-white px-3 py-2 text-xs">
      <p className="text-gray-400 light:text-gray-600">Week of {formatShortDate(week.week)}</p>
      <p className="mt-0.5 text-gray-200 light:text-gray-800">
        Est. downloads: <span className="font-semibold">{week.estimated != null ? `~${week.estimated}` : "-"}</span>
      </p>
      <p className="mt-0.5 text-gray-400 light:text-gray-600">Rank: {formatRank(week.rank)}</p>
      {week.days < 7 && <p className="mt-0.5 text-gray-500">{week.days} of 7 days synced</p>}
    </div>
  );
}

export function DownloadsHistoryPanel({ term, appId, onClose }: Props) {
  const [data, setData] = useState<HistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);

  // No reset-to-true at the top: this panel only ever mounts fresh (the
  // caller unmounts it to null before showing a different keyword), so
  // `loading` already starts true via useState above.
  useEffect(() => {
    const params = new URLSearchParams({ appId, keyword: term, weeks: "13" });
    fetch(`/api/keywords/downloads-history?${params}`)
      .then((r) => r.json())
      .then((d: HistoryResponse) => setData(d))
      .catch(() => setData({ history: [] }))
      .finally(() => setLoading(false));
  }, [term, appId]);

  const rows = data?.history ?? [];
  const currentIndex = rows.length - 1;

  // Latest (usually still in progress) week in bold, same as Rank History.
  function axisTick(props: unknown) {
    const { x, y, payload, index } = props as { x: number; y: number; payload: { value: string }; index: number };
    const isCurrent = index === currentIndex;
    return (
      <text x={x} y={y + 12} textAnchor="middle" fontSize={11} fill={isCurrent ? "#e5e7eb" : "#6b7280"} fontWeight={isCurrent ? 600 : 400}>
        {formatShortDate(payload.value)}
      </text>
    );
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 w-full max-w-2xl bg-[#141417] light:bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col" style={{ maxHeight: "85vh" }}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.07] light:border-black/[0.08] shrink-0">
          <h2 className="text-sm font-medium text-gray-300 light:text-gray-700">
            Est. downloads history for{" "}
            <span className="font-bold text-white light:text-gray-900">{term}</span>
          </h2>
          <button onClick={onClose} className="text-gray-600 light:text-gray-400 hover:text-white light:hover:text-gray-900 transition-colors">
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
              <ArrowTrendingUpIcon className="size-8 text-gray-700 light:text-gray-300 mb-3" />
              <p className="text-sm font-medium text-gray-400 light:text-gray-600">No history yet</p>
              <p className="mt-1 text-xs text-gray-600 light:text-gray-400 max-w-xs">
                Weekly totals appear here as your connected app syncs real download data.
              </p>
            </div>
          ) : rows.length === 1 ? (
            <div className="flex h-64 flex-col items-center justify-center text-center px-6">
              <p className="text-3xl font-semibold text-white light:text-gray-900">{rows[0].estimated != null ? `~${rows[0].estimated}` : "-"}</p>
              <p className="mt-1 text-xs text-gray-600 light:text-gray-400">Week of {formatDate(rows[0].week)} ({rows[0].days} of 7 days synced)</p>
              <p className="mt-3 text-xs text-gray-600 light:text-gray-400 max-w-xs">A weekly trend will appear once your app keeps syncing.</p>
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={rows} margin={{ top: 8, right: 24, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                  <XAxis
                    dataKey="week"
                    tick={axisTick}
                    axisLine={{ stroke: "#ffffff1a" }}
                    tickLine={false}
                    interval={Math.max(0, Math.ceil(rows.length / 13) - 1)}
                  />
                  <YAxis
                    tick={{ fill: "#6b7280", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    width={36}
                    allowDecimals={false}
                    tickFormatter={(v) => DOWNLOADS_FORMATTER.format(v)}
                  />
                  <Tooltip content={tooltipContent} cursor={{ stroke: "#ffffff20" }} />
                  <Line type="linear" dataKey="estimated" name="Est. downloads" stroke="#818cf8" strokeWidth={2} dot={dotShape} activeDot={{ r: 4 }} connectNulls={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
              <p className="mt-3 text-center text-[11px] text-gray-600 light:text-gray-400">
                Weekly totals: each day&apos;s real downloads, split by this keyword&apos;s search volume and rank on that day
              </p>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

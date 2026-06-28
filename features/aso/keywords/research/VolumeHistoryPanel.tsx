"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { XMarkIcon } from "@heroicons/react/24/outline";

type Snapshot = { score: number; recorded_on: string };

type Props = {
  keyword: string;
  store: "ios" | "android";
  country: string;
  onClose: () => void;
};

function LineChart({ data }: { data: Snapshot[] }) {
  const W = 480;
  const H = 160;
  const PAD = { top: 16, right: 16, bottom: 32, left: 36 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const minScore = 0;
  const maxScore = 100;

  const points = data.map((d, i) => {
    const x = PAD.left + (data.length === 1 ? innerW / 2 : (i / (data.length - 1)) * innerW);
    const y = PAD.top + innerH - ((d.score - minScore) / (maxScore - minScore)) * innerH;
    return { x, y, ...d };
  });

  const pathD = points.length > 1
    ? points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ")
    : null;

  const areaD = points.length > 1
    ? `${pathD} L ${points[points.length - 1].x} ${PAD.top + innerH} L ${points[0].x} ${PAD.top + innerH} Z`
    : null;

  const yTicks = [0, 25, 50, 75, 100];
  const formatDate = (s: string) => {
    const d = new Date(s);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const xLabelIndices = data.length <= 7
    ? data.map((_, i) => i)
    : [0, Math.floor(data.length / 2), data.length - 1];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }}>
      <defs>
        <linearGradient id="vol-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6366f1" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Grid lines */}
      {yTicks.map((tick) => {
        const y = PAD.top + innerH - ((tick - minScore) / (maxScore - minScore)) * innerH;
        return (
          <g key={tick}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y} y2={y} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
            <text x={PAD.left - 6} y={y + 4} textAnchor="end" fontSize="9" fill="rgba(255,255,255,0.3)">
              {tick}
            </text>
          </g>
        );
      })}

      {/* X labels */}
      {xLabelIndices.map((i) => {
        const p = points[i];
        return (
          <text key={i} x={p.x} y={H - 4} textAnchor="middle" fontSize="9" fill="rgba(255,255,255,0.3)">
            {formatDate(data[i].recorded_on)}
          </text>
        );
      })}

      {/* Area fill */}
      {areaD && <path d={areaD} fill="url(#vol-grad)" />}

      {/* Line */}
      {pathD && (
        <path d={pathD} fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      )}

      {/* Dots */}
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={data.length === 1 ? 5 : 3} fill="#6366f1" stroke="#1a1d24" strokeWidth="2" />
      ))}
    </svg>
  );
}

export function VolumeHistoryPanel({ keyword, store, country, onClose }: Props) {
  const [data, setData] = useState<Snapshot[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    setData(null);
    setError(false);
    const params = new URLSearchParams({ term: keyword, store, country, days: "90" });
    fetch(`/api/keywords/popularity?${params}`)
      .then((r) => r.json())
      .then((d: Snapshot[]) => setData(d))
      .catch(() => setError(true));
  }, [keyword, store, country]);

  return createPortal(
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-[9998] bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="fixed z-[9999] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[560px] max-w-[92vw] bg-[#1a1d24] ring-1 ring-white/[0.10] rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.07]">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-gray-500 font-semibold mb-0.5">Volume history</p>
            <h3 className="text-sm font-semibold text-white">{keyword}</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-500 hover:text-white hover:bg-white/[0.08] transition-colors"
          >
            <XMarkIcon className="size-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-5">
          {!data && !error && (
            <div className="h-40 flex items-center justify-center">
              <div className="size-6 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
            </div>
          )}

          {error && (
            <div className="h-40 flex items-center justify-center text-sm text-gray-500">
              Failed to load history.
            </div>
          )}

          {data && data.length === 0 && (
            <div className="h-40 flex flex-col items-center justify-center gap-2 text-center">
              <p className="text-sm text-gray-400">No history yet</p>
              <p className="text-xs text-gray-600 max-w-xs">
                Popularity is recorded each time keywords are fetched. Check back tomorrow to see the trend build up.
              </p>
            </div>
          )}

          {data && data.length > 0 && (
            <>
              <LineChart data={data} />
              {data.length === 1 && (
                <p className="mt-3 text-center text-xs text-gray-600">
                  Only one data point so far — history will grow as you fetch keywords daily.
                </p>
              )}
              <div className="mt-4 flex items-center justify-between text-[10px] text-gray-600">
                <span>Last 90 days · {store === "ios" ? "App Store" : "Play Store"} · {country.toUpperCase()}</span>
                <span>Latest score: <span className="text-indigo-400 font-semibold">{data[data.length - 1].score}</span></span>
              </div>
            </>
          )}
        </div>
      </div>
    </>,
    document.body
  );
}

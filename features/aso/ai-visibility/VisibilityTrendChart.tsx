"use client";

import { ChartBarIcon } from "@heroicons/react/24/outline";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";
import type { AiVisibilityHistoryPoint } from "./types";

function formatDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

export function VisibilityTrendChart({ history, loading }: { history: AiVisibilityHistoryPoint[]; loading: boolean }) {
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
        <ChartBarIcon className="size-8 text-gray-700 light:text-gray-300 mb-3" />
        <p className="text-sm font-medium text-gray-400 light:text-gray-600">No visibility history yet</p>
        <p className="mt-1 text-xs text-gray-600 light:text-gray-400 max-w-xs">
          Track a prompt and run a check to start capturing whether your app gets mentioned over time.
        </p>
      </div>
    );
  }
  return (
    <div className="px-2 pt-4">
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={history} margin={{ top: 8, right: 24, left: 0, bottom: 8 }}>
          <defs>
            <linearGradient id="av-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
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
            allowDecimals={false}
          />
          <Tooltip
            labelFormatter={(d) => formatDate(String(d))}
            formatter={(v) => [v, "Prompts mentioning you"]}
            contentStyle={{ background: "#1a1d24", border: "1px solid #ffffff1a", borderRadius: 8, fontSize: 12 }}
            labelStyle={{ color: "#9ca3af" }}
          />
          <Area
            type="monotone"
            dataKey="count"
            name="Prompts mentioning you"
            stroke="#6366f1"
            strokeWidth={2}
            fill="url(#av-grad)"
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

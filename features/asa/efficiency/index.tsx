"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AdjustmentsHorizontalIcon, ExclamationTriangleIcon, ArrowPathIcon,
  InformationCircleIcon, MagnifyingGlassIcon, DevicePhoneMobileIcon, BanknotesIcon,
} from "@heroicons/react/24/outline";
import { AppHeader } from "@/features/aso/AppHeader";
import { useActiveApp } from "@/features/dashboard/ActiveAppContext";
import { usePlanSlug } from "@/features/dashboard/PlanContext";
import { useWorkspaceId } from "@/features/dashboard/WorkspaceContext";
import { FeatureLocked } from "@/features/subscription/FeatureLocked";
import { isPlanAtLeast } from "@/features/subscription/planTiers";
import { EfficiencyTable } from "./EfficiencyTable";
import { tagEfficiency } from "./types";
import type { AsaConnectionStatus, AsaKeywordRow } from "@/libs/asa-connections/types";

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

function StatCard({ label, value, tone }: { label: string; value: string; tone: "amber" | "emerald" }) {
  const color = tone === "amber" ? "text-amber-400" : "text-emerald-400";
  return (
    <div className="flex-1 rounded-xl bg-[#1a1d24] ring-1 ring-white/[0.07] px-5 py-4">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-600">{label}</p>
      <p className={`mt-1 text-2xl font-semibold tabular-nums ${color}`}>{value}</p>
    </div>
  );
}

export default function EfficiencyPage() {
  const activeApp = useActiveApp();
  const planSlug = usePlanSlug();
  const workspaceId = useWorkspaceId();
  const locked = !isPlanAtLeast(planSlug, "pro");

  const [connection, setConnection] = useState<AsaConnectionStatus | null>(null);
  const [connLoading, setConnLoading] = useState(true);

  const [keywords, setKeywords] = useState<AsaKeywordRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadConnection = useCallback(() => {
    if (!workspaceId) return;
    return fetch(`/api/asa/connect?workspaceId=${workspaceId}`)
      .then((r) => r.json())
      .then((data: AsaConnectionStatus) => setConnection(data))
      .catch(() => setConnection({ connected: false }))
      .finally(() => setConnLoading(false));
  }, [workspaceId]);

  useEffect(() => { loadConnection(); }, [loadConnection]);

  const loadKeywords = useCallback(() => {
    if (!activeApp?.id || activeApp.store !== "ios" || !connection?.connected) return;
    setLoading(true);
    setError(null);
    fetch(`/api/asa/keywords?appId=${activeApp.id}`)
      .then((r) => r.json())
      .then((data: { keywords?: AsaKeywordRow[]; error?: string }) => {
        if (data.error) { setError(data.error); return; }
        setKeywords(data.keywords ?? []);
      })
      .catch(() => setError("Couldn't reach the server."))
      .finally(() => setLoading(false));
  }, [activeApp?.id, activeApp?.store, connection?.connected]);

  useEffect(() => { loadKeywords(); }, [loadKeywords]);

  // No new fetch — same AsaKeywordRow data Active Bids pulls, just tagged
  // with a per-keyword CPI and a Pause/Scale/Monitor read on it.
  const tagged = useMemo(() => tagEfficiency(keywords), [keywords]);
  const pauseCount = useMemo(() => tagged.filter((r) => r.efficiency === "Pause candidate").length, [tagged]);
  const scaleCount = useMemo(() => tagged.filter((r) => r.efficiency === "Scale candidate").length, [tagged]);

  if (!activeApp) return <NoAppSelected />;

  if (locked) {
    return (
      <div className="h-full flex flex-col overflow-hidden bg-[#111318]">
        <AppHeader app={activeApp} title="Efficiency" />
        <FeatureLocked
          minPlan="pro"
          icon={AdjustmentsHorizontalIcon}
          title="ASA Intelligence is a Pro feature"
          description="Upgrade to Pro or above to see cost-per-install and pause/scale calls for every keyword you bid on."
          benefits={[
            "Cost per install for every actively bid keyword",
            "Flags keywords spending with zero installs — pause candidates",
            "Flags keywords converting well below your average CPI — scale candidates",
          ]}
        />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden bg-[#111318]">
      <AppHeader app={activeApp} title="Efficiency" />
      <div className="flex items-center gap-1.5 px-6 pt-3 text-xs text-gray-500">
        <InformationCircleIcon className="size-3.5 text-gray-600 shrink-0" />
        Cost per install and Pause/Scale calls, computed from your last 30 days of Apple Search Ads spend.
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeApp.store !== "ios" ? (
          <div className="mx-6 my-6 rounded-xl bg-[#1a1d24] ring-1 ring-white/[0.07] flex flex-col items-center justify-center py-16 text-center">
            <DevicePhoneMobileIcon className="size-8 text-gray-700 mb-3" />
            <p className="text-sm font-medium text-gray-400">ASA Intelligence is only available for iOS apps</p>
            <p className="text-xs text-gray-600 mt-1">Apple Search Ads doesn&apos;t apply to Android listings.</p>
          </div>
        ) : connLoading ? (
          <div className="mx-6 my-6 rounded-xl bg-[#1a1d24] ring-1 ring-white/[0.07] flex items-center justify-center py-16">
            <p className="text-sm text-gray-500">Loading…</p>
          </div>
        ) : !connection?.connected ? (
          <div className="mx-6 my-6 rounded-xl bg-[#1a1d24] ring-1 ring-white/[0.07] flex flex-col items-center justify-center py-16 text-center">
            <BanknotesIcon className="size-8 text-gray-700 mb-3" />
            <p className="text-sm font-medium text-gray-400">Apple Search Ads isn&apos;t connected yet</p>
            {activeApp.id && activeApp.id !== "__preview__" ? (
              <p className="text-xs text-gray-600 mt-1">
                <Link
                  href={`/dashboard/apps/${activeApp.id}/settings#apple-search-ads`}
                  className="text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  Connect it in Settings
                </Link>
                . One connection covers every app in the workspace.
              </p>
            ) : (
              <p className="text-xs text-gray-600 mt-1">Follow this app to connect Apple Search Ads from its Settings page.</p>
            )}
          </div>
        ) : (
          <>
            {error && (
              <div className="mx-6 mt-4 flex items-center gap-2 rounded-lg bg-red-500/10 px-3 py-2.5 text-xs text-red-400">
                <ExclamationTriangleIcon className="size-4 shrink-0" />
                {error}
              </div>
            )}

            {loading ? (
              <div className="mx-6 my-6 rounded-xl bg-[#1a1d24] ring-1 ring-white/[0.07] flex items-center justify-center py-16">
                <p className="text-sm text-gray-500">Loading…</p>
              </div>
            ) : keywords.length === 0 && !error ? (
              <div className="mx-6 my-6 rounded-xl bg-[#1a1d24] ring-1 ring-white/[0.07] flex flex-col items-center justify-center py-16 text-center">
                <AdjustmentsHorizontalIcon className="size-8 text-gray-700 mb-3" />
                <p className="text-sm font-medium text-gray-400">No active campaigns found for this app</p>
                <p className="text-xs text-gray-600 mt-1">This Apple Search Ads account isn&apos;t running campaigns for this app&apos;s App Store listing.</p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-4 px-6 pt-4">
                  <StatCard label="Pause candidates" value={String(pauseCount)} tone="amber" />
                  <StatCard label="Scale candidates" value={String(scaleCount)} tone="emerald" />
                  <button
                    onClick={loadKeywords}
                    disabled={loading}
                    className="flex items-center gap-1.5 rounded-lg bg-[#0d0f14] ring-1 ring-white/[0.08] hover:ring-indigo-500/40 disabled:opacity-50 px-3 py-2 text-xs font-medium text-gray-300 hover:text-white transition-colors self-start"
                  >
                    <ArrowPathIcon className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
                    Refresh
                  </button>
                </div>
                <div className="mt-4">
                  <EfficiencyTable rows={tagged} />
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

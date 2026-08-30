"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  BanknotesIcon, ExclamationTriangleIcon, CheckCircleIcon, ArrowPathIcon,
  InformationCircleIcon, MagnifyingGlassIcon, DevicePhoneMobileIcon,
} from "@heroicons/react/24/outline";
import { AppHeader } from "@/features/aso/AppHeader";
import { useActiveApp } from "@/features/dashboard/ActiveAppContext";
import { usePlanSlug } from "@/features/dashboard/PlanContext";
import { useWorkspaceId } from "@/features/dashboard/WorkspaceContext";
import { FeatureLocked } from "@/features/subscription/FeatureLocked";
import { isPlanAtLeast } from "@/features/subscription/planTiers";
import { ActiveBidsTable } from "./ActiveBidsTable";
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

function StatusBadge({ connection }: { connection: AsaConnectionStatus }) {
  if (connection.status === "error") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-red-400">
        <ExclamationTriangleIcon className="size-3.5" />
        Connection error
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400">
      <CheckCircleIcon className="size-3.5" />
      Connected
    </span>
  );
}

export default function ActiveBidsPage() {
  const activeApp = useActiveApp();
  const planSlug = usePlanSlug();
  const workspaceId = useWorkspaceId();
  const locked = !isPlanAtLeast(planSlug, "pro");

  const [connection, setConnection] = useState<AsaConnectionStatus | null>(null);
  const [connLoading, setConnLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);

  const [keywords, setKeywords] = useState<AsaKeywordRow[]>([]);
  const [kwLoading, setKwLoading] = useState(false);
  const [kwError, setKwError] = useState<string | null>(null);
  const [reportWarning, setReportWarning] = useState<string | null>(null);

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
    setKwLoading(true);
    setKwError(null);
    fetch(`/api/asa/keywords?appId=${activeApp.id}`)
      .then((r) => r.json())
      .then((data: { keywords?: AsaKeywordRow[]; reportWarning?: string | null; error?: string }) => {
        if (data.error) { setKwError(data.error); return; }
        setKeywords(data.keywords ?? []);
        setReportWarning(data.reportWarning ?? null);
      })
      .catch(() => setKwError("Couldn't reach the server."))
      .finally(() => setKwLoading(false));
  }, [activeApp?.id, activeApp?.store, connection?.connected]);

  useEffect(() => { loadKeywords(); }, [loadKeywords]);

  async function handleDisconnect() {
    if (!workspaceId) return;
    setDisconnecting(true);
    try {
      await fetch(`/api/asa/connect?workspaceId=${workspaceId}`, { method: "DELETE" });
      setKeywords([]);
      await loadConnection();
    } finally {
      setDisconnecting(false);
    }
  }

  if (!activeApp) return <NoAppSelected />;

  if (locked) {
    return (
      <div className="h-full flex flex-col overflow-hidden bg-[#111318]">
        <AppHeader app={activeApp} title="Active Bids" />
        <FeatureLocked
          minPlan="pro"
          icon={BanknotesIcon}
          title="ASA Intelligence is a Pro feature"
          description="Upgrade to Pro or above to pull the real keywords your apps are bidding on in Apple Search Ads."
          benefits={[
            "See every campaign, ad group, and keyword you're actively bidding on",
            "Current bid, spend, impressions, taps, and installs per keyword",
            "Pulled live from your connected Apple Search Ads account",
          ]}
        />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden bg-[#111318]">
      <AppHeader app={activeApp} title="Active Bids" />
      <div className="flex items-center gap-1.5 px-6 pt-3 text-xs text-gray-500">
        <InformationCircleIcon className="size-3.5 text-gray-600 shrink-0" />
        Pulled live from your connected Apple Search Ads account, not an estimate.
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
            <div className="mx-6 mt-4 rounded-xl bg-[#1a1d24] ring-1 ring-white/[0.07] px-5 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <StatusBadge connection={connection} />
                {connection.displayLabel && <span className="text-xs text-gray-500">{connection.displayLabel}</span>}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={loadKeywords}
                  disabled={kwLoading}
                  className="flex items-center gap-1.5 rounded-lg bg-[#0d0f14] ring-1 ring-white/[0.08] hover:ring-indigo-500/40 disabled:opacity-50 px-3 py-2 text-xs font-medium text-gray-300 hover:text-white transition-colors"
                >
                  <ArrowPathIcon className={`size-3.5 ${kwLoading ? "animate-spin" : ""}`} />
                  {kwLoading ? "Syncing…" : "Sync now"}
                </button>
                <button
                  onClick={handleDisconnect}
                  disabled={disconnecting}
                  className="rounded-lg px-3 py-2 text-xs font-medium text-gray-500 hover:text-red-400 transition-colors"
                >
                  {disconnecting ? "Disconnecting…" : "Disconnect"}
                </button>
              </div>
            </div>

            {connection.status === "error" && connection.lastError && (
              <div className="mx-6 mt-4 flex items-center gap-2 rounded-lg bg-red-500/10 px-3 py-2.5 text-xs text-red-400">
                <ExclamationTriangleIcon className="size-4 shrink-0" />
                {connection.lastError}
              </div>
            )}
            {reportWarning && (
              <div className="mx-6 mt-4 flex items-center gap-2 rounded-lg bg-amber-500/10 px-3 py-2.5 text-xs text-amber-400">
                <ExclamationTriangleIcon className="size-4 shrink-0" />
                {reportWarning}
              </div>
            )}
            {kwError && (
              <div className="mx-6 mt-4 flex items-center gap-2 rounded-lg bg-red-500/10 px-3 py-2.5 text-xs text-red-400">
                <ExclamationTriangleIcon className="size-4 shrink-0" />
                {kwError}
              </div>
            )}

            {kwLoading ? (
              <div className="mx-6 my-6 rounded-xl bg-[#1a1d24] ring-1 ring-white/[0.07] flex items-center justify-center py-16">
                <p className="text-sm text-gray-500">Loading…</p>
              </div>
            ) : keywords.length === 0 && !kwError ? (
              <div className="mx-6 my-6 rounded-xl bg-[#1a1d24] ring-1 ring-white/[0.07] flex flex-col items-center justify-center py-16 text-center">
                <BanknotesIcon className="size-8 text-gray-700 mb-3" />
                <p className="text-sm font-medium text-gray-400">No active campaigns found for this app</p>
                <p className="text-xs text-gray-600 mt-1">This Apple Search Ads account isn&apos;t running campaigns for this app&apos;s App Store listing.</p>
              </div>
            ) : (
              <div className="mt-4">
                <ActiveBidsTable rows={keywords} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

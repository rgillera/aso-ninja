"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  LightBulbIcon, ExclamationTriangleIcon, ArrowTrendingUpIcon, ArrowDownTrayIcon,
  InformationCircleIcon, MagnifyingGlassIcon, DevicePhoneMobileIcon, BanknotesIcon,
} from "@heroicons/react/24/outline";
import { AppHeader } from "@/features/aso/AppHeader";
import { useActiveApp } from "@/features/dashboard/ActiveAppContext";
import { usePlanSlug } from "@/features/dashboard/PlanContext";
import { useWorkspaceId } from "@/features/dashboard/WorkspaceContext";
import { FeatureLocked } from "@/features/subscription/FeatureLocked";
import { isPlanAtLeast } from "@/features/subscription/planTiers";
import { downloadCsv } from "@/features/aso/keywords/csvExport";
import { findWastedSpend, findUntappedOpportunities, type WastedSpendRow, type UntappedOpportunityRow } from "./types";
import type { SavedKeyword } from "@/app/api/keywords/list/route";
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

function WastedSpendPanel({ rows }: { rows: WastedSpendRow[] }) {
  function handleExport() {
    downloadCsv(
      "asa-wasted-spend.csv",
      ["Keyword", "Organic Rank", "Spend (30d)", "Campaign", "Ad Group"],
      rows.map((r) => [r.term, r.rank, r.spend, r.campaignName, r.adGroupName])
    );
  }

  return (
    <div className="mx-6 mb-6 rounded-xl bg-[#1a1d24] ring-1 ring-white/[0.07] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.07]">
        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 flex items-center gap-1.5">
          <ExclamationTriangleIcon className="size-3.5 text-amber-400" />
          Possibly wasted spend
        </span>
        {rows.length > 0 && (
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-gray-400 ring-1 ring-white/[0.08] hover:text-white hover:bg-white/[0.05] transition-colors"
          >
            <ArrowDownTrayIcon className="size-3.5" />
            Export CSV
          </button>
        )}
      </div>

      {rows.length === 0 ? (
        <p className="px-4 py-6 text-xs text-gray-600">No overlap found — you&apos;re not currently bidding on keywords you already rank top 3 for organically.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] border-collapse">
            <thead>
              <tr className="border-b border-white/[0.07]">
                <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500">Keyword</th>
                <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500">Organic Rank</th>
                <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500">Spend (30d)</th>
                <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500">Campaign / Ad Group</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.term} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                  <td className="px-3 py-2.5 text-sm text-gray-200">{r.term}</td>
                  <td className="px-3 py-2.5 text-sm font-medium tabular-nums text-emerald-400">#{r.rank}</td>
                  <td className="px-3 py-2.5 text-sm font-medium tabular-nums text-amber-400">{r.currency ?? ""} {r.spend.toFixed(2)}</td>
                  <td className="px-3 py-2.5 text-xs text-gray-500">{r.campaignName} / {r.adGroupName}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function UntappedOpportunityPanel({ rows }: { rows: UntappedOpportunityRow[] }) {
  function handleExport() {
    downloadCsv(
      "asa-untapped-opportunities.csv",
      ["Keyword", "Volume", "Opportunity", "Organic Rank"],
      rows.map((r) => [r.term, r.volume, r.opportunity, r.rank ?? ""])
    );
  }

  return (
    <div className="mx-6 mb-6 rounded-xl bg-[#1a1d24] ring-1 ring-white/[0.07] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.07]">
        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 flex items-center gap-1.5">
          <ArrowTrendingUpIcon className="size-3.5 text-emerald-400" />
          Untapped opportunities
        </span>
        {rows.length > 0 && (
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-gray-400 ring-1 ring-white/[0.08] hover:text-white hover:bg-white/[0.05] transition-colors"
          >
            <ArrowDownTrayIcon className="size-3.5" />
            Export CSV
          </button>
        )}
      </div>

      {rows.length === 0 ? (
        <p className="px-4 py-6 text-xs text-gray-600">No high-value gaps found — your best tracked keywords are either already targeted or already ranking well organically.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[500px] border-collapse">
            <thead>
              <tr className="border-b border-white/[0.07]">
                <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500">Keyword</th>
                <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500">Volume</th>
                <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500">Opportunity</th>
                <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500">Organic Rank</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.term} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                  <td className="px-3 py-2.5 text-sm text-gray-200">{r.term}</td>
                  <td className="px-3 py-2.5 text-sm text-gray-300 tabular-nums">{r.volume}</td>
                  <td className="px-3 py-2.5">
                    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums bg-emerald-500/15 text-emerald-400">
                      {r.opportunity}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-gray-500">{r.rank !== null ? `#${r.rank}` : "Unranked"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function SpendInsightsPage() {
  const activeApp = useActiveApp();
  const planSlug = usePlanSlug();
  const workspaceId = useWorkspaceId();
  const locked = !isPlanAtLeast(planSlug, "pro");

  const [connection, setConnection] = useState<AsaConnectionStatus | null>(null);
  const [connLoading, setConnLoading] = useState(true);

  const [organic, setOrganic] = useState<SavedKeyword[]>([]);
  const [asaKeywords, setAsaKeywords] = useState<AsaKeywordRow[]>([]);
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

  // Both datasets come from routes the sibling ASA pages already use — no
  // new API surface for this page, just a client-side join over the two.
  useEffect(() => {
    if (!activeApp?.id || activeApp.store !== "ios" || !connection?.connected) return;
    setLoading(true);
    setError(null);
    Promise.all([
      fetch(`/api/keywords/list?appId=${activeApp.id}`).then((r) => r.json()),
      fetch(`/api/asa/keywords?appId=${activeApp.id}`).then((r) => r.json()),
    ])
      .then(([kwData, asaData]: [{ keywords?: SavedKeyword[] }, { keywords?: AsaKeywordRow[]; error?: string }]) => {
        if (asaData.error) { setError(asaData.error); return; }
        setOrganic(kwData.keywords ?? []);
        setAsaKeywords(asaData.keywords ?? []);
      })
      .catch(() => setError("Couldn't reach the server."))
      .finally(() => setLoading(false));
  }, [activeApp?.id, activeApp?.store, connection?.connected]);

  const wastedSpend = useMemo(() => findWastedSpend(organic, asaKeywords), [organic, asaKeywords]);
  const untapped = useMemo(() => findUntappedOpportunities(organic, asaKeywords), [organic, asaKeywords]);
  const totalWasted = useMemo(() => wastedSpend.reduce((sum, r) => sum + r.spend, 0), [wastedSpend]);
  const currency = wastedSpend[0]?.currency ?? "";

  if (!activeApp) return <NoAppSelected />;

  if (locked) {
    return (
      <div className="h-full flex flex-col overflow-hidden bg-[#111318]">
        <AppHeader app={activeApp} title="Spend Insights" />
        <FeatureLocked
          minPlan="pro"
          icon={LightBulbIcon}
          title="ASA Intelligence is a Pro feature"
          description="Upgrade to Pro or above to find wasted Apple Search Ads spend and untapped keyword opportunities."
          benefits={[
            "Spot spend on keywords you already rank top 3 for organically",
            "Find high-opportunity keywords you're not bidding on at all",
            "Cross-references your real campaign data with your organic keyword data",
          ]}
        />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden bg-[#111318]">
      <AppHeader app={activeApp} title="Spend Insights" />
      <div className="flex items-center gap-1.5 px-6 pt-3 text-xs text-gray-500">
        <InformationCircleIcon className="size-3.5 text-gray-600 shrink-0" />
        Cross-references your live Apple Search Ads data with your tracked organic keyword data.
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
        ) : error ? (
          <div className="mx-6 mt-4 flex items-center gap-2 rounded-lg bg-red-500/10 px-3 py-2.5 text-xs text-red-400">
            <ExclamationTriangleIcon className="size-4 shrink-0" />
            {error}
          </div>
        ) : loading ? (
          <div className="mx-6 my-6 rounded-xl bg-[#1a1d24] ring-1 ring-white/[0.07] flex items-center justify-center py-16">
            <p className="text-sm text-gray-500">Loading…</p>
          </div>
        ) : (
          <>
            <div className="flex gap-4 px-6 pt-4">
              <StatCard label="Possibly wasted spend (30d)" value={wastedSpend.length ? `${currency} ${totalWasted.toFixed(2)}` : "—"} tone="amber" />
              <StatCard label="Untapped opportunities" value={String(untapped.length)} tone="emerald" />
            </div>

            <div className="mt-4">
              <WastedSpendPanel rows={wastedSpend} />
              <UntappedOpportunityPanel rows={untapped} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

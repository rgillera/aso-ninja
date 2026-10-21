"use client";

import { useState } from "react";
import { SparklesIcon, LockClosedIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { usePlanSlug } from "@/features/dashboard/PlanContext";
import { useWorkspaceId } from "@/features/dashboard/WorkspaceContext";
import { isPlanAtLeast } from "@/features/subscription/planTiers";
import { daysSince } from "@/libs/store/benchmark-utils";
import { compareKey, type CompareApp } from "./types";
import type { CompareInsightApp, CompareInsightsResult } from "@/app/api/market/compare/insights/route";

type Props = { apps: CompareApp[]; country: string };

type Position = {
  key: string;
  name: string;
  iconUrl: string;
  role: string | null;
  note: string | null;
  downloadsShare: number | null;
  revenueShare: number | null;
  revenuePerDownload: number | null;
};

// Each app's percentage of the compared set's total, rounded. null when no
// app in the set has a figure (nothing to divide by).
function sharesOf(values: (number | null)[]): (number | null)[] {
  const total = values.reduce<number>((sum, v) => sum + (v ?? 0), 0);
  return values.map((v) => (total > 0 && v != null ? Math.round((v / total) * 100) : null));
}

function ShareBar({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="min-w-0">
      <div className="flex items-baseline justify-between gap-2 text-[11px] text-gray-500">
        <span>{label}</span>
        <span className="text-gray-300 light:text-gray-700 font-medium">{value != null ? `${value}%` : "n/a"}</span>
      </div>
      <div className="mt-1 h-1.5 rounded-full bg-white/[0.06] light:bg-black/[0.06] overflow-hidden">
        <div className="h-full rounded-full bg-indigo-400 light:bg-indigo-500" style={{ width: `${value ?? 0}%` }} />
      </div>
    </div>
  );
}

export function AiInsights({ apps, country }: Props) {
  const planSlug = usePlanSlug();
  const workspaceId = useWorkspaceId();
  const locked = !isPlanAtLeast(planSlug, "pro_plus");
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [opportunity, setOpportunity] = useState<string | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Only apps whose metadata actually loaded go into the prompt — a still-loading
  // or failed column has nothing meaningful to compare yet.
  const ready = apps.filter((a): a is CompareApp & { storeData: NonNullable<CompareApp["storeData"]> } => !a.loading && !a.failed && !!a.storeData);
  const canGenerate = ready.length >= 2;

  async function generate() {
    setLoading(true);
    setError(null);
    setSummary(null);
    setOpportunity(null);
    setPositions([]);

    const downloads = ready.map((a) => a.estimate?.downloads ?? null);
    const revenues = ready.map((a) => a.estimate?.revenue ?? null);
    const downloadsShares = sharesOf(downloads);
    const revenueShares = sharesOf(revenues);

    const payload: { workspaceId: string; country: string; apps: CompareInsightApp[] } = {
      workspaceId,
      country,
      apps: ready.map((a, i) => ({
        name: a.name,
        store: a.store,
        developer: a.developer,
        category: a.storeData.primaryGenreName || "Unknown",
        rating: a.storeData.rating ?? null,
        ratingCount: a.storeData.ratingCount ?? null,
        daysSinceUpdate: daysSince(a.storeData.lastUpdatedAt) ?? null,
        ageYears: a.storeData.releasedAt ? Math.max(0, Math.round(((Date.now() - a.storeData.releasedAt) / (365 * 24 * 60 * 60 * 1000)) * 10) / 10) : null,
        price: a.storeData.price ?? 0,
        offersIAP: a.storeData.offersIAP ?? null,
        screenshotCount: a.storeData.screenshotUrls?.length ?? 0,
        hasPreviewVideo: !!a.storeData.hasPreviewVideo,
        estDownloads: downloads[i],
        estRevenue: revenues[i],
        downloadsBasis: a.estimate?.downloadsBasis ?? null,
        revenueBasis: a.estimate?.revenueBasis ?? null,
        downloadsShare: downloadsShares[i],
        revenueShare: revenueShares[i],
      })),
    };

    try {
      const res = await fetch("/api/market/compare/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Couldn't generate insights."); return; }
      const result = data as CompareInsightsResult;
      setSummary(result.summary);
      setOpportunity(result.opportunity);
      setPositions(ready.map((a, i) => ({
        key: compareKey(a.store, a.storeId),
        name: a.name,
        iconUrl: a.iconUrl,
        role: result.positions[i]?.role ?? null,
        note: result.positions[i]?.note ?? null,
        downloadsShare: downloadsShares[i],
        revenueShare: revenueShares[i],
        revenuePerDownload: downloads[i] && revenues[i] != null ? revenues[i]! / downloads[i]! : null,
      })));
    } catch {
      setError("Couldn't generate insights.");
    } finally {
      setLoading(false);
    }
  }

  if (locked) {
    return (
      <div className="mx-6 mb-6 rounded-xl bg-[#141417] light:bg-white ring-1 ring-white/[0.06] light:ring-gray-950/[0.07] light:shadow-sm flex flex-col items-center justify-center py-8 px-4 text-center">
        <span className="flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-500 light:text-amber-700 mb-3">
          <LockClosedIcon className="size-2.5" />
          Pro+
        </span>
        <p className="text-xs font-medium text-gray-400 light:text-gray-600">AI Insights is a Pro+ feature</p>
        <p className="mt-1 text-xs text-gray-600 light:text-gray-400 max-w-sm">Upgrade to Pro+ to generate an AI-written market analysis of the apps you&apos;re comparing: who leads, how each monetizes, and where the opening is.</p>
      </div>
    );
  }

  return (
    <div className="mx-6 mb-6 rounded-xl bg-[#141417] light:bg-white ring-1 ring-white/[0.06] light:ring-gray-950/[0.07] light:shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.07] light:border-black/[0.08]">
        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 flex items-center gap-1.5">
          <span className="text-indigo-400 light:text-indigo-600">✦</span>
          AI Insights
        </span>
        <button
          onClick={generate}
          disabled={!canGenerate || loading}
          title={!canGenerate ? "Add at least 2 apps to generate AI insights" : undefined}
          className="flex items-center gap-1.5 rounded-lg bg-indigo-500/10 px-3 py-1.5 text-xs font-medium text-indigo-300 light:text-indigo-600 ring-1 ring-indigo-500/30 hover:bg-indigo-500/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <SparklesIcon className="size-3.5" />
          {loading ? "Generating…" : summary ? "Regenerate" : "Generate AI Insights"}
        </button>
      </div>

      <div className="px-4 py-4">
        {!canGenerate && !summary && !loading && (
          <p className="text-xs text-gray-600 light:text-gray-400">Add at least 2 apps to generate AI insights.</p>
        )}

        {loading && (
          <div className="space-y-2">
            <div className="h-3.5 w-full rounded bg-white/[0.05] light:bg-black/[0.04] animate-pulse" />
            <div className="h-3.5 w-11/12 rounded bg-white/[0.05] light:bg-black/[0.04] animate-pulse" />
            <div className="h-3.5 w-4/5 rounded bg-white/[0.05] light:bg-black/[0.04] animate-pulse" />
          </div>
        )}

        {error && !loading && (
          <p className="flex items-center gap-1.5 text-xs text-amber-400 light:text-amber-700">
            <ExclamationTriangleIcon className="size-3.5 shrink-0" />
            {error}
          </p>
        )}

        {summary && !loading && (
          <div className="space-y-4">
            <p className="text-sm text-gray-300 light:text-gray-700 leading-relaxed">{summary}</p>

            {opportunity && (
              <p className="rounded-lg bg-indigo-500/10 px-3 py-2 text-xs text-indigo-200 light:text-indigo-800">
                <span className="font-semibold">Opportunity: </span>{opportunity}
              </p>
            )}

            {positions.length > 0 && (
              <div className="pt-3 border-t border-white/[0.05] light:border-black/[0.04]">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-600 light:text-gray-400">Market position</p>
                <p className="mt-0.5 text-[11px] text-gray-600 light:text-gray-400">Share of this set&apos;s estimated monthly downloads and revenue in the selected country.</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {positions.map((p) => (
                    <div key={p.key} className="rounded-lg bg-white/[0.03] light:bg-black/[0.02] p-3">
                      <div className="flex items-center gap-2 min-w-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={p.iconUrl} alt="" className="size-6 shrink-0 rounded-md bg-white/[0.05] light:bg-black/[0.04]" />
                        <span className="text-xs font-medium text-gray-200 light:text-gray-800 truncate">{p.name}</span>
                        {p.role && (
                          <span className="ml-auto shrink-0 rounded-full bg-indigo-500/10 px-2 py-0.5 text-[10px] font-medium text-indigo-300 light:text-indigo-700">{p.role}</span>
                        )}
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-3">
                        <ShareBar label="Downloads" value={p.downloadsShare} />
                        <ShareBar label="Revenue" value={p.revenueShare} />
                      </div>
                      <p className="mt-2 text-[11px] text-gray-500">
                        Revenue per download: <span className="text-gray-300 light:text-gray-700">{p.revenuePerDownload != null ? `$${p.revenuePerDownload.toFixed(2)}` : "n/a"}</span>
                      </p>
                      {p.note && <p className="mt-2 text-xs text-gray-400 light:text-gray-600 leading-relaxed">{p.note}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

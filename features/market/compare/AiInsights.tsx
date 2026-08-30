"use client";

import { useState } from "react";
import { SparklesIcon, LockClosedIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { usePlanSlug } from "@/features/dashboard/PlanContext";
import { useWorkspaceId } from "@/features/dashboard/WorkspaceContext";
import { isPlanAtLeast } from "@/features/subscription/planTiers";
import { computeKeywordDensity } from "@/features/aso/metadata/preview/KeywordDensity";
import { daysSince } from "@/libs/store/benchmark-utils";
import { compareKey, FIELD_LIMITS, type CompareApp } from "./types";
import type { CompareInsightApp, CompareInsightsResult } from "@/app/api/market/compare/insights/route";

type Props = { apps: CompareApp[] };

type Gap = { key: string; name: string; note: string; keywords: string[] };

// Flattens computeKeywordDensity's tied-count rows into a plain term list,
// capped so the prompt stays compact — the model gets a representative slice
// of the description's repeated terms, not an exhaustive dump.
function topKeywordsFor(text: string): { term: string; density: number }[] {
  const rows = text ? computeKeywordDensity(text) : [];
  const flat: { term: string; density: number }[] = [];
  for (const row of rows) {
    for (const kw of row.keywords) {
      flat.push({ term: kw, density: row.density });
      if (flat.length >= 10) return flat;
    }
  }
  return flat;
}

// Real set difference over each app's own top-keyword terms — deterministic
// and free, so the model is only ever asked to judge terms that genuinely
// are unique, never to compute (or invent) the gap itself.
function uniqueKeywordsPerApp(termSets: Set<string>[]): string[][] {
  return termSets.map((terms, i) => {
    const others = termSets.filter((_, j) => j !== i);
    return [...terms].filter((t) => !others.some((o) => o.has(t)));
  });
}

export function AiInsights({ apps }: Props) {
  const planSlug = usePlanSlug();
  const workspaceId = useWorkspaceId();
  const locked = !isPlanAtLeast(planSlug, "pro_plus");
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [gaps, setGaps] = useState<Gap[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Only apps whose metadata actually loaded go into the prompt — a still-loading
  // or failed column has nothing meaningful to compare yet.
  const ready = apps.filter((a): a is CompareApp & { storeData: NonNullable<CompareApp["storeData"]> } => !a.loading && !a.failed && !!a.storeData);
  const canGenerate = ready.length >= 2;

  async function generate() {
    setLoading(true);
    setError(null);
    setSummary(null);
    setGaps([]);

    const termSets = ready.map((a) => {
      const rows = a.storeData.description ? computeKeywordDensity(a.storeData.description) : [];
      const terms = new Set<string>();
      for (const row of rows) for (const kw of row.keywords) terms.add(kw);
      return terms;
    });
    const uniqueKeywords = uniqueKeywordsPerApp(termSets);

    const payload: { workspaceId: string; apps: CompareInsightApp[] } = {
      workspaceId,
      apps: ready.map((a, i) => ({
        name: a.name,
        store: a.store,
        developer: a.developer,
        category: a.storeData.primaryGenreName || "Unknown",
        rating: a.storeData.rating ?? null,
        ratingCount: a.storeData.ratingCount ?? null,
        daysSinceUpdate: daysSince(a.storeData.lastUpdatedAt) ?? null,
        screenshotCount: a.storeData.screenshotUrls?.length ?? 0,
        hasPreviewVideo: !!a.storeData.hasPreviewVideo,
        titleLength: a.name.length,
        titleLimit: FIELD_LIMITS[a.store].name,
        subtitleLength: a.storeData.subtitle?.length ?? 0,
        subtitleLimit: FIELD_LIMITS[a.store].subtitle,
        descriptionLength: a.storeData.description?.length ?? 0,
        topKeywords: topKeywordsFor(a.storeData.description ?? ""),
        uniqueKeywords: uniqueKeywords[i],
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
      setGaps(
        ready
          .map((a, i) => ({ key: compareKey(a.store, a.storeId), name: a.name, note: result.gapNotes[i], keywords: uniqueKeywords[i] }))
          .filter((g): g is Gap => !!g.note)
      );
    } catch {
      setError("Couldn't generate insights.");
    } finally {
      setLoading(false);
    }
  }

  if (locked) {
    return (
      <div className="mx-6 mb-6 rounded-xl bg-[#1a1d24] ring-1 ring-white/[0.07] flex flex-col items-center justify-center py-8 px-4 text-center">
        <span className="flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-500 mb-3">
          <LockClosedIcon className="size-2.5" />
          Pro+
        </span>
        <p className="text-xs font-medium text-gray-400">AI Insights is a Pro+ feature</p>
        <p className="mt-1 text-xs text-gray-600 max-w-sm">Upgrade to Pro+ to generate an AI-written summary and keyword gap analysis across the apps you&apos;re comparing.</p>
      </div>
    );
  }

  return (
    <div className="mx-6 mb-6 rounded-xl bg-[#1a1d24] ring-1 ring-white/[0.07] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.07]">
        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 flex items-center gap-1.5">
          <span className="text-indigo-400">✦</span>
          AI Insights
        </span>
        <button
          onClick={generate}
          disabled={!canGenerate || loading}
          title={!canGenerate ? "Add at least 2 apps to generate AI insights" : undefined}
          className="flex items-center gap-1.5 rounded-lg bg-indigo-500/10 px-3 py-1.5 text-xs font-medium text-indigo-300 ring-1 ring-indigo-500/30 hover:bg-indigo-500/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <SparklesIcon className="size-3.5" />
          {loading ? "Generating…" : summary ? "Regenerate" : "Generate AI Insights"}
        </button>
      </div>

      <div className="px-4 py-4">
        {!canGenerate && !summary && !loading && (
          <p className="text-xs text-gray-600">Add at least 2 apps to generate AI insights.</p>
        )}

        {loading && (
          <div className="space-y-2">
            <div className="h-3.5 w-full rounded bg-white/[0.05] animate-pulse" />
            <div className="h-3.5 w-11/12 rounded bg-white/[0.05] animate-pulse" />
            <div className="h-3.5 w-4/5 rounded bg-white/[0.05] animate-pulse" />
          </div>
        )}

        {error && !loading && (
          <p className="flex items-center gap-1.5 text-xs text-amber-400">
            <ExclamationTriangleIcon className="size-3.5 shrink-0" />
            {error}
          </p>
        )}

        {summary && !loading && (
          <div className="space-y-4">
            <p className="text-sm text-gray-300 leading-relaxed">{summary}</p>

            {gaps.length > 0 && (
              <div className="space-y-2 pt-3 border-t border-white/[0.05]">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-600">Keyword gaps</p>
                {gaps.map((g) => (
                  <p key={g.key} className="text-xs text-gray-400">
                    <span className="font-medium text-gray-300">{g.name}:</span> {g.note}
                    {g.keywords.length > 0 && (
                      <span className="text-gray-600"> ({g.keywords.slice(0, 5).join(", ")})</span>
                    )}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

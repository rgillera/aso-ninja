"use client";

import { useState, useEffect } from "react";
import { PlusIcon, CheckIcon, MinusIcon, LockClosedIcon } from "@heroicons/react/24/outline";
import type { ActiveApp } from "@/features/dashboard/ActiveAppContext";
import { useWorkspaceId } from "@/features/dashboard/WorkspaceContext";
import { usePlanSlug } from "@/features/dashboard/PlanContext";
import { isPlanAtLeast } from "@/features/subscription/planTiers";
import type { Keyword } from "./types";
import type { AISuggestionsResult } from "@/app/api/keywords/ai-suggestions/route";

type Props = {
  activeApp?: ActiveApp;
  trackedKeywords: Keyword[];
  onAddKeyword: (keyword: string) => void;
  onAddKeywords?: (keywords: string[]) => void;
  onRemoveKeyword?: (keyword: string) => void;
  translateToggle?: boolean;
};

const AI_PAGE = 15;

function AiKeywordPill({ kw, tracked, onAdd, onRemove, translation, loadingTranslation }: {
  kw: { term: string; volume: number };
  tracked: boolean;
  onAdd: (term: string) => void;
  onRemove?: (term: string) => void;
  translation?: string;
  loadingTranslation?: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={() => tracked ? onRemove?.(kw.term) : onAdd(kw.term)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs transition-all ${
        tracked
          ? hovered
            ? "bg-red-500/10 ring-1 ring-red-500/40 text-red-400 cursor-pointer"
            : "bg-indigo-500/20 ring-1 ring-indigo-500/40 text-indigo-300"
          : "bg-[#0d0f14] ring-1 ring-white/[0.08] text-gray-300 hover:ring-indigo-500/50 hover:text-white"
      }`}
    >
      {tracked
        ? hovered
          ? <MinusIcon className="size-3 text-red-400 shrink-0" />
          : <CheckIcon className="size-3 text-indigo-400 shrink-0" />
        : <PlusIcon className="size-3 text-gray-500 shrink-0" />
      }
      <span className="flex flex-col items-start leading-tight py-0.5">
        <span>{kw.term}</span>
        {translation && (
          <span className="text-[10px] text-gray-500">(en) {translation}</span>
        )}
        {loadingTranslation && !translation && (
          <span className="h-2 w-10 rounded bg-white/[0.08] animate-pulse" />
        )}
      </span>
    </button>
  );
}

function AISuggestionsSection({
  label,
  keywords,
  trackedSet,
  onAdd,
  onRemove,
  onAddAll,
  translations,
  translating,
}: {
  label: string;
  keywords: { term: string; volume: number }[] | null;
  trackedSet: Set<string>;
  onAdd: (term: string) => void;
  onRemove?: (term: string) => void;
  onAddAll?: (terms: string[]) => void;
  translations?: Record<string, string>;
  translating?: boolean;
}) {
  const STEP = 10;
  const [visibleCount, setVisibleCount] = useState(AI_PAGE);
  const tracked = keywords?.filter((k) => trackedSet.has(k.term)).length ?? 0;
  const total   = keywords?.length ?? 0;
  const visible = keywords?.slice(0, visibleCount);

  return (
    <div className="py-3 border-b border-white/[0.05] last:border-0">
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 flex items-center gap-1">
            <span className="text-indigo-400">✦</span>
            {label}
          </span>
          {keywords && <span className="text-[10px] text-gray-600">{tracked} / {total}</span>}
        </div>
        <button
          onClick={() => {
            const untracked = keywords?.filter((k) => !trackedSet.has(k.term)).map((k) => k.term) ?? [];
            if (!untracked.length) return;
            if (onAddAll) onAddAll(untracked); else untracked.forEach(onAdd);
          }}
          className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
        >
          + Analyze all
        </button>
      </div>

      {keywords === null ? (
        <div className="flex flex-wrap gap-1.5">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-6 rounded-md bg-white/[0.04] animate-pulse" style={{ width: `${50 + i * 12}px` }} />
          ))}
        </div>
      ) : keywords.length === 0 ? (
        <p className="text-xs text-gray-600">No keywords found.</p>
      ) : (
        <>
          <div className="flex flex-wrap gap-1.5">
            {visible!.map((kw) => {
              const isTracked = trackedSet.has(kw.term);
              return (
                <AiKeywordPill
                  key={kw.term}
                  kw={kw}
                  tracked={isTracked}
                  onAdd={onAdd}
                  onRemove={onRemove}
                  translation={translations?.[kw.term]?.toLowerCase() !== kw.term.toLowerCase() ? translations?.[kw.term] : undefined}
                  loadingTranslation={translating && !(kw.term in (translations ?? {}))}
                />
              );
            })}
          </div>
          {keywords.length > AI_PAGE && (
            <button
              onClick={() => setVisibleCount((v) => v < total ? Math.min(v + STEP, total) : AI_PAGE)}
              className="mt-2 text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              {visibleCount < total ? `Show more (${Math.min(STEP, total - visibleCount)} more)` : "Show less"}
            </button>
          )}
        </>
      )}
    </div>
  );
}

export function KeywordSuggestionAi({ activeApp, trackedKeywords, onAddKeyword, onAddKeywords, onRemoveKeyword, translateToggle }: Props) {
  const workspaceId = useWorkspaceId();
  const planSlug     = usePlanSlug();
  const locked       = !isPlanAtLeast(planSlug, "pro");
  const [data, setData]       = useState<AISuggestionsResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState<string | null>(null);
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [translating, setTranslating]   = useState(false);

  useEffect(() => {
    const key = `${activeApp?.store_id}-${activeApp?.country}`;
    if (!activeApp?.name || locked || fetched === key) return;
    setFetched(key);
    setLoading(true);
    setData(null);

    fetch(`/api/keywords/ai-suggestions?${new URLSearchParams({ appName: activeApp.name, country: activeApp.country ?? "us", workspaceId })}`)
      .then((r) => r.json())
      .then((d: AISuggestionsResult) => { setData(d); setLoading(false); })
      .catch(() => { setData({ discovery: [], generic: [], branded: [], relevancy: [] }); setLoading(false); });
  }, [activeApp?.name, activeApp?.country, activeApp?.store_id, workspaceId, locked, fetched]);

  useEffect(() => {
    if (!translateToggle) return;
    const allTerms = [
      ...(data?.discovery ?? []),
      ...(data?.generic ?? []),
      ...(data?.branded ?? []),
      ...(data?.relevancy ?? []),
    ].map((k) => k.term);
    const terms = [...new Set(allTerms)].filter((t) => !(t in translations));
    if (!terms.length) return;
    setTranslating(true);
    fetch("/api/keywords/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ terms }),
    })
      .then((r) => r.json())
      .then(({ translations: fresh }: { translations: Record<string, string> }) => {
        setTranslations((prev) => ({ ...prev, ...fresh }));
      })
      .catch(() => {})
      .finally(() => setTranslating(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [translateToggle, data]);

  const trackedSet = new Set(trackedKeywords.map((k) => k.keyword.toLowerCase()));

  if (locked) {
    return (
      <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
        <span className="flex items-center gap-1 rounded-full bg-violet-500/10 px-2 py-0.5 text-[10px] font-semibold text-violet-400 mb-3">
          <LockClosedIcon className="size-2.5" />
          Pro
        </span>
        <p className="text-xs font-medium text-gray-400">AI Suggestions is a Pro feature</p>
        <p className="mt-1 text-xs text-gray-600 max-w-xs">Upgrade to Pro or above to generate AI-powered keyword ideas for this app.</p>
      </div>
    );
  }

  if (!activeApp?.name) {
    return <p className="px-4 py-4 text-xs text-gray-600 text-center">Select an app to generate AI keyword suggestions.</p>;
  }

  return (
    <div className="px-4">
      <AISuggestionsSection
        label="Discovery Keywords"
        keywords={loading ? null : (data?.discovery ?? null)}
        trackedSet={trackedSet}
        onAdd={onAddKeyword}
        onRemove={onRemoveKeyword}
        onAddAll={onAddKeywords}
        translations={translateToggle ? translations : undefined}
        translating={translateToggle && translating}
      />
      <AISuggestionsSection
        label="High-Volume Generic Keywords"
        keywords={loading ? null : (data?.generic ?? null)}
        trackedSet={trackedSet}
        onAdd={onAddKeyword}
        onRemove={onRemoveKeyword}
        onAddAll={onAddKeywords}
        translations={translateToggle ? translations : undefined}
        translating={translateToggle && translating}
      />
      <AISuggestionsSection
        label="Branded Keywords"
        keywords={loading ? null : (data?.branded ?? null)}
        trackedSet={trackedSet}
        onAdd={onAddKeyword}
        onRemove={onRemoveKeyword}
        onAddAll={onAddKeywords}
        translations={translateToggle ? translations : undefined}
        translating={translateToggle && translating}
      />
      <AISuggestionsSection
        label="High-Relevancy Keywords"
        keywords={loading ? null : (data?.relevancy ?? null)}
        trackedSet={trackedSet}
        onAdd={onAddKeyword}
        onRemove={onRemoveKeyword}
        onAddAll={onAddKeywords}
        translations={translateToggle ? translations : undefined}
        translating={translateToggle && translating}
      />
    </div>
  );
}

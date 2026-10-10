"use client";

import { useState, useEffect, useRef } from "react";
import { PlusIcon, CheckIcon, MinusIcon, ArrowPathIcon } from "@heroicons/react/24/outline";
import type { ActiveApp } from "@/features/dashboard/ActiveAppContext";
import type { Keyword } from "./types";
import type { CompetitorKeywordsResult, CompetitorKeyword, GapBucket } from "@/app/api/keywords/competitor-keywords/route";
import type { CompetitorApp } from "./ManageCompetitorsModal";
import Link from "next/link";
import { AnalyzeAllButton } from "./ui";
import { usePlanSlug } from "@/features/dashboard/PlanContext";
import { isPlanAtLeast, PLAN_BADGE } from "@/features/subscription/planTiers";

type Props = {
  activeApp?: ActiveApp;
  trackedKeywords: Keyword[];
  competitors: CompetitorApp[];
  onAddKeyword: (keyword: string) => void;
  onAddKeywords?: (keywords: string[]) => void;
  onRemoveKeyword?: (keyword: string) => void;
  translateToggle?: boolean;
  /** Whether the Competitors tab is showing. Nothing is fetched until it first is. */
  active: boolean;
};

// The four quadrants of the keyword gap matrix, in reading order (see the
// "Competitor & keyword gap research" playbook lesson), plus the competitor
// listing words nobody has a rank for yet. Class strings are spelled out in
// full so Tailwind picks them up.
type BucketStyle = {
  key: GapBucket;
  label: string;
  hint: string;
  action: string;
  dot: string;
  count: string;
  bar: string;
  selected: string;
};

const BUCKETS: BucketStyle[] = [
  {
    key: "winning",
    label: "Shared and winning",
    hint: "Protect",
    action: "You rank top 10 and lead your competitors. Protect these: keep them in your metadata.",
    dot: "bg-emerald-400 light:bg-emerald-500",
    count: "text-emerald-300 light:text-emerald-700",
    bar: "bg-emerald-400/80 light:bg-emerald-500",
    selected: "ring-emerald-400/40 light:ring-emerald-500/40 bg-gradient-to-br from-emerald-500/[0.14] to-emerald-500/[0.02] light:from-emerald-50 light:to-white",
  },
  {
    key: "losing",
    label: "Shared but losing",
    hint: "Strengthen",
    action: "A competitor outranks you, or you're outside the top 10. Move the word into your title or subtitle.",
    dot: "bg-amber-400 light:bg-amber-500",
    count: "text-amber-300 light:text-amber-700",
    bar: "bg-amber-400/80 light:bg-amber-500",
    selected: "ring-amber-400/40 light:ring-amber-500/40 bg-gradient-to-br from-amber-500/[0.14] to-amber-500/[0.02] light:from-amber-50 light:to-white",
  },
  {
    key: "gap",
    label: "Their keywords, not yours",
    hint: "Opportunities",
    action: "Competitors rank and you don't. This is the gap: track the relevant ones and add them to your next metadata update.",
    dot: "bg-violet-400 light:bg-violet-500",
    count: "text-violet-300 light:text-violet-700",
    bar: "bg-violet-400/80 light:bg-violet-500",
    selected: "ring-violet-400/40 light:ring-violet-500/40 bg-gradient-to-br from-violet-500/[0.16] to-indigo-500/[0.03] light:from-violet-50 light:to-white",
  },
  {
    key: "yours",
    label: "Yours alone",
    hint: "Check volume",
    action: "Only you rank. Often a niche you own; check that they bring real volume.",
    dot: "bg-sky-400 light:bg-sky-500",
    count: "text-sky-300 light:text-sky-700",
    bar: "bg-sky-400/80 light:bg-sky-500",
    selected: "ring-sky-400/40 light:ring-sky-500/40 bg-gradient-to-br from-sky-500/[0.14] to-sky-500/[0.02] light:from-sky-50 light:to-white",
  },
];

const UNCHECKED: BucketStyle = {
  key: "unchecked",
  label: "No rank data yet",
  hint: "Track to rank",
  action: "Words from competitor listings that nobody has a recorded rank for. Track one to record where you and your competitors rank, then refresh.",
  dot: "bg-gray-500 light:bg-gray-400",
  count: "text-gray-300 light:text-gray-700",
  bar: "bg-gray-500/60 light:bg-gray-300",
  selected: "ring-gray-400/30 light:ring-gray-400/40 bg-gradient-to-br from-white/[0.06] to-white/[0.01] light:from-gray-100 light:to-white",
};

// First bucket that has anything in it, most actionable first: new keywords to
// add, then ones to strengthen, then (for a brand-new app with no ranks yet)
// the listing words to start tracking.
const DEFAULT_ORDER: GapBucket[] = ["gap", "losing", "unchecked", "winning", "yours"];

function defaultBucket(keywords: CompetitorKeyword[]): GapBucket {
  return DEFAULT_ORDER.find((b) => keywords.some((k) => k.bucket === b)) ?? "gap";
}

function TrackButton({ tracked, onAdd, onRemove }: { tracked: boolean; onAdd: () => void; onRemove?: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={() => (tracked ? onRemove?.() : onAdd())}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={tracked ? "Remove from tracking" : "Add to tracking"}
      className={`flex items-center justify-center size-5 rounded shrink-0 transition-colors ${
        tracked
          ? hovered
            ? "bg-red-500/10 ring-1 ring-red-500/40 text-red-400 light:text-red-600"
            : "bg-indigo-500/20 ring-1 ring-indigo-500/40 text-indigo-400 light:text-indigo-600"
          : "bg-white/[0.04] light:bg-black/[0.04] text-gray-500 hover:bg-indigo-500/10 hover:ring-1 hover:ring-indigo-500/50 hover:text-indigo-400 light:hover:text-indigo-600"
      }`}
    >
      {tracked ? (hovered ? <MinusIcon className="size-3" /> : <CheckIcon className="size-3" />) : <PlusIcon className="size-3" />}
    </button>
  );
}

function RankBadge({ rank }: { rank: number | null }) {
  if (rank == null) return <span className="text-gray-600 light:text-gray-400">Not ranked</span>;
  return (
    <span className={`tabular-nums font-medium ${rank <= 10 ? "text-white light:text-gray-900" : "text-gray-400 light:text-gray-600"}`}>
      #{rank}
    </span>
  );
}

function TermLabel({ kw, translation, loadingTranslation }: { kw: CompetitorKeyword; translation?: string; loadingTranslation?: boolean }) {
  return (
    <span className="flex flex-col items-start leading-tight min-w-0">
      <span className="truncate max-w-full">{kw.term}</span>
      {translation && <span className="text-[10px] text-gray-500">(en) {translation}</span>}
      {loadingTranslation && !translation && (
        <span className="mt-0.5 h-2 w-10 rounded bg-white/[0.08] light:bg-black/[0.06] animate-pulse" />
      )}
    </span>
  );
}

type ListProps = {
  keywords: CompetitorKeyword[];
  trackedSet: Set<string>;
  onAdd: (term: string) => void;
  onRemove?: (term: string) => void;
  translationFor: (term: string) => string | undefined;
  isTranslating: (term: string) => boolean;
};

function RankedList({ keywords, trackedSet, onAdd, onRemove, translationFor, isTranslating }: ListProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-[10px] uppercase tracking-widest text-gray-500 text-left">
            <th className="py-1.5 pl-1 pr-2 font-semibold w-8" />
            <th className="py-1.5 pr-3 font-semibold">Keyword</th>
            <th className="py-1.5 pr-3 font-semibold whitespace-nowrap">Your rank</th>
            <th className="py-1.5 pr-3 font-semibold whitespace-nowrap">Competitor ranks</th>
            <th className="py-1.5 font-semibold text-right">Volume</th>
          </tr>
        </thead>
        <tbody>
          {keywords.map((kw) => (
            <tr key={kw.term} className="border-t border-white/[0.04] light:border-black/[0.04] align-middle">
              <td className="py-1.5 pl-1 pr-2">
                <TrackButton
                  tracked={trackedSet.has(kw.term)}
                  onAdd={() => onAdd(kw.term)}
                  onRemove={onRemove ? () => onRemove(kw.term) : undefined}
                />
              </td>
              <td className="py-1.5 pr-3 text-gray-200 light:text-gray-800 max-w-[220px]">
                <TermLabel
                  kw={kw}
                  translation={translationFor(kw.term)}
                  loadingTranslation={isTranslating(kw.term)}
                />
              </td>
              <td className="py-1.5 pr-3 whitespace-nowrap"><RankBadge rank={kw.ourRank} /></td>
              <td className="py-1.5 pr-3">
                {kw.competitorRanks.length ? (
                  <span className="flex flex-wrap gap-1">
                    {kw.competitorRanks.map((c) => (
                      <span
                        key={c.name}
                        title={c.name}
                        className="inline-flex items-center gap-1 rounded bg-white/[0.04] light:bg-black/[0.04] px-1.5 py-0.5 text-gray-400 light:text-gray-600"
                      >
                        <span className="truncate max-w-[90px]">{c.name}</span>
                        <span className={`tabular-nums font-medium ${c.rank <= 10 ? "text-white light:text-gray-900" : ""}`}>#{c.rank}</span>
                      </span>
                    ))}
                  </span>
                ) : (
                  <span className="text-gray-600 light:text-gray-400">Not ranked</span>
                )}
              </td>
              <td className="py-1.5 text-right tabular-nums text-gray-300 light:text-gray-700">
                {kw.volume ?? <span className="text-gray-600 light:text-gray-400">?</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function UncheckedList({ keywords, trackedSet, onAdd, onRemove, translationFor, isTranslating }: ListProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {keywords.map((kw) => {
        const tracked = trackedSet.has(kw.term);
        return (
          <span
            key={kw.term}
            title={kw.competitors.length ? `Used by: ${kw.competitors.join(", ")}` : undefined}
            className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-xs ${
              tracked
                ? "bg-indigo-500/20 ring-1 ring-indigo-500/40 text-indigo-300 light:text-indigo-600"
                : "bg-[#0d0f14] light:bg-gray-50 text-gray-300 light:text-gray-700"
            }`}
          >
            <TrackButton tracked={tracked} onAdd={() => onAdd(kw.term)} onRemove={onRemove ? () => onRemove(kw.term) : undefined} />
            <TermLabel
              kw={kw}
              translation={translationFor(kw.term)}
              loadingTranslation={isTranslating(kw.term)}
            />
            {kw.competitors.length > 1 && (
              <span className="text-[10px] tabular-nums rounded px-1 bg-white/[0.06] light:bg-black/[0.05] text-gray-500">
                {kw.competitors.length}
              </span>
            )}
          </span>
        );
      })}
    </div>
  );
}

export function KeywordSuggestionCompetitors({
  activeApp, trackedKeywords, competitors, onAddKeyword, onAddKeywords, onRemoveKeyword, translateToggle, active,
}: Props) {
  const planSlug = usePlanSlug();
  const [data, setData] = useState<CompetitorKeywordsResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchKey, setFetchKey] = useState<string | null>(null);
  const [refreshCount, setRefreshCount] = useState(0);
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [translating, setTranslating] = useState(false);
  const [selected, setSelected] = useState<GapBucket>(DEFAULT_ORDER[0]);
  const PAGE = 20;
  const [visibleCount, setVisibleCount] = useState(PAGE);

  // Tracks the most recently *started* request's key. Compared against (not
  // an effect-cleanup flag) because this effect calls setFetchKey on itself,
  // which re-triggers the same effect (fetchKey is a dependency) — a cleanup
  // flag would fire on that self-triggered re-run and cancel the request
  // before it ever resolves. A ref sidesteps that: it only changes when a
  // genuinely new request starts, and a stale response is simply one whose
  // captured key no longer matches it.
  const latestKeyRef = useRef<string | null>(null);
  // Terms already sent for translation (done or in flight), so paging with
  // "Show more" or switching buckets never re-requests the same term.
  const requestedTranslations = useRef(new Set<string>());
  // Once the user picks a bucket, a refresh never moves them off it.
  const userPickedBucket = useRef(false);

  // Fetch keywords whenever the competitor list or app changes, or on a manual
  // refresh (tracking a keyword records new ranks the matrix should pick up).
  // The tab stays mounted while hidden, so wait until it's actually opened:
  // otherwise every Keyword Research load pays for this request.
  useEffect(() => {
    if (!active) return;
    if (!activeApp?.store_id || !competitors.length) {
      setData(null);
      return;
    }
    const key = `${activeApp.store_id}-${activeApp.store}-${activeApp.country}-${competitors.map((c) => c.storeId).sort().join(",")}-${refreshCount}`;
    if (fetchKey === key) return;
    setFetchKey(key);
    setLoading(true);
    setData(null);
    latestKeyRef.current = key;

    // Guard against out-of-order responses: the competitor list can change
    // again (e.g. optimistically adding one that then gets rolled back after
    // a plan-limit rejection) before this request resolves. Without this, a
    // slower stale response for the old (larger) competitor set can land
    // after the corrected one and silently overwrite it with wrong data.
    const params = new URLSearchParams({
      storeId: activeApp.store_id,
      country: activeApp.country ?? "us",
      store: activeApp.store,
      competitorIds: competitors.map((c) => c.storeId).join(","),
    });
    fetch(`/api/keywords/competitor-keywords?${params}`)
      .then((r) => r.json())
      .then((d: CompetitorKeywordsResult) => {
        if (latestKeyRef.current !== key) return;
        setData(d);
        if (!userPickedBucket.current) setSelected(defaultBucket(d.keywords));
      })
      .catch(() => { if (latestKeyRef.current === key) setData({ appName: "", keywords: [], competitorApps: [] }); })
      .finally(() => { if (latestKeyRef.current === key) setLoading(false); });
  }, [active, activeApp?.store_id, activeApp?.country, competitors, fetchKey, refreshCount]);

  const selectedKeywords = data?.keywords.filter((k) => k.bucket === selected) ?? [];
  const visible = selectedKeywords.slice(0, visibleCount);
  const visibleTermsKey = visible.map((k) => k.term).join("\n");

  // Translation is an LLM call, so only the rows on screen are translated;
  // more follow as the list is paged or another bucket is opened.
  useEffect(() => {
    if (!translateToggle || !visibleTermsKey) return;
    const terms = visibleTermsKey.split("\n").filter((t) => !requestedTranslations.current.has(t));
    if (!terms.length) return;
    terms.forEach((t) => requestedTranslations.current.add(t));
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
      .catch(() => { terms.forEach((t) => requestedTranslations.current.delete(t)); })
      .finally(() => setTranslating(false));
  }, [translateToggle, visibleTermsKey]);

  const trackedSet = new Set(trackedKeywords.map((k) => k.keyword.toLowerCase()));

  if (!activeApp?.store_id) {
    return <p className="px-4 py-4 text-xs text-gray-600 light:text-gray-400 text-center">Select an app to see competitor keywords.</p>;
  }

  if (!competitors.length) {
    // Free and Basic allow a single competitor (plans.competitor_limit), too
    // few for the 5 to 8 the gap matrix is built around.
    if (!isPlanAtLeast(planSlug, "pro")) {
      return (
        <p className="px-4 py-4 text-xs text-gray-600 light:text-gray-400 text-center">
          The {PLAN_BADGE[planSlug].label} plan includes 1 competitor. Add one above to start your keyword gap matrix, or upgrade to compare 5 to 8 competitors.{" "}
          <Link href="/dashboard/subscription" className="text-indigo-400 light:text-indigo-600 underline underline-offset-2 hover:no-underline">
            View plans
          </Link>
        </p>
      );
    }
    return (
      <p className="px-4 py-4 text-xs text-gray-600 light:text-gray-400 text-center">
        Add {isPlanAtLeast(planSlug, "pro_plus") ? "5 to 8" : "up to 5"} search competitors above to build your keyword gap matrix.
      </p>
    );
  }

  const byBucket = (bucket: GapBucket) => data?.keywords.filter((k) => k.bucket === bucket) ?? [];
  const untracked = selectedKeywords.filter((k) => !trackedSet.has(k.term)).map((k) => k.term);
  const selectedMeta = selected === "unchecked" ? UNCHECKED : BUCKETS.find((b) => b.key === selected)!;
  const rankedTotal = BUCKETS.reduce((sum, b) => sum + byBucket(b.key).length, 0);

  function select(bucket: GapBucket) {
    userPickedBucket.current = true;
    setSelected(bucket);
    setVisibleCount(PAGE);
  }

  const listProps: ListProps = {
    keywords: visible,
    trackedSet,
    onAdd: onAddKeyword,
    onRemove: onRemoveKeyword,
    translationFor: (term) =>
      translateToggle && translations[term]?.toLowerCase() !== term.toLowerCase() ? translations[term] : undefined,
    isTranslating: (term) => !!translateToggle && translating && !(term in translations),
  };

  return (
    <div className="px-4 py-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Keyword gap matrix</span>
        <button
          onClick={() => setRefreshCount((n) => n + 1)}
          disabled={loading}
          title="Re-read the latest ranks (after tracking new keywords)"
          className="flex items-center gap-1 text-[11px] text-gray-500 hover:text-gray-300 light:hover:text-gray-700 disabled:opacity-50 transition-colors"
        >
          <ArrowPathIcon className={`size-3 ${loading ? "animate-spin" : ""}`} />
          Refresh ranks
        </button>
      </div>

      {/* Matrix: the four quadrants plus "no rank data yet", one row on wide screens */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        {[...BUCKETS, UNCHECKED].map((b) => {
          const isSelected = selected === b.key;
          return (
            <button
              key={b.key}
              onClick={() => select(b.key)}
              className={`group text-left rounded-xl px-3.5 py-3 ring-1 transition-all ${
                b.key === "unchecked" ? "col-span-2 md:col-span-1" : ""
              } ${
                isSelected
                  ? `${b.selected} shadow-sm`
                  : "ring-white/[0.06] light:ring-black/[0.07] bg-white/[0.015] light:bg-white hover:ring-white/[0.14] light:hover:ring-black/[0.14] hover:bg-white/[0.03] light:hover:bg-gray-50"
              }`}
            >
              <div className="flex items-center gap-1.5">
                <span className={`size-1.5 rounded-full shrink-0 ${b.dot}`} />
                <span className={`text-[11px] font-medium truncate ${isSelected ? "text-white light:text-gray-900" : "text-gray-400 light:text-gray-600"}`}>
                  {b.label}
                </span>
              </div>
              <div className="mt-1.5 flex items-baseline justify-between gap-2">
                {loading || !data ? (
                  <span className="h-6 w-10 rounded bg-white/[0.06] light:bg-black/[0.06] animate-pulse" />
                ) : (
                  <span className={`text-xl font-semibold tabular-nums tracking-tight ${b.count}`}>
                    {byBucket(b.key).length.toLocaleString()}
                  </span>
                )}
                <span className="text-[10px] text-gray-500 truncate">{b.hint}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Share of ranked keywords per quadrant */}
      {data && rankedTotal > 0 && (
        <div className="mt-2.5 flex h-1 w-full gap-0.5 overflow-hidden rounded-full">
          {BUCKETS.map((b) => {
            const n = byBucket(b.key).length;
            return n ? (
              <span
                key={b.key}
                title={`${b.label}: ${n}`}
                className={`h-full rounded-full transition-opacity ${b.bar} ${selected === b.key || selected === "unchecked" ? "" : "opacity-40"}`}
                style={{ width: `${(n / rankedTotal) * 100}%` }}
              />
            ) : null;
          })}
        </div>
      )}

      {/* Selected bucket */}
      <div className="mt-3 pt-3 border-t border-white/[0.05] light:border-black/[0.04]">
        <div className="flex items-start justify-between gap-3 mb-2.5">
          <p className="text-xs text-gray-500 leading-relaxed">
            <span className={`inline-block size-1.5 rounded-full align-middle mr-1.5 ${selectedMeta.dot}`} />
            <span className="font-medium text-gray-300 light:text-gray-800">{selectedMeta.label}.</span> {selectedMeta.action}
          </p>
          {untracked.length > 0 && (
            <AnalyzeAllButton onClick={() => (onAddKeywords ? onAddKeywords(untracked) : untracked.forEach(onAddKeyword))} />
          )}
        </div>

        {loading || !data ? (
          <div className="flex flex-col gap-1.5">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-6 rounded-md bg-white/[0.04] light:bg-black/[0.04] animate-pulse" />
            ))}
          </div>
        ) : selectedKeywords.length === 0 ? (
          <p className="text-xs text-gray-600 light:text-gray-400">
            {selected === "unchecked"
              ? "No keywords found."
              : "Nothing here yet. Ranks are recorded for keywords you track, so track some competitor keywords and refresh."}
          </p>
        ) : (
          <>
            {selected === "unchecked" ? <UncheckedList {...listProps} /> : <RankedList {...listProps} />}
            {selectedKeywords.length > PAGE && (
              <button
                onClick={() => setVisibleCount((v) => (v < selectedKeywords.length ? Math.min(v + PAGE, selectedKeywords.length) : PAGE))}
                className="mt-2 text-[11px] text-indigo-400 light:text-indigo-600 hover:text-indigo-300 light:hover:text-indigo-600 transition-colors"
              >
                {visibleCount < selectedKeywords.length
                  ? `Show more (${Math.min(PAGE, selectedKeywords.length - visibleCount)} more)`
                  : "Show less"}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

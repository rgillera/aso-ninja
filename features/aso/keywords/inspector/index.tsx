"use client";

import { useState, useEffect, useRef } from "react";
import {
  DocumentMagnifyingGlassIcon,
  MagnifyingGlassIcon,
  ExclamationTriangleIcon,
  ArrowTrendingUpIcon,
  ArrowTopRightOnSquareIcon,
  ArrowPathIcon,
  TrophyIcon,
  LightBulbIcon,
  XMarkIcon,
  PlusIcon,
  CheckIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import { useActiveApp } from "@/features/dashboard/ActiveAppContext";
import { useWorkspaceId } from "@/features/dashboard/WorkspaceContext";
import { usePlanSlug } from "@/features/dashboard/PlanContext";
import { TourTooltip } from "@/features/onboarding/TourTooltip";
import { TOUR_STEPS, type TourStep } from "@/features/onboarding/tour";
import { fetchLiveSearchResults, resolveIpadOnlyClient, type TrackedApp } from "@/features/aso/keywords/research/liveSearch";
import { Toggle } from "@/features/aso/keywords/research/ui";
// The same history panel Keyword Research's Volume column opens.
import { VolumeHistoryPanel } from "@/features/aso/keywords/performance/VolumeHistoryPanel";
import { COUNTRY_MAP, countryFlag } from "@/libs/countries";
import { findRankIdx } from "@/libs/keyword-rank-match";
import { formatEstimateRange } from "@/libs/keyword-impressions";
import { FeatureLocked } from "@/features/subscription/FeatureLocked";
import { PlanLimitMessage } from "@/features/subscription/PlanLimitMessage";
import { CountryPicker } from "./CountryPicker";
import { StatStrip } from "@/features/aso/keywords/StatStrip";
import { canUseInspector } from "./limits";
import type { AppSearchResult } from "@/app/api/keywords/search/route";
import type { KeywordInspection } from "@/app/api/keywords/inspect/route";
import type { KeywordResultEstimates } from "@/app/api/keywords/estimates/route";
import type { AppEstimate } from "@/libs/contracts";
import type { CompetitorApp } from "@/features/aso/keywords/research/ManageCompetitorsModal";
import { formatDownloads, formatRevenue } from "@/libs/store/estimateFormat";
import { CardHeader } from "@/features/dashboard/CardHeader";

type Store = "ios" | "android";

const RESULTS_DISPLAY_LIMIT = 20;
const RECENT_LIMIT = 8;
const PREFS_KEY = "keyword-inspector-prefs";

type Recent = { term: string; store: Store; country: string };

const sameRecent = (a: Recent, b: Recent) => a.term === b.term && a.store === b.store && a.country === b.country;

// Newest first, no repeats, capped. `first` wins over `rest` for order.
function mergeRecent(first: Recent[], rest: Recent[]): Recent[] {
  return [...first, ...rest]
    .filter((r, i, all) => all.findIndex((x) => sameRecent(x, r)) === i)
    .slice(0, RECENT_LIMIT);
}

const NUMBER_FORMATTER = new Intl.NumberFormat("en-US");

// "Beatable spots": a top-10 app this thin is one an ordinary app can
// realistically displace, even when Difficulty (top-5 average) looks high.
const WEAK_SPOT_RANGE = 10;
const WEAK_RATING_COUNT = 5_000;
const WEAK_STARS = 3.5;

type WeakSpot = { app: AppSearchResult; reasons: string[] };

// A rating count is only trusted when the store actually returned one: App
// Store results always carry it, but a Google Play row shows 0 when its
// detail lookup failed (or on the server fallback list), which says nothing.
// Same for stars: 0 means "not known" (the iOS fallback list has none).
function findWeakSpots(apps: AppSearchResult[], store: Store, excludeStoreId?: string): WeakSpot[] {
  return apps.slice(0, WEAK_SPOT_RANGE).flatMap((app) => {
    const id = store === "ios" ? String(app.trackId) : app.appId;
    if (excludeStoreId && id === excludeStoreId) return [];
    const reasons: string[] = [];
    const countKnown = store === "ios" || app.ratingCount > 0;
    if (countKnown && app.ratingCount < WEAK_RATING_COUNT) {
      reasons.push(app.ratingCount === 0 ? "no ratings yet" : `only ${formatCount(app.ratingCount)} ratings`);
    }
    if (app.rating > 0 && app.rating < WEAK_STARS) reasons.push(`rated ${app.rating.toFixed(1)}★`);
    return reasons.length ? [{ app, reasons }] : [];
  });
}

function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return String(n);
}

// Popularity buckets follow libs/keyword-autocomplete.ts: 5 = never
// suggested, up to 15 = long tail, above that the store actually suggests it.
function popularityLabel(v: number) {
  if (v <= 15) return { label: "Low", className: "text-gray-400 light:text-gray-600" };
  if (v <= 45) return { label: "Medium", className: "text-indigo-300 light:text-indigo-600" };
  return { label: "High", className: "text-indigo-400 light:text-indigo-700" };
}

// Same thresholds/colors as the Difficulty column in Keyword Research.
function difficultyLabel(v: number) {
  if (v > 60) return { label: "Hard", className: "text-red-400 light:text-red-600", bar: "bg-red-500/70" };
  if (v > 40) return { label: "Moderate", className: "text-yellow-400 light:text-yellow-600", bar: "bg-yellow-500/70" };
  return { label: "Easy", className: "text-emerald-400 light:text-emerald-700", bar: "bg-emerald-500/70" };
}

function ScoreBar({ value, className }: { value: number; className: string }) {
  return (
    <div className="mt-3 h-1.5 w-full rounded-full bg-white/[0.08] light:bg-black/[0.08] overflow-hidden">
      <div className={`h-full rounded-full ${className}`} style={{ width: `${Math.max(0, Math.min(value, 100))}%` }} />
    </div>
  );
}

function StatCard({ label, hint, children }: { label: string; hint: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-[#141417] light:bg-white ring-1 ring-white/[0.06] light:ring-gray-950/[0.07] light:shadow-sm p-4" title={hint}>
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

function StatSkeleton() {
  return (
    <div className="rounded-2xl bg-[#141417] light:bg-white ring-1 ring-white/[0.06] light:ring-gray-950/[0.07] light:shadow-sm p-4 animate-pulse">
      <div className="h-3 w-20 rounded bg-white/[0.06] light:bg-black/[0.06]" />
      <div className="mt-3 h-7 w-14 rounded bg-white/[0.06] light:bg-black/[0.06]" />
      <div className="mt-3 h-1.5 w-full rounded bg-white/[0.06] light:bg-black/[0.06]" />
    </div>
  );
}

// Same rule as the title-match part of the volume estimate
// (fetchIosCoreMetrics): every word of the keyword appears in the title.
// Substring match, so it also works for scripts without spaces (CJK).
function titleHasKeyword(title: string, term: string) {
  const t = title.toLowerCase();
  return term.toLowerCase().split(/\s+/).filter(Boolean).every((w) => t.includes(w));
}

// The line under an app's name: App Store subtitle (loaded separately, see
// loadIosSubtitles) or Google Play short description. Not app.subtitle on
// iOS: the browser's iTunes search fills that with the category instead.
function subtitleFor(app: AppSearchResult, store: Store, iosSubtitles: Record<string, string>) {
  return store === "ios" ? iosSubtitles[String(app.trackId)] ?? "" : app.subtitle;
}

// Marks every occurrence of the searched keyword's words in a title or
// subtitle. Substring and case-insensitive, matching titleHasKeyword's rule,
// so "habit" also lights up inside "Habits" and it works for scripts written
// without spaces (CJK).
function KeywordHighlight({ text, term, active }: { text: string; term: string; active: boolean }) {
  const words = term.toLowerCase().split(/\s+/).filter(Boolean);
  if (!active || !words.length) return <>{text}</>;
  const escaped = words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).sort((a, b) => b.length - a.length);
  const parts = text.split(new RegExp(`(${escaped.join("|")})`, "giu"));
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <mark key={i} className="rounded bg-indigo-500/25 text-indigo-200 light:text-indigo-800">{part}</mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

// A compact "label  value" chip for the keyword-match counts above the
// results list. value null = still loading (App Store subtitles).
function MatchPill({ label, value, hint }: { label: string; value: string | null; hint: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-[#141417] light:bg-white px-3 py-1.5" title={hint}>
      <span className="text-xs text-gray-500">{label}</span>
      {value === null ? (
        <span className="flex items-center gap-1 text-xs text-gray-500" role="status">
          <ArrowPathIcon className="size-3 animate-spin" />
          Fetching subtitles...
        </span>
      ) : (
        <span className="text-xs font-semibold tabular-nums text-white light:text-gray-900">{value}</span>
      )}
    </div>
  );
}

const storeIdOf = (app: AppSearchResult, store: Store) => (store === "ios" ? (app.trackId ? String(app.trackId) : "") : app.appId ?? "");

// One "value / label" estimate on a result row, in the same two-line style as
// the rating. undefined = still loading, null = no estimate for this app.
function EstimateStat({ value, basis, label, format }: {
  value: number | null | undefined;
  basis?: string;
  label: string;
  format: (n: number) => string;
}) {
  return (
    <div className="hidden @xl:block w-20 shrink-0 pt-1 text-right" title={basis ? `Rough estimate: ${basis}` : undefined}>
      {value === undefined ? (
        <div className="ml-auto mt-0.5 h-3 w-10 rounded bg-white/[0.07] light:bg-black/[0.07] animate-pulse" aria-hidden="true" />
      ) : (
        <p className="text-xs tabular-nums text-gray-300 light:text-gray-700">{value === null ? "-" : format(value)}</p>
      )}
      <p className="text-[11px] text-gray-500">{label}</p>
    </div>
  );
}

function ResultRow({
  app, store, country, subtitle, subtitleLoading, term, highlight, isYou, estimate, showEstimates, competitor,
}: {
  app: AppSearchResult;
  store: Store;
  country: string;
  subtitle: string;
  // An App Store subtitle that's still being fetched: shows a placeholder bar.
  subtitleLoading: boolean;
  term: string;
  highlight: boolean;
  // This row is the active app: tinted, with a "Your app" tag.
  isYou: boolean;
  // undefined = still loading, null = none for this app.
  estimate: AppEstimate | null | undefined;
  // Off when the storefront has no estimate model.
  showEstimates: boolean;
  // "Add as competitor" for the active app; omitted when the search isn't for
  // its own storefront (competitors are per app and country) or on its own row.
  competitor?: { state: "add" | "adding" | "added"; onAdd: () => void };
}) {
  const storeUrl = store === "ios"
    ? app.trackId ? `https://apps.apple.com/${country}/app/id${app.trackId}` : null
    : app.appId ? `https://play.google.com/store/apps/details?id=${encodeURIComponent(app.appId)}&gl=${country}` : null;
  return (
    <div className={`flex items-start gap-3 px-4 py-3 border-b border-white/[0.05] light:border-black/[0.05] last:border-0 ${isYou ? "bg-indigo-500/[0.08]" : ""}`}>
      <span className="w-6 shrink-0 pt-3 text-center text-xs font-semibold text-gray-500">{app.position}</span>
      <div className={`size-10 shrink-0 overflow-hidden bg-[#0a0a0c] light:bg-gray-100 ${store === "android" ? "rounded-xl" : "rounded-2xl"}`}>
        {app.icon && <img src={app.icon} alt="" className="size-full object-cover" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 min-w-0">
          <p className="truncate text-sm font-medium text-white light:text-gray-900"><KeywordHighlight text={app.name} term={term} active={highlight} /></p>
          {isYou && <span className="shrink-0 rounded-full bg-indigo-500/15 px-1.5 py-px text-[10px] font-semibold text-indigo-300 light:text-indigo-700">Your app</span>}
          {/* Paid apps only: nearly every result is free, so a price column was all "Free". */}
          {app.price && app.price.toLowerCase() !== "free" && (
            <span className="shrink-0 rounded-full bg-white/[0.06] light:bg-black/[0.05] px-1.5 py-px text-[10px] font-semibold text-gray-300 light:text-gray-700">{app.price}</span>
          )}
        </div>
        {subtitleLoading && (
          <div className="my-1 h-2.5 w-40 max-w-full rounded bg-white/[0.07] light:bg-black/[0.07] animate-pulse" aria-hidden="true" />
        )}
        {subtitle && (
          // Wraps instead of truncating: a Play short description runs up to
          // 80 characters (App Store subtitles max out at 30, so they never do).
          <p className="text-xs leading-snug text-gray-400 light:text-gray-600 break-words"><KeywordHighlight text={subtitle} term={term} active={highlight} /></p>
        )}
        <p className={`truncate text-gray-500 ${subtitle ? "text-[11px]" : "text-xs"}`}>{app.developer}</p>
        {(storeUrl || competitor) && (
          // One line, even in the narrow side pane: the two links are short.
          <div className="mt-1.5 flex items-center gap-3 whitespace-nowrap">
            {storeUrl && (
              <a
                href={storeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex items-center gap-1 text-[11px] font-medium hover:underline ${store === "android" ? "text-[#01875f]" : "text-[#007AFF]"}`}
              >
                {store === "android" ? "View on Google Play" : "View on App Store"}
                <ArrowTopRightOnSquareIcon className="size-3" />
              </a>
            )}
            {competitor && (
              competitor.state === "added" ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-500">
                  <CheckIcon className="size-3" />
                  Competitor
                </span>
              ) : (
                <button
                  type="button"
                  onClick={competitor.onAdd}
                  disabled={competitor.state === "adding"}
                  className={`inline-flex items-center gap-1 text-[11px] font-medium hover:underline disabled:opacity-60 disabled:cursor-wait ${store === "android" ? "text-[#01875f]" : "text-[#007AFF]"}`}
                >
                  {competitor.state === "adding"
                    ? <ArrowPathIcon className="size-3 animate-spin" />
                    : <PlusIcon className="size-3" />}
                  Add as competitor
                </button>
              )
            )}
          </div>
        )}
      </div>
      <div className="shrink-0 pt-1 text-right">
        <p className="text-xs text-gray-300 light:text-gray-700">
          {app.rating ? <><span className="text-amber-400">★</span> {app.rating.toFixed(1)}</> : null}
        </p>
        <p className="text-[11px] text-gray-500">
          {app.ratingCount ? `${formatCount(app.ratingCount)} ratings` : store === "android" ? "" : "No ratings"}
        </p>
      </div>
      {showEstimates && (
        <>
          <EstimateStat value={estimate === undefined ? undefined : estimate?.downloads ?? null} basis={estimate?.downloadsBasis} label="downloads/mo" format={formatDownloads} />
          <EstimateStat value={estimate === undefined ? undefined : estimate?.revenue ?? null} basis={estimate?.revenueBasis} label="revenue/mo" format={formatRevenue} />
        </>
      )}
    </div>
  );
}

// Below Pro: the lock card over a blurred, made-up result, so it's clear
// what the page does before upgrading. The numbers are decoration only.
// Docked in Keyword Research's side pane, just the card, the same as the
// Long Tail tab's lock.
function InspectorLockedPreview({ docked = false }: { docked?: boolean }) {
  const lockCard = (
    <FeatureLocked
      minPlan="pro"
      icon={DocumentMagnifyingGlassIcon}
      title="Keyword Inspector is a Pro feature"
      description="Upgrade to Pro to check any keyword before you commit to it."
      benefits={[
        "Volume, difficulty and daily searches for any keyword, in any country",
        "The apps ranking for it right now, and the weakest spots to take",
        "Where your app ranks for it today",
      ]}
    />
  );
  if (docked) return lockCard;
  return (
    <div className="relative flex-1 overflow-hidden">
      <div aria-hidden="true" className="pointer-events-none select-none px-4 @lg:px-6 py-6 space-y-6 blur-[6px] opacity-60">
        <div className="h-[60px] rounded-2xl bg-[#141417] light:bg-white ring-1 ring-white/[0.06] light:ring-gray-950/[0.07]" />
        <div className="grid grid-cols-2 gap-3 @3xl:grid-cols-4">
          <StatCard label="Volume" hint="">
            <span className="text-2xl font-semibold text-white light:text-gray-900">58</span>
            <ScoreBar value={58} className="bg-indigo-500/70" />
          </StatCard>
          <StatCard label="Difficulty" hint="">
            <span className="text-2xl font-semibold text-white light:text-gray-900">34</span>
            <ScoreBar value={34} className="bg-emerald-500/70" />
          </StatCard>
          <StatCard label="Est. daily searches" hint="">
            <span className="text-2xl font-semibold text-white light:text-gray-900">~3.1K</span>
          </StatCard>
          <StatCard label="Results" hint="">
            <span className="text-2xl font-semibold text-white light:text-gray-900">186</span>
          </StatCard>
        </div>
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 rounded-xl bg-[#141417] light:bg-white ring-1 ring-white/[0.06] light:ring-gray-950/[0.07] p-3">
              <div className="size-10 rounded-xl bg-white/[0.08] light:bg-black/[0.06]" />
              <div className="h-3 w-40 rounded bg-white/[0.08] light:bg-black/[0.08]" />
            </div>
          ))}
        </div>
      </div>
      <div className="absolute inset-x-0 top-0">
        {lockCard}
      </div>
    </div>
  );
}

// "Track for <app>": adds the inspected keyword to the active app's tracked
// list, through the same save route Keyword Research uses. Only offered when
// the active app lives on the inspected store and country, since a tracked
// keyword's rank and metrics are always for the app's own storefront.
function TrackKeywordButton({
  app, tracked, saving, onTrack, docked,
}: {
  app: { name: string; icon_url: string | null };
  tracked: boolean;
  saving: boolean;
  onTrack: () => void;
  // Docked beside Keyword Research, the tracked keyword is already in the
  // table next to it, so there's nothing to link to.
  docked?: boolean;
}) {
  const icon = app.icon_url
    ? <img src={app.icon_url} alt="" className="size-5 shrink-0 rounded-md object-cover ring-1 ring-white/10 light:ring-black/10" />
    : null;

  if (tracked && docked) {
    return (
      <span className="inline-flex max-w-full items-center gap-2 rounded-full bg-emerald-500/10 py-1 pl-3 pr-3 text-xs font-medium text-emerald-300 light:text-emerald-700 ring-1 ring-inset ring-emerald-500/25">
        {icon ?? <span className="size-5" />}
        <CheckIcon className="size-3.5 shrink-0" />
        <span className="truncate">Tracking for {app.name}</span>
      </span>
    );
  }

  if (tracked) {
    return (
      <Link
        href="/dashboard/keywords/research"
        title="Open in Keyword Research"
        className="group inline-flex max-w-full items-center gap-2 rounded-full bg-emerald-500/10 py-1 pl-3 pr-3 text-xs font-medium text-emerald-300 light:text-emerald-700 ring-1 ring-inset ring-emerald-500/25 transition-colors hover:bg-emerald-500/15"
      >
        {icon ?? <span className="size-5" />}
        <CheckIcon className="size-3.5 shrink-0" />
        <span className="truncate">Tracking for {app.name}</span>
        <ArrowTopRightOnSquareIcon className="size-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onTrack}
      disabled={saving}
      className="group relative inline-flex max-w-full items-center gap-2 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 py-1 pl-3 pr-3.5 text-xs font-semibold text-white shadow-lg shadow-indigo-500/25 ring-1 ring-inset ring-white/15 transition-all hover:-translate-y-px hover:shadow-indigo-500/40 hover:brightness-110 active:translate-y-0 disabled:cursor-wait disabled:opacity-80 disabled:hover:translate-y-0"
    >
      {icon ?? <span className="size-5" />}
      {saving
        ? <ArrowPathIcon className="size-3.5 shrink-0 animate-spin" />
        : <PlusIcon className="size-3.5 shrink-0 stroke-[2.5] transition-transform group-hover:rotate-90" />}
      <span className="truncate">{saving ? "Adding..." : `Track for ${app.name}`}</span>
    </button>
  );
}

// Set when the Inspector is docked in Keyword Research's right-hand pane
// (tabbed with Long Tail) instead of being its own page. Research owns the tracked list there, so
// "Track" goes through its add flow (full metrics, straight into the table)
// rather than a bare save, and the tour/URL handling stays page-only.
export type InspectorDock = {
  // Each Inspect click from the table; the nonce re-runs a repeat of the
  // same term (e.g. after the user typed something else in the form).
  request: { term: string; store: Store; country: string; nonce: number } | null;
  trackedTerms: Set<string>;
  onTrack: (term: string) => void;
  // "See long tail" on a keyword with no easy openings: switches the pane to
  // its Long Tail tab for that term (the full page links to Long Tail instead).
  onLongTail?: (term: string) => void;
  // The app's current competitors (store ids), so their rows show as added,
  // and a callback so Research's own list picks up one added here.
  competitorIds?: Set<string>;
  onCompetitorAdded?: (competitor: CompetitorApp) => void;
  // The app's Chance for a term, from Research's table row (the Inspector
  // has no app-specific score of its own); undefined when it isn't there.
  chanceFor?: (term: string) => number | undefined;
  // The onboarding tour's step, which Keywords Research owns; the
  // Inspector shows "inspectorSearches" and "inspectorRank".
  tourStep?: TourStep | null;
  onAdvanceTour?: () => void;
};

export default function KeywordInspectorPage({ dock }: { dock?: InspectorDock } = {}) {
  const activeApp = useActiveApp();
  const workspaceId = useWorkspaceId();
  const locked = !canUseInspector(usePlanSlug());
  const docked = !!dock;

  // The onboarding coach mark's Inspector steps (TOUR_STEPS in
  // @/features/onboarding/tour), driven by Keywords Research through the
  // dock; the full page has no tour of its own. Each step's bubble waits for
  // its section to load, and a section that never shows (failed lookup) is
  // skipped further down.
  const tourStep = dock?.tourStep ?? null;
  const advanceTour = () => dock?.onAdvanceTour?.();
  const statsRef = useRef<HTMLDivElement>(null);
  const insightsRef = useRef<HTMLElement>(null);

  const [term, setTerm] = useState("");
  const [store, setStore] = useState<Store>("ios");
  const [country, setCountry] = useState("us");
  const [recent, setRecent] = useState<Recent[]>([]);

  // What's currently shown — kept separate from the form so editing the
  // input doesn't relabel results that were fetched for a different query.
  const [query, setQuery] = useState<Recent | null>(null);
  const [metrics, setMetrics] = useState<KeywordInspection | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [highlightKeyword, setHighlightKeyword] = useState(false);
  const [iosSubtitles, setIosSubtitles] = useState<Record<string, string>>({});
  const [subtitlesLoading, setSubtitlesLoading] = useState(false);
  // Monthly downloads/revenue per result, keyed by store id. null = loading
  // (or not requested yet); supported false = no model for this storefront.
  const [estimates, setEstimates] = useState<KeywordResultEstimates | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [metricsError, setMetricsError] = useState<string | null>(null);
  const [apps, setApps] = useState<AppSearchResult[] | null>(null);
  // Every result the search returned (up to 200 on the App Store), not just
  // the top 20 shown, so "your app's rank" can find it further down.
  const [allResults, setAllResults] = useState<AppSearchResult[] | null>(null);
  const [appsLoading, setAppsLoading] = useState(false);
  const [appsError, setAppsError] = useState<string | null>(null);

  // Each inspect bumps this; a slower response from an earlier query checks
  // it before writing so it can't overwrite the newer query's results.
  const requestId = useRef(0);

  // Terms the active app already tracks (lowercased), so the Track button
  // can show "Tracking" instead. null = not loaded (or no active app).
  const [trackedTerms, setTrackedTerms] = useState<Set<string> | null>(null);
  const [trackSaving, setTrackSaving] = useState(false);
  // Set per search: the results list and "Your app's rank" came from iPad
  // search because the active app is iPad-only.
  const [ipadResults, setIpadResults] = useState(false);
  const [trackError, setTrackError] = useState<string | null>(null);
  // Competitors added from the results list this session (store ids), the
  // one being saved, and a save error, shown above the list.
  const [addedCompetitors, setAddedCompetitors] = useState<Set<string>>(new Set());
  const [addingCompetitor, setAddingCompetitor] = useState<string | null>(null);
  const [competitorError, setCompetitorError] = useState<string | null>(null);

  useEffect(() => {
    // Docked, Keyword Research's own list is the source (dock.trackedTerms).
    if (docked) return;
    if (!activeApp?.id && !activeApp?.bundle_id) return;
    let cancelled = false;
    // Same params Keyword Research uses: a previewed (not yet followed) app
    // has no id, so it's looked up by its natural key instead.
    const params = activeApp.id
      ? new URLSearchParams({ appId: activeApp.id })
      : new URLSearchParams({
          workspaceId: workspaceId ?? "",
          bundleId: activeApp.bundle_id ?? "",
          store: activeApp.store,
          country: activeApp.country ?? "us",
        });
    fetch(`/api/keywords/list?${params}`)
      .then((r) => r.json())
      .then(({ keywords }: { keywords?: { term: string }[] }) => {
        if (!cancelled) setTrackedTerms(new Set((keywords ?? []).map((k) => k.term.toLowerCase())));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      setTrackedTerms(null);
    };
  }, [docked, activeApp?.id, activeApp?.bundle_id, activeApp?.store, activeApp?.country, workspaceId]);

  // Store/country: last used here, else the active app's, else US App Store.
  // Read after mount (localStorage is client-only).
  //
  // A link from Keyword Research (?term=&store=&country=) overrides both and
  // runs the inspection straight away. Read from window.location rather than
  // useSearchParams so the page doesn't need a Suspense boundary.
  useEffect(() => {
    // Docked, the form follows each Inspect request instead (effect below),
    // and the URL belongs to Keyword Research.
    if (docked) return;
    const prefs = readJson<{ store?: Store; country?: string }>(PREFS_KEY);
    const url = new URLSearchParams(window.location.search);
    const linkTerm = url.get("term")?.trim();
    const linkStore = url.get("store");
    const linkCountry = url.get("country")?.toLowerCase();
    const nextStore: Store = linkStore === "ios" || linkStore === "android" ? linkStore : prefs?.store ?? activeApp?.store ?? "ios";
    const nextCountry = linkCountry && COUNTRY_MAP[linkCountry.toUpperCase()]
      ? linkCountry
      : (prefs?.country ?? activeApp?.country ?? "us").toLowerCase();
    /* eslint-disable react-hooks/set-state-in-effect */
    setStore(nextStore);
    setCountry(nextCountry);
    if (linkTerm && !locked) {
      setTerm(linkTerm);
      inspect({ term: linkTerm, store: nextStore, country: nextCountry });
    }
    /* eslint-enable react-hooks/set-state-in-effect */
    // Drop the params so a refresh doesn't re-run it over a newer search.
    if (linkTerm) window.history.replaceState(null, "", window.location.pathname);
    // Only on mount: switching apps later shouldn't clobber a choice made here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Recent searches live server-side (keyword_inspector_searches, written by
  // the inspect route), so they follow the user across devices and an admin
  // viewing as them sees theirs. Merged rather than replaced: a search
  // started before this loads (a link from Keyword Research) stays on top.
  function loadRecent() {
    fetch("/api/keywords/inspect/recent")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { recent?: Recent[] } | null) => {
        if (data?.recent) setRecent((prev) => mergeRecent(prev, data.recent!));
      })
      .catch(() => {});
  }

  useEffect(loadRecent, []);

  // Docked: every Inspect click in Keyword Research's table lands here, for
  // that table's own store and country (the storefront its metrics are for).
  // An empty pane (opened from the header) starts on that storefront too.
  const dockRequest = dock?.request;
  useEffect(() => {
    if (!docked) return;
    /* eslint-disable react-hooks/set-state-in-effect */
    if (!dockRequest) {
      if (activeApp) {
        setStore(activeApp.store);
        setCountry((activeApp.country ?? "us").toLowerCase());
      }
      return;
    }
    setTerm(dockRequest.term);
    setStore(dockRequest.store);
    setCountry(dockRequest.country);
    /* eslint-enable react-hooks/set-state-in-effect */
    if (!locked) inspect({ term: dockRequest.term, store: dockRequest.store, country: dockRequest.country });
    // Keyed on the nonce: a new object with the same request shouldn't re-run.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docked, dockRequest?.nonce]);

  function rememberPrefs(next: { store: Store; country: string }) {
    writeJson(PREFS_KEY, next);
  }

  async function inspect(q: Recent) {
    const normTerm = q.term.trim().toLowerCase();
    if (!normTerm) return;
    const current: Recent = { term: normTerm, store: q.store, country: q.country };
    const id = ++requestId.current;

    setQuery(current);
    setTrackError(null);
    setMetrics(null);
    setMetricsError(null);
    setMetricsLoading(true);
    setApps(null);
    setAllResults(null);
    setIosSubtitles({});
    setSubtitlesLoading(false);
    setEstimates(null);
    setAppsError(null);
    setAppsLoading(true);

    // Shown right away; the inspect request below is what saves it.
    setRecent((prev) => mergeRecent([current], prev));

    const params = new URLSearchParams({ term: normTerm, store: current.store, country: current.country, workspaceId: workspaceId ?? "" });
    // Resolves to the inspection (or null) so the results list below can
    // fall back to its topApps if the browser's live search fails.
    const metricsPromise = (async (): Promise<KeywordInspection | null> => {
      try {
        const res = await fetch(`/api/keywords/inspect?${params}`);
        const data = await res.json();
        if (!res.ok) {
          if (id === requestId.current) setMetricsError(data.error ?? "Couldn't check this keyword right now.");
          return null;
        }
        if (id === requestId.current) setMetrics(data as KeywordInspection);
        return data as KeywordInspection;
      } catch {
        if (id === requestId.current) setMetricsError("Couldn't check this keyword right now.");
        return null;
      } finally {
        if (id === requestId.current) setMetricsLoading(false);
      }
    })();

    // An iPad-only app is never in iPhone results, so its rank (and the list
    // it ranks in) comes from iPad search instead — see TrackedApp in
    // liveSearch.ts. The server's fallback topApps are iPhone results, so
    // they're not used in that case.
    let trackedApp: TrackedApp | undefined;
    const appsPromise = (async () => {
      try {
        const ipadOnly = current.store === "ios" && await resolveIpadOnlyClient(activeApp);
        if (id !== requestId.current) return;
        setIpadResults(ipadOnly);
        trackedApp = ipadOnly && activeApp?.store_id
          ? { id: activeApp.store_id, name: activeApp.name, icon: activeApp.icon_url ?? "", ipadOnly: true }
          : undefined;
        const results = await fetchLiveSearchResults(normTerm, current.store, current.country, trackedApp, true);
        if (id !== requestId.current) return;
        const top = results.slice(0, RESULTS_DISPLAY_LIMIT);
        setApps(top);
        setAllResults(results);
        if (current.store === "ios") loadIosSubtitles(top, current.country, id);
        loadEstimates(top, current.store, current.country, id);
      } catch {
        // Live search failed (usually the store rate-limiting this browser's
        // IP). The server already ran the same search for the scores, so show
        // its results instead of an error when it has them.
        const inspection = await metricsPromise;
        if (id !== requestId.current) return;
        if (inspection?.topApps?.length && !trackedApp) {
          setApps(inspection.topApps);
          setAllResults(inspection.topApps);
          if (current.store === "ios") loadIosSubtitles(inspection.topApps, current.country, id);
          loadEstimates(inspection.topApps, current.store, current.country, id);
        } else setAppsError("Couldn't load search results right now. Try again in a minute.");
      } finally {
        if (id === requestId.current) setAppsLoading(false);
      }
    })();

    await Promise.all([metricsPromise, appsPromise]);
  }

  // Second step after the list renders: App Store subtitles come from each
  // app's store page (server-side, cached), so the list never waits on them.
  // Rows show just the developer until they arrive, or if a lookup fails.
  async function loadIosSubtitles(list: AppSearchResult[], country: string, id: number) {
    const targets = list.filter((a) => a.trackId).map((a) => ({ trackId: a.trackId, name: a.name }));
    if (!targets.length) return;
    setSubtitlesLoading(true);
    try {
      const res = await fetch("/api/keywords/subtitles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ country, workspaceId, apps: targets }),
      });
      if (!res.ok || id !== requestId.current) return;
      const data = (await res.json()) as { subtitles?: Record<string, string> };
      if (id === requestId.current) setIosSubtitles(data.subtitles ?? {});
    } catch {
      // Best-effort: rows already show the developer instead.
    } finally {
      if (id === requestId.current) setSubtitlesLoading(false);
    }
  }

  // Same second-step pattern as subtitles: each app's estimate needs its full
  // store listing, so the list renders first. A failed request shows dashes.
  async function loadEstimates(list: AppSearchResult[], store: Store, country: string, id: number) {
    const ids = list.map((a) => storeIdOf(a, store)).filter(Boolean);
    if (!ids.length) return;
    try {
      const res = await fetch("/api/keywords/estimates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ store, country, ids }),
      });
      const data = res.ok ? ((await res.json()) as KeywordResultEstimates) : null;
      if (id === requestId.current) setEstimates(data ?? { supported: true, estimates: {} });
    } catch {
      if (id === requestId.current) setEstimates({ supported: true, estimates: {} });
    }
  }

  // Same save as Live Search's "add as competitor": straight to
  // /api/competitors for the active app.
  async function addCompetitor(result: AppSearchResult, store: Store) {
    if (!activeApp || addingCompetitor) return;
    const storeId = storeIdOf(result, store);
    if (!storeId) return;
    setCompetitorError(null);
    setAddingCompetitor(storeId);
    try {
      const competitor: CompetitorApp = { storeId, name: result.name, icon: result.icon, developer: result.developer };
      const res = await fetch("/api/competitors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          appId: activeApp.id,
          bundleId: activeApp.bundle_id,
          storeId: activeApp.store_id,
          appName: activeApp.name,
          iconUrl: activeApp.icon_url ?? undefined,
          store: activeApp.store,
          country: activeApp.country,
          competitor,
        }),
      });
      if (!res.ok) {
        const body: { error?: string } = await res.json().catch(() => ({}));
        setCompetitorError(body.error ?? "Couldn't add this app as a competitor.");
        return;
      }
      setAddedCompetitors((prev) => new Set(prev).add(storeId));
      dock?.onCompetitorAdded?.(competitor);
    } catch {
      setCompetitorError("Couldn't add this app as a competitor.");
    } finally {
      setAddingCompetitor(null);
    }
  }

  async function trackKeyword(t: string) {
    if (dock) {
      dock.onTrack(t);
      return;
    }
    if (!activeApp || !workspaceId) return;
    setTrackSaving(true);
    setTrackError(null);
    try {
      // Terms only, no metrics: Keyword Research computes them (rank,
      // chance, relevancy) the next time it loads this app's list.
      const res = await fetch("/api/keywords/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          terms: [t],
          workspaceId,
          appId: activeApp.id,
          bundleId: activeApp.bundle_id,
          storeId: activeApp.store_id,
          appName: activeApp.name,
          iconUrl: activeApp.icon_url ?? undefined,
          store: activeApp.store,
          country: activeApp.country ?? "us",
        }),
      });
      if (!res.ok) {
        const body: { error?: string } = await res.json().catch(() => ({}));
        setTrackError(body.error ?? "Couldn't track this keyword.");
        return;
      }
      setTrackedTerms((prev) => new Set(prev ?? []).add(t.toLowerCase()));
    } catch {
      setTrackError("Couldn't track this keyword.");
    } finally {
      setTrackSaving(false);
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    inspect({ term, store, country });
  }

  function onRecentClick(r: Recent) {
    setTerm(r.term);
    setStore(r.store);
    setCountry(r.country);
    rememberPrefs({ store: r.store, country: r.country });
    inspect(r);
  }

  // Optimistic. A failed delete (e.g. view-only while an admin views as the
  // user) reloads the list so the row comes back instead of looking removed.
  async function deleteRecent(body: Recent | Record<string, never>) {
    const res = await fetch("/api/keywords/inspect/recent", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).catch(() => null);
    if (!res?.ok) {
      setRecent([]);
      loadRecent();
    }
  }

  function removeRecent(r: Recent) {
    setRecent((prev) => prev.filter((x) => !sameRecent(x, r)));
    deleteRecent(r);
  }

  function clearRecent() {
    setRecent([]);
    deleteRecent({});
  }

  // A plain title bar, not the app header the other Keywords pages use: the
  // Inspector isn't tied to an app (any keyword, store and country), and an
  // app header would imply the form follows it. The active app only feeds
  // the "Your app's rank" card, which names the app itself.
  // Docked, Keyword Research's pane has its own tab bar (InspectorSplit).
  const header = dock ? null : (
    <div className="shrink-0 flex items-center gap-3 px-6 py-4 border-b border-white/[0.07] light:border-black/[0.08]">
      <div className="size-8 rounded-xl bg-indigo-500/10 flex items-center justify-center shrink-0">
        <DocumentMagnifyingGlassIcon className="size-4 text-indigo-400 light:text-indigo-600" />
      </div>
      <div>
        <p className="text-sm font-semibold text-white light:text-gray-900 leading-tight">Keyword Inspector</p>
        <p className="text-xs text-gray-500 leading-tight">Volume, difficulty, daily searches and live results for any keyword, and whether you can rank for it</p>
      </div>
    </div>
  );

  const busy = metricsLoading || appsLoading;
  // Google Play's search page returns a single page of ~20-30 apps with no
  // pagination token, so its result count says nothing about competition
  // (a crowded keyword can come back with 19). Only the App Store's count,
  // up to its 200 limit, is meaningful.
  const showResultsCard = query?.store === "ios";
  // Docked, Chance (from the table row) takes Results' place in the strip.
  const dockChance = query ? dock?.chanceFor?.(query.term) : undefined;
  // Words shared by 2+ of the top titles, and how many titles carry the
  // searched keyword itself: the strongest ranking signal you can see from
  // outside, and often a better read on direct competition than Difficulty.
  const subtitleLabel = query?.store === "android" ? "short description" : "subtitle";
  // "Your app's rank" only makes sense for an active app on the searched store.
  const sameStore = !!activeApp && !!query && activeApp.store === query.store;
  // Same matcher the metrics route and nightly refresh use, so this agrees
  // with the rank Keyword Research shows.
  const yourRankIdx = sameStore && allResults && activeApp
    ? findRankIdx(allResults.map((a) => a.name), activeApp.name, allResults.map((a) => (query!.store === "ios" ? a.trackId : a.appId)), activeApp.store_id)
    : -1;
  const yourStoreId = sameStore ? activeApp?.store_id : undefined;
  // Tracking needs the same storefront too: a tracked keyword's rank and
  // metrics are always for the app's own country.
  const canTrack = sameStore && !!workspaceId && !!activeApp
    && (activeApp.country ?? "us").toLowerCase() === query!.country
    && (!!activeApp.id || (!!activeApp.bundle_id && !!activeApp.store_id));
  const tracked = dock ? dock.trackedTerms : trackedTerms;
  const isTracked = !!query && !!tracked?.has(query.term);
  const weakSpots = query && apps ? findWeakSpots(apps, query.store, yourStoreId) : [];
  const rowSubtitles = query && apps ? apps.map((a) => subtitleFor(a, query.store, iosSubtitles)) : [];
  const hasSubtitles = rowSubtitles.some(Boolean);
  const titleMatches = query && apps ? apps.filter((a) => titleHasKeyword(a.name, query.term)).length : 0;
  const titleOrSubtitleMatches = query && apps
    ? apps.filter((a, i) => titleHasKeyword(`${a.name} ${rowSubtitles[i]}`, query.term)).length
    : 0;
  const pop = metrics ? popularityLabel(metrics.popularity) : null;
  const diff = metrics ? difficultyLabel(metrics.difficulty) : null;

  // A tour step whose section isn't going to show (lookup failed) moves on
  // instead of waiting forever.
  const tourTargetMissing = !!query && (
    (tourStep === "inspectorSearches" && !metricsLoading && !metrics) ||
    (tourStep === "inspectorRank" && !appsLoading && !apps?.length)
  );
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (tourTargetMissing) advanceTour();
  }, [tourTargetMissing]);

  const tourRankMessage = !query ? null : (
    <>
      {sameStore && yourRankIdx >= 0
        ? <>Your app ranks <span className="font-semibold text-white light:text-gray-900">#{yourRankIdx + 1}</span> for &ldquo;{query.term}&rdquo;.</>
        : sameStore
          ? <>Your app isn&apos;t ranking for &ldquo;{query.term}&rdquo; yet.</>
          : null}{" "}
      {weakSpots.length > 0
        ? <>{weakSpots.length === 1 ? "One app" : `${weakSpots.length} apps`} in the top {WEAK_SPOT_RANGE} {weakSpots.length === 1 ? "has" : "have"} few ratings or low stars, so {weakSpots.length === 1 ? "it's" : "they're"} the <span className="font-semibold text-white light:text-gray-900">easiest spots to take</span>.</>
        : sameStore && yourRankIdx >= 0 && yourRankIdx < WEAK_SPOT_RANGE
          ? <>Every other app in the top {WEAK_SPOT_RANGE} is well established, so this spot is worth holding on to.</>
          : <>Every app in the top {WEAK_SPOT_RANGE} is well established, so a keyword with lower Difficulty may be a better first target.</>}
    </>
  );

  if (locked) {
    return (
      <div className="@container h-full flex flex-col overflow-hidden bg-[#0e0e10] light:bg-[#f7f7f8]">
        {header}
        <InspectorLockedPreview docked={docked} />
      </div>
    );
  }

  return (
    <div className="@container h-full flex flex-col overflow-hidden bg-[#0e0e10] light:bg-[#f7f7f8]">
      {header}

      <div className="flex-1 overflow-y-auto">
        <div className="px-4 @lg:px-6 py-6 space-y-6">
          {/* ── Query form ── (page only: docked, the pane inspects whichever
              keyword was clicked in the table, so there's nothing to type) */}
          {!docked && (
            <form onSubmit={onSubmit} className="rounded-2xl bg-[#141417] light:bg-white ring-1 ring-white/[0.06] light:ring-gray-950/[0.07] light:shadow-sm p-4 space-y-3">
              <div className="flex flex-col gap-3 @3xl:flex-row">
                <label className="relative flex-1">
                  <span className="sr-only">Keyword</span>
                  <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-500" />
                  <input
                    value={term}
                    onChange={(e) => setTerm(e.target.value)}
                    placeholder="Enter a keyword, e.g. habit tracker"
                    maxLength={100}
                    autoFocus
                    className="w-full rounded-xl bg-[#0e0e10] light:bg-[#f7f7f8] py-2.5 pl-9 pr-3 text-sm text-white light:text-gray-900 placeholder:text-gray-600 light:placeholder:text-gray-400 outline-none focus:ring-1 focus:ring-indigo-500/60"
                  />
                </label>

                <div className="flex gap-3">
                  <div className="flex rounded-xl bg-[#0e0e10] light:bg-[#f7f7f8] p-1" role="radiogroup" aria-label="Store">
                    {(["ios", "android"] as const).map((s) => (
                      <button
                        key={s}
                        type="button"
                        role="radio"
                        aria-checked={store === s}
                        onClick={() => { setStore(s); rememberPrefs({ store: s, country }); }}
                        className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors ${
                          store === s
                            ? "bg-white/[0.08] light:bg-white text-white light:text-gray-900 light:shadow-sm"
                            : "text-gray-500 hover:text-gray-300 light:hover:text-gray-700"
                        }`}
                      >
                        <img src={s === "ios" ? "/app-store.svg" : "/google-play.svg"} alt="" className="size-3.5" />
                        {s === "ios" ? "App Store" : "Google Play"}
                      </button>
                    ))}
                  </div>

                  <div className="min-w-0 flex-1 @3xl:flex-none">
                    <CountryPicker value={country} onChange={(c) => { setCountry(c); rememberPrefs({ store, country: c }); }} />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={!term.trim() || busy}
                  className="rounded-xl bg-indigo-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {busy ? "Inspecting..." : "Inspect"}
                </button>
              </div>

              {recent.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs text-gray-600 light:text-gray-400 mr-1">Recent</span>
                  {recent.map((r) => (
                    // Two sibling buttons in one pill (a button can't nest
                    // another): the search itself, and × to drop just this one.
                    <span
                      key={`${r.term}-${r.store}-${r.country}`}
                      className="group flex items-center rounded-full bg-white/[0.05] light:bg-black/[0.04] text-xs text-gray-300 light:text-gray-700 transition-colors hover:bg-white/[0.09] light:hover:bg-black/[0.07]"
                    >
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => onRecentClick(r)}
                        className="flex items-center gap-1 py-1 pl-2.5 pr-1 disabled:opacity-50"
                      >
                        <span>{countryFlag(r.country)}</span>
                        <img src={r.store === "ios" ? "/app-store.svg" : "/google-play.svg"} alt="" className="size-3" />
                        {r.term}
                      </button>
                      <button
                        type="button"
                        onClick={() => removeRecent(r)}
                        aria-label={`Remove ${r.term} from recent searches`}
                        className="mr-1 rounded-full p-0.5 text-gray-600 light:text-gray-400 hover:bg-white/[0.08] light:hover:bg-black/[0.06] hover:text-gray-300 light:hover:text-gray-700 transition-colors"
                      >
                        <XMarkIcon className="size-3" />
                      </button>
                    </span>
                  ))}
                  <button type="button" onClick={clearRecent} className="ml-1 text-xs text-gray-600 light:text-gray-400 hover:text-gray-400 light:hover:text-gray-600 hover:underline">
                    Clear all
                  </button>
                </div>
              )}
            </form>
          )}

          {!query && (
            <div className="py-16 text-center">
              <DocumentMagnifyingGlassIcon className="size-10 text-gray-700 light:text-gray-300 mx-auto mb-4" />
              <p className="text-sm font-medium text-gray-400 light:text-gray-600">Inspect any keyword</p>
              <p className="mt-1 text-sm text-gray-600 light:text-gray-400 max-w-md mx-auto">
                {docked
                  ? "Click a keyword in your table to see its daily searches, who ranks for it, and whether you can beat them."
                  : "Pick a store and country, enter a keyword, and see how popular it is, how hard it is to rank for, and which apps rank for it right now. Then find out if you can beat them, with the weakest spots in the top 10 and where your app ranks today."}
              </p>
            </div>
          )}

          {query && (
            <>
              {/* ── Scores ── */}
              <section>
                {docked ? (
                  // Docked: just the keyword. Storefront is always the app's,
                  // Volume history lives on the Performance tab, and Track
                  // only matters for a keyword the table doesn't have yet.
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <h2 className="truncate text-sm font-semibold text-white light:text-gray-900">&ldquo;{query.term}&rdquo;</h2>
                    {canTrack && activeApp && tracked && !isTracked && (
                      <TrackKeywordButton
                        app={activeApp}
                        tracked={false}
                        saving={trackSaving}
                        onTrack={() => trackKeyword(query.term)}
                        docked
                      />
                    )}
                  </div>
                ) : (
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <h2 className="text-sm font-semibold text-white light:text-gray-900">
                      &ldquo;{query.term}&rdquo;
                      <span className="ml-2 font-normal text-gray-500">
                        {countryFlag(query.country)} {COUNTRY_MAP[query.country.toUpperCase()] ?? query.country.toUpperCase()} · {query.store === "ios" ? "App Store" : "Google Play"}
                      </span>
                    </h2>
                    <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2">
                      {metrics && (
                        <button
                          type="button"
                          onClick={() => setShowHistory(true)}
                          className="flex items-center gap-1.5 text-xs text-indigo-400 light:text-indigo-600 hover:text-indigo-300 light:hover:text-indigo-700 transition-colors"
                        >
                          <ArrowTrendingUpIcon className="size-3.5" />
                          Volume history
                        </button>
                      )}
                      {canTrack && activeApp && tracked && (
                        <TrackKeywordButton
                          app={activeApp}
                          tracked={isTracked}
                          saving={trackSaving}
                          onTrack={() => trackKeyword(query.term)}
                          docked={docked}
                        />
                      )}
                    </div>
                  </div>
                )}

                {trackError && (
                  <div className="mb-3 flex items-center gap-2 rounded-xl bg-red-500/10 px-4 py-3 text-xs text-red-400 light:text-red-600">
                    <ExclamationTriangleIcon className="size-4 shrink-0" />
                    <span className="flex-1">{trackError}</span>
                    <button type="button" onClick={() => setTrackError(null)} aria-label="Dismiss" className="hover:opacity-70">
                      <XMarkIcon className="size-3.5" />
                    </button>
                  </div>
                )}

                {metricsError && (
                  <div className="flex items-center gap-2 rounded-xl bg-red-500/10 px-4 py-3 text-xs text-red-400 light:text-red-600">
                    <ExclamationTriangleIcon className="size-4 shrink-0" />
                    <span className="flex-1">{metricsError}</span>
                    <button type="button" onClick={() => inspect(query)} disabled={busy} className="font-semibold hover:underline disabled:opacity-50">Retry</button>
                  </div>
                )}

                {docked && (metricsLoading || (metrics && pop && diff)) && (
                  <div ref={statsRef} className={`rounded-xl transition-all ${
                    tourStep === "inspectorSearches" ? "ring-2 ring-offset-4 ring-offset-[#0e0e10] light:ring-offset-[#f7f7f8] ring-indigo-400/70" : ""
                  }`}>
                  <StatStrip
                    columns={dockChance === undefined ? 3 : 4}
                    loading={metricsLoading}
                    items={[
                      { label: "Volume", value: String(metrics?.popularity ?? ""), note: pop?.label, noteTone: pop?.className, hint: "Estimated search demand (0 to 100), from App Store and Google Play search signals." },
                      { label: "Difficulty", value: String(metrics?.difficulty ?? ""), note: diff?.label, tone: diff?.className, hint: "How hard it is to rank for this keyword (0 to 100), based on how established the top 5 apps are." },
                      ...(dockChance === undefined ? [] : [{
                        label: "Chance",
                        value: String(dockChance),
                        tone: dockChance > 15 ? "text-emerald-400 light:text-emerald-700" : "text-gray-400 light:text-gray-600",
                        hint: "Your likelihood of ranking for this keyword (0 to 100), same as the Chance column in your table.",
                      }]),
                      { label: "Est. Searches/day", value: metrics ? formatEstimateRange(metrics.estDailySearches) : "", hint: "A ballpark modeled from Volume, for comparing keywords. Not a store-reported count." },
                    ]}
                  />
                  </div>
                )}

                {!docked && metricsLoading && (
                  <div className={`grid grid-cols-2 gap-3 ${showResultsCard ? "@3xl:grid-cols-4" : "@3xl:grid-cols-3"}`}>
                    {Array.from({ length: showResultsCard ? 4 : 3 }).map((_, i) => <StatSkeleton key={i} />)}
                  </div>
                )}

                {!docked && metrics && pop && diff && (
                  <div ref={statsRef} className={`grid grid-cols-2 gap-3 rounded-2xl transition-all ${showResultsCard ? "@3xl:grid-cols-4" : "@3xl:grid-cols-3"} ${
                    tourStep === "inspectorSearches" ? "ring-2 ring-offset-4 ring-offset-[#0e0e10] light:ring-offset-[#f7f7f8] ring-indigo-400/70" : ""
                  }`}>
                    <StatCard label="Volume" hint="Estimated search demand (0 to 100), from App Store and Google Play search signals.">
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-semibold text-white light:text-gray-900">{metrics.popularity}</span>
                        <span className={`text-xs font-medium ${pop.className}`}>{pop.label}</span>
                      </div>
                      <ScoreBar value={metrics.popularity} className="bg-indigo-500/70" />
                    </StatCard>
                    <StatCard label="Difficulty" hint="How hard it is to rank for this keyword (0 to 100), based on how established the top 5 apps are.">
                      <div className="flex items-baseline gap-2">
                        <span className={`text-2xl font-semibold ${diff.className}`}>{metrics.difficulty}</span>
                        <span className={`text-xs font-medium ${diff.className}`}>{diff.label}</span>
                      </div>
                      <ScoreBar value={metrics.difficulty} className={diff.bar} />
                    </StatCard>
                    <StatCard label="Est. daily searches" hint="A ballpark modeled from Volume, for comparing keywords. Not a store-reported count.">
                      <span className="text-2xl font-semibold text-white light:text-gray-900">{formatEstimateRange(metrics.estDailySearches)}</span>
                      <p className="mt-2 text-[11px] text-gray-500">searches per day</p>
                    </StatCard>
                    {showResultsCard && (
                      <StatCard label="Results" hint="How many apps the store returns for this keyword. More results means more competition.">
                        <span className="text-2xl font-semibold text-white light:text-gray-900">{NUMBER_FORMATTER.format(metrics.results)}</span>
                        <p className="mt-2 text-[11px] text-gray-500">apps in search results</p>
                      </StatCard>
                    )}
                  </div>
                )}
              </section>

              {/* ── Insights: your app's rank + beatable spots ── */}
              {apps && apps.length > 0 && (
                <section
                  ref={insightsRef}
                  className={`grid gap-3 rounded-2xl transition-all ${sameStore ? "@3xl:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]" : ""} ${
                    tourStep === "inspectorRank" ? "ring-2 ring-offset-4 ring-offset-[#0e0e10] light:ring-offset-[#f7f7f8] ring-indigo-400/70" : ""
                  }`}
                >
                  {docked && sameStore && activeApp && allResults && (
                    // Docked: one line; the rank trend is on the Performance tab.
                    <div className="flex items-center gap-2.5 rounded-xl bg-[#141417] light:bg-white ring-1 ring-white/[0.06] light:ring-gray-950/[0.07] light:shadow-sm px-3 py-2.5">
                      {activeApp.icon_url && <img src={activeApp.icon_url} alt="" className="size-6 shrink-0 rounded-lg object-cover" />}
                      <p className="text-xs text-gray-400 light:text-gray-600">
                        {yourRankIdx >= 0
                          ? <>Your app ranks <span className="font-semibold text-white light:text-gray-900">#{yourRankIdx + 1}</span> for this keyword</>
                          : <>Your app isn&apos;t in the top {allResults.length} yet</>}
                      </p>
                    </div>
                  )}
                  {!docked && sameStore && activeApp && allResults && (
                    <div className="rounded-2xl bg-[#141417] light:bg-white ring-1 ring-white/[0.06] light:ring-gray-950/[0.07] light:shadow-sm p-4">
                      <p className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
                        <TrophyIcon className="size-3.5" />
                        Your app&apos;s rank
                      </p>
                      <div className="mt-2 flex items-center gap-2.5">
                        {activeApp.icon_url && <img src={activeApp.icon_url} alt="" className="size-8 shrink-0 rounded-xl object-cover" />}
                        <div className="min-w-0">
                          {yourRankIdx >= 0 ? (
                            <p className="text-2xl font-semibold leading-tight text-white light:text-gray-900">
                              #{yourRankIdx + 1}
                              <span className="ml-1.5 text-xs font-normal text-gray-500">
                                in {countryFlag(query.country)} {COUNTRY_MAP[query.country.toUpperCase()] ?? query.country.toUpperCase()}
                              </span>
                            </p>
                          ) : (
                            <p className="text-sm font-semibold leading-tight text-white light:text-gray-900">
                              Not in the top {allResults.length}
                              <span className="ml-1.5 text-xs font-normal text-gray-500">
                                in {countryFlag(query.country)} {COUNTRY_MAP[query.country.toUpperCase()] ?? query.country.toUpperCase()}
                              </span>
                            </p>
                          )}
                          <p className="truncate text-xs text-gray-500">{activeApp.name}</p>
                        </div>
                      </div>
                      <p className="mt-2 text-[11px] text-gray-500">
                        {yourRankIdx >= RESULTS_DISPLAY_LIMIT
                          ? `Below the top ${RESULTS_DISPLAY_LIMIT} shown here`
                          : yourRankIdx >= 0
                            ? "Highlighted in the list below"
                            : query.store === "android"
                              ? "Google Play only shows its first page of results"
                              : "Your app doesn't show up for this keyword yet"}
                      </p>
                    </div>
                  )}
                  {/* The page's most actionable finding, so it's the one card
                      that stands out (green = an opening), and comes first
                      when the cards stack in a narrow pane. With no openings
                      it stays a plain card, since there's nothing to act on. */}
                  <div className={`order-first @3xl:order-none rounded-2xl p-4 ring-1 ${
                    weakSpots.length > 0
                      ? "bg-emerald-500/[0.07] ring-emerald-500/30 light:bg-emerald-50/70 light:ring-emerald-600/25"
                      : "bg-amber-500/[0.06] ring-amber-500/25 light:bg-amber-50/70 light:ring-amber-600/20"
                  }`}>
                    <div className="flex items-center gap-2">
                      <span className={`flex size-7 shrink-0 items-center justify-center rounded-lg ${
                        weakSpots.length > 0 ? "bg-emerald-500/15 text-emerald-400 light:text-emerald-700" : "bg-amber-500/15 text-amber-400 light:text-amber-700"
                      }`}>
                        <LightBulbIcon className="size-4" />
                      </span>
                      <p className="flex-1 text-sm font-semibold text-white light:text-gray-900">
                        Beatable spots in the top {WEAK_SPOT_RANGE}
                      </p>
                      {weakSpots.length > 0 && (
                        <span className="shrink-0 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-300 light:text-emerald-700">
                          {weakSpots.length} {weakSpots.length === 1 ? "opening" : "openings"}
                        </span>
                      )}
                    </div>
                    {weakSpots.length > 0 ? (
                      <ul className="mt-3 space-y-1.5">
                        {weakSpots.map(({ app, reasons }) => (
                          <li
                            key={`${app.position}-${app.trackId || app.appId}`}
                            className="flex items-center gap-2.5 rounded-xl bg-[#141417]/70 light:bg-white px-2.5 py-2 ring-1 ring-white/[0.05] light:ring-emerald-900/[0.06]"
                          >
                            <span className="w-8 shrink-0 rounded-md bg-emerald-500/15 py-0.5 text-center text-xs font-semibold tabular-nums text-emerald-300 light:text-emerald-700">
                              #{app.position}
                            </span>
                            {app.icon && <img src={app.icon} alt="" className="size-7 shrink-0 rounded-lg object-cover" />}
                            <span className="min-w-0 flex-1 truncate text-xs font-medium text-gray-200 light:text-gray-800">{app.name}</span>
                            <span className="flex shrink-0 flex-wrap justify-end gap-1">
                              {reasons.map((reason) => (
                                <span key={reason} className="rounded-full bg-white/[0.06] light:bg-gray-100 px-2 py-0.5 text-[11px] text-gray-400 light:text-gray-600">
                                  {reason}
                                </span>
                              ))}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      // Amber, not red: a competitive keyword isn't an
                      // error. One line on why, one link to the next step
                      // (a longer, less contested variant), nothing else.
                      <>
                        <p className="mt-2 text-xs text-gray-400 light:text-gray-600">
                          <span className="font-semibold text-amber-300 light:text-amber-700">No easy openings.</span>{" "}
                          Every app here has {formatCount(WEAK_RATING_COUNT)}+ ratings and {WEAK_STARS}+ stars.
                        </p>
                        {dock?.onLongTail ? (
                          <button
                            type="button"
                            onClick={() => dock.onLongTail!(query.term)}
                            className="mt-2.5 text-xs font-semibold text-amber-300 light:text-amber-700 hover:underline underline-offset-2"
                          >
                            Try a long tail version instead &rarr;
                          </button>
                        ) : (
                          <Link
                            href={`/dashboard/keywords/combination?${new URLSearchParams({ seed: query.term })}`}
                            className="mt-2.5 inline-block text-xs font-semibold text-amber-300 light:text-amber-700 hover:underline underline-offset-2"
                          >
                            Try a long tail version instead &rarr;
                          </Link>
                        )}
                      </>
                    )}
                    {weakSpots.length > 0 && (
                      <p className="mt-3 text-[11px] text-gray-500">
                        Apps with under {formatCount(WEAK_RATING_COUNT)} ratings or below {WEAK_STARS} stars are the easiest to outrank.
                      </p>
                    )}
                  </div>
                </section>
              )}

              {/* ── Live search results ── */}
              <section>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                  <h2 className="text-sm font-semibold text-white light:text-gray-900">Top {RESULTS_DISPLAY_LIMIT} {ipadResults ? "iPad " : ""}search results</h2>
                  {apps && apps.length > 0 && (
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Toggle checked={highlightKeyword} onChange={() => setHighlightKeyword((v) => !v)} />
                      <span className="text-xs text-gray-500 whitespace-nowrap">Highlight the searched keyword</span>
                    </label>
                  )}
                </div>
                {apps && apps.length > 0 && (
                  <div className="mb-3 flex flex-wrap gap-2">
                    <MatchPill
                      label="Keyword in title"
                      value={`${titleMatches}/${apps.length}`}
                      hint={`Top apps with every word of "${query.term}" in their title`}
                    />
                    {(hasSubtitles || subtitlesLoading) && (
                      <MatchPill
                        label={`In title or ${subtitleLabel}`}
                        value={subtitlesLoading ? null : `${titleOrSubtitleMatches}/${apps.length}`}
                        hint={`Top apps with every word of "${query.term}" in their title or ${subtitleLabel}`}
                      />
                    )}
                  </div>
                )}
                {competitorError && (
                  <div className="mb-3 flex items-center gap-2 rounded-xl bg-red-500/10 px-4 py-3 text-xs text-red-400 light:text-red-600">
                    <ExclamationTriangleIcon className="size-4 shrink-0" />
                    <span className="flex-1"><PlanLimitMessage message={competitorError} /></span>
                    <button type="button" onClick={() => setCompetitorError(null)} aria-label="Dismiss" className="hover:opacity-70">
                      <XMarkIcon className="size-3.5" />
                    </button>
                  </div>
                )}
                <div className="rounded-2xl bg-[#141417] light:bg-white overflow-hidden ring-1 ring-white/[0.06] light:ring-gray-950/[0.07] light:shadow-sm">
                  <CardHeader title="Top ranking apps" count={apps?.length || undefined} />
                  {appsLoading && (
                    <div className="divide-y divide-white/[0.05] light:divide-black/[0.05]">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-3 px-4 py-2.5 animate-pulse">
                          <div className="w-6" />
                          <div className="size-10 rounded-2xl bg-white/[0.06] light:bg-black/[0.06]" />
                          <div className="flex-1 space-y-1.5">
                            <div className="h-3 w-1/3 rounded bg-white/[0.06] light:bg-black/[0.06]" />
                            <div className="h-2.5 w-1/5 rounded bg-white/[0.06] light:bg-black/[0.06]" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {appsError && (
                    <div className="flex items-center gap-2 px-4 py-3 text-xs text-red-400 light:text-red-600">
                      <ExclamationTriangleIcon className="size-4 shrink-0" />
                      {appsError}
                    </div>
                  )}
                  {apps && apps.length === 0 && (
                    <p className="px-4 py-8 text-center text-sm text-gray-500">No apps found for this keyword in this country.</p>
                  )}
                  {apps && apps.map((app) => (
                      <ResultRow
                        key={`${app.position}-${app.trackId || app.appId}`}
                        app={app}
                        store={query.store}
                        country={query.country}
                        subtitle={subtitleFor(app, query.store, iosSubtitles)}
                        subtitleLoading={query.store === "ios" && subtitlesLoading && !iosSubtitles[String(app.trackId)]}
                        term={query.term}
                        highlight={highlightKeyword}
                        isYou={!!yourStoreId && (query.store === "ios" ? String(app.trackId) : app.appId) === yourStoreId}
                        estimate={estimates ? estimates.estimates[storeIdOf(app, query.store)] ?? null : undefined}
                        showEstimates={estimates?.supported !== false}
                        competitor={canTrack && !(!!yourStoreId && storeIdOf(app, query.store) === yourStoreId) && storeIdOf(app, query.store) ? {
                          state: addingCompetitor === storeIdOf(app, query.store) ? "adding"
                            : addedCompetitors.has(storeIdOf(app, query.store)) || !!dock?.competitorIds?.has(storeIdOf(app, query.store)) ? "added"
                            : "add",
                          onAdd: () => addCompetitor(app, query.store),
                        } : undefined}
                      />
                  ))}
                </div>
              </section>
            </>
          )}
        </div>
      </div>

      <TourTooltip
        targetRef={statsRef}
        active={tourStep === "inspectorSearches" && !!metrics}
        step={TOUR_STEPS.indexOf("inspectorSearches") + 1}
        total={TOUR_STEPS.length}
        icon={<ArrowTrendingUpIcon className="size-4 text-indigo-400 light:text-indigo-600 shrink-0 mt-0.5" />}
        message={metrics && query && (
          <>{metrics.estDailySearches < 5 ? "Fewer than" : "Roughly"} <span className="font-semibold text-white light:text-gray-900">{metrics.estDailySearches < 5 ? "5" : formatEstimateRange(metrics.estDailySearches)} people</span> search &ldquo;{query.term}&rdquo; every day. Volume is the demand, and Difficulty is how hard the top spots are to take.</>
        )}
        buttonLabel="Next"
        onAdvance={advanceTour}
      />
      <TourTooltip
        targetRef={insightsRef}
        active={tourStep === "inspectorRank" && !!apps?.length}
        step={TOUR_STEPS.indexOf("inspectorRank") + 1}
        total={TOUR_STEPS.length}
        icon={<TrophyIcon className="size-4 text-indigo-400 light:text-indigo-600 shrink-0 mt-0.5" />}
        message={tourRankMessage}
        buttonLabel="Next"
        onAdvance={advanceTour}
      />

      {showHistory && query && (
        <VolumeHistoryPanel term={query.term} store={query.store} country={query.country} onClose={() => setShowHistory(false)} />
      )}
    </div>
  );
}

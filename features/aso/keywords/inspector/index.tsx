"use client";

import { useState, useEffect, useRef } from "react";
import {
  DocumentMagnifyingGlassIcon,
  MagnifyingGlassIcon,
  ExclamationTriangleIcon,
  ArrowTrendingUpIcon,
  ArrowTopRightOnSquareIcon,
  ArrowPathIcon,
  ChevronDownIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useActiveApp } from "@/features/dashboard/ActiveAppContext";
import { useWorkspaceId } from "@/features/dashboard/WorkspaceContext";
import { usePlanSlug } from "@/features/dashboard/PlanContext";
import { FeatureLocked } from "@/features/subscription/FeatureLocked";
import { isPlanAtLeast } from "@/features/subscription/planTiers";
import { fetchLiveSearchResults } from "@/features/aso/keywords/research/liveSearch";
import { Toggle } from "@/features/aso/keywords/research/ui";
// The same history panel Keyword Research's Volume column opens.
import { VolumeHistoryPanel } from "@/features/aso/keywords/performance/VolumeHistoryPanel";
import { COUNTRIES, COUNTRY_MAP, countryFlag } from "@/libs/countries";
import type { AppSearchResult } from "@/app/api/keywords/search/route";
import type { KeywordInspection } from "@/app/api/keywords/inspect/route";

type Store = "ios" | "android";

const RESULTS_DISPLAY_LIMIT = 20;
const RECENT_LIMIT = 8;
const PREFS_KEY = "keyword-inspector-prefs";
const RECENT_KEY = "keyword-inspector-recent";

type Recent = { term: string; store: Store; country: string };

const COUNTRY_OPTIONS = [...COUNTRIES].sort((a, b) => a.label.localeCompare(b.label));
const NUMBER_FORMATTER = new Intl.NumberFormat("en-US");

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
    <div className="rounded-2xl bg-[#1a1d24] light:bg-white p-4" title={hint}>
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

function StatSkeleton() {
  return (
    <div className="rounded-2xl bg-[#1a1d24] light:bg-white p-4 animate-pulse">
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
    <div className="flex items-center gap-2 rounded-lg bg-[#1a1d24] light:bg-white px-3 py-1.5" title={hint}>
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

function ResultRow({
  app, store, country, subtitle, subtitleLoading, term, highlight,
}: {
  app: AppSearchResult;
  store: Store;
  country: string;
  subtitle: string;
  // An App Store subtitle that's still being fetched: shows a placeholder bar.
  subtitleLoading: boolean;
  term: string;
  highlight: boolean;
}) {
  const storeUrl = store === "ios"
    ? app.trackId ? `https://apps.apple.com/${country}/app/id${app.trackId}` : null
    : app.appId ? `https://play.google.com/store/apps/details?id=${encodeURIComponent(app.appId)}&gl=${country}` : null;
  return (
    <div className="flex items-start gap-3 px-4 py-3 border-b border-white/[0.05] light:border-black/[0.05] last:border-0">
      <span className="w-6 shrink-0 pt-3 text-center text-xs font-semibold text-gray-500">{app.position}</span>
      <div className={`size-10 shrink-0 overflow-hidden bg-[#0d0f14] light:bg-gray-100 ${store === "android" ? "rounded-xl" : "rounded-2xl"}`}>
        {app.icon && <img src={app.icon} alt="" className="size-full object-cover" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-white light:text-gray-900"><KeywordHighlight text={app.name} term={term} active={highlight} /></p>
        {subtitleLoading && (
          <div className="my-1 h-2.5 w-40 max-w-full rounded bg-white/[0.07] light:bg-black/[0.07] animate-pulse" aria-hidden="true" />
        )}
        {subtitle && (
          // Wraps instead of truncating: a Play short description runs up to
          // 80 characters (App Store subtitles max out at 30, so they never do).
          <p className="text-xs leading-snug text-gray-400 light:text-gray-600 break-words"><KeywordHighlight text={subtitle} term={term} active={highlight} /></p>
        )}
        <p className={`truncate text-gray-500 ${subtitle ? "text-[11px]" : "text-xs"}`}>{app.developer}</p>
        {storeUrl && (
          <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1">
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
      <span className="hidden sm:block w-16 shrink-0 pt-1 text-right text-xs text-gray-500">{app.price}</span>
    </div>
  );
}

export default function KeywordInspectorPage() {
  const activeApp = useActiveApp();
  const workspaceId = useWorkspaceId();
  const planSlug = usePlanSlug();
  const isLocked = !isPlanAtLeast(planSlug, "pro");

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
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [metricsError, setMetricsError] = useState<string | null>(null);
  const [apps, setApps] = useState<AppSearchResult[] | null>(null);
  const [appsLoading, setAppsLoading] = useState(false);
  const [appsError, setAppsError] = useState<string | null>(null);

  // Each inspect bumps this; a slower response from an earlier query checks
  // it before writing so it can't overwrite the newer query's results.
  const requestId = useRef(0);

  // Store/country: last used here, else the active app's, else US App Store.
  // Read after mount (localStorage is client-only).
  useEffect(() => {
    const prefs = readJson<{ store?: Store; country?: string }>(PREFS_KEY);
    /* eslint-disable react-hooks/set-state-in-effect */
    setStore(prefs?.store ?? activeApp?.store ?? "ios");
    setCountry((prefs?.country ?? activeApp?.country ?? "us").toLowerCase());
    setRecent(readJson<Recent[]>(RECENT_KEY) ?? []);
    /* eslint-enable react-hooks/set-state-in-effect */
    // Only on mount: switching apps later shouldn't clobber a choice made here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function rememberPrefs(next: { store: Store; country: string }) {
    writeJson(PREFS_KEY, next);
  }

  async function inspect(q: Recent) {
    const normTerm = q.term.trim().toLowerCase();
    if (!normTerm) return;
    const current: Recent = { term: normTerm, store: q.store, country: q.country };
    const id = ++requestId.current;

    setQuery(current);
    setMetrics(null);
    setMetricsError(null);
    setMetricsLoading(true);
    setApps(null);
    setIosSubtitles({});
    setSubtitlesLoading(false);
    setAppsError(null);
    setAppsLoading(true);

    const nextRecent = [current, ...recent.filter((r) => !(r.term === current.term && r.store === current.store && r.country === current.country))].slice(0, RECENT_LIMIT);
    setRecent(nextRecent);
    writeJson(RECENT_KEY, nextRecent);

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

    const appsPromise = (async () => {
      try {
        const results = await fetchLiveSearchResults(normTerm, current.store, current.country, undefined, true);
        if (id !== requestId.current) return;
        const top = results.slice(0, RESULTS_DISPLAY_LIMIT);
        setApps(top);
        if (current.store === "ios") loadIosSubtitles(top, current.country, id);
      } catch {
        // Live search failed (usually the store rate-limiting this browser's
        // IP). The server already ran the same search for the scores, so show
        // its results instead of an error when it has them.
        const inspection = await metricsPromise;
        if (id !== requestId.current) return;
        if (inspection?.topApps?.length) {
          setApps(inspection.topApps);
          if (current.store === "ios") loadIosSubtitles(inspection.topApps, current.country, id);
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

  function clearRecent() {
    setRecent([]);
    writeJson(RECENT_KEY, []);
  }

  const header = (
    <div className="shrink-0 flex items-center gap-3 px-6 py-4 border-b border-white/[0.07] light:border-black/[0.08]">
      <div className="size-8 rounded-xl bg-indigo-500/10 flex items-center justify-center shrink-0">
        <DocumentMagnifyingGlassIcon className="size-4 text-indigo-400 light:text-indigo-600" />
      </div>
      <div>
        <p className="text-sm font-semibold text-white light:text-gray-900 leading-tight">Keyword Inspector</p>
        <p className="text-xs text-gray-500 leading-tight">Popularity, difficulty and live search results for any keyword, in any country</p>
      </div>
    </div>
  );

  if (isLocked) {
    return (
      <div className="h-full flex flex-col overflow-hidden bg-[#111318] light:bg-[#f5f6f8]">
        {header}
        <FeatureLocked
          minPlan="pro"
          icon={DocumentMagnifyingGlassIcon}
          title="Keyword Inspector is a Pro feature"
          description="Upgrade to Pro or above to inspect any keyword in any country."
          benefits={[
            "Check popularity and difficulty for any keyword, no app needed",
            "Switch between 170+ App Store and Google Play countries",
            "See which apps rank in the top 20 right now",
          ]}
        />
      </div>
    );
  }

  const busy = metricsLoading || appsLoading;
  // Google Play's search page returns a single page of ~20-30 apps with no
  // pagination token, so its result count says nothing about competition
  // (a crowded keyword can come back with 19). Only the App Store's count,
  // up to its 200 limit, is meaningful.
  const showResultsCard = query?.store === "ios";
  // Words shared by 2+ of the top titles, and how many titles carry the
  // searched keyword itself: the strongest ranking signal you can see from
  // outside, and often a better read on direct competition than Difficulty.
  const subtitleLabel = query?.store === "android" ? "short description" : "subtitle";
  const rowSubtitles = query && apps ? apps.map((a) => subtitleFor(a, query.store, iosSubtitles)) : [];
  const hasSubtitles = rowSubtitles.some(Boolean);
  const titleMatches = query && apps ? apps.filter((a) => titleHasKeyword(a.name, query.term)).length : 0;
  const titleOrSubtitleMatches = query && apps
    ? apps.filter((a, i) => titleHasKeyword(`${a.name} ${rowSubtitles[i]}`, query.term)).length
    : 0;
  const pop = metrics ? popularityLabel(metrics.popularity) : null;
  const diff = metrics ? difficultyLabel(metrics.difficulty) : null;

  return (
    <div className="h-full flex flex-col overflow-hidden bg-[#111318] light:bg-[#f5f6f8]">
      {header}

      <div className="flex-1 overflow-y-auto">
        <div className="px-4 sm:px-6 py-6 space-y-6">
          {/* ── Query form ── */}
          <form onSubmit={onSubmit} className="rounded-2xl bg-[#1a1d24] light:bg-white p-4 space-y-3">
            <div className="flex flex-col gap-3 md:flex-row">
              <label className="relative flex-1">
                <span className="sr-only">Keyword</span>
                <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-500" />
                <input
                  value={term}
                  onChange={(e) => setTerm(e.target.value)}
                  placeholder="Enter a keyword, e.g. habit tracker"
                  maxLength={100}
                  autoFocus
                  className="w-full rounded-xl bg-[#111318] light:bg-[#f5f6f8] py-2.5 pl-9 pr-3 text-sm text-white light:text-gray-900 placeholder:text-gray-600 light:placeholder:text-gray-400 outline-none focus:ring-1 focus:ring-indigo-500/60"
                />
              </label>

              <div className="flex gap-3">
                <div className="flex rounded-xl bg-[#111318] light:bg-[#f5f6f8] p-1" role="radiogroup" aria-label="Store">
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

                <label className="relative min-w-0 flex-1 md:flex-none">
                  <span className="sr-only">Country</span>
                  {/* appearance-none + our own chevron: the native caret sits flush
                      against the edge and can't be padded. */}
                  <select
                    value={country.toUpperCase()}
                    onChange={(e) => { const c = e.target.value.toLowerCase(); setCountry(c); rememberPrefs({ store, country: c }); }}
                    className="h-full w-full md:w-52 appearance-none rounded-xl bg-[#111318] light:bg-[#f5f6f8] py-2.5 pl-3 pr-10 text-sm text-white light:text-gray-900 outline-none focus:ring-1 focus:ring-indigo-500/60"
                  >
                    {COUNTRY_OPTIONS.map((c) => (
                      <option key={c.code} value={c.code}>{countryFlag(c.code)} {c.label}</option>
                    ))}
                  </select>
                  <ChevronDownIcon className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-gray-500" />
                </label>
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
                  <button
                    key={`${r.term}-${r.store}-${r.country}`}
                    type="button"
                    disabled={busy}
                    onClick={() => onRecentClick(r)}
                    className="flex items-center gap-1 rounded-full bg-white/[0.05] light:bg-black/[0.04] px-2.5 py-1 text-xs text-gray-300 light:text-gray-700 hover:bg-white/[0.09] light:hover:bg-black/[0.07] disabled:opacity-50 transition-colors"
                  >
                    <span>{countryFlag(r.country)}</span>
                    <img src={r.store === "ios" ? "/app-store.svg" : "/google-play.svg"} alt="" className="size-3" />
                    {r.term}
                  </button>
                ))}
                <button type="button" onClick={clearRecent} aria-label="Clear recent searches" className="ml-1 rounded p-1 text-gray-600 hover:text-gray-400 light:text-gray-400 light:hover:text-gray-600">
                  <XMarkIcon className="size-3.5" />
                </button>
              </div>
            )}
          </form>

          {!query && (
            <div className="py-16 text-center">
              <DocumentMagnifyingGlassIcon className="size-10 text-gray-700 light:text-gray-300 mx-auto mb-4" />
              <p className="text-sm font-medium text-gray-400 light:text-gray-600">Inspect any keyword</p>
              <p className="mt-1 text-sm text-gray-600 light:text-gray-400 max-w-md mx-auto">
                Pick a store and country, enter a keyword, and see how popular it is, how hard it is to rank for, and which apps rank for it right now.
              </p>
            </div>
          )}

          {query && (
            <>
              {/* ── Scores ── */}
              <section>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-sm font-semibold text-white light:text-gray-900">
                    &ldquo;{query.term}&rdquo;
                    <span className="ml-2 font-normal text-gray-500">
                      {countryFlag(query.country)} {COUNTRY_MAP[query.country.toUpperCase()] ?? query.country.toUpperCase()} · {query.store === "ios" ? "App Store" : "Google Play"}
                    </span>
                  </h2>
                  {metrics && (
                    <button
                      type="button"
                      onClick={() => setShowHistory(true)}
                      className="flex items-center gap-1.5 text-xs text-indigo-400 light:text-indigo-600 hover:text-indigo-300 light:hover:text-indigo-700 transition-colors"
                    >
                      <ArrowTrendingUpIcon className="size-3.5" />
                      Popularity history
                    </button>
                  )}
                </div>

                {metricsError && (
                  <div className="flex items-center gap-2 rounded-xl bg-red-500/10 px-4 py-3 text-xs text-red-400 light:text-red-600">
                    <ExclamationTriangleIcon className="size-4 shrink-0" />
                    <span className="flex-1">{metricsError}</span>
                    <button type="button" onClick={() => inspect(query)} disabled={busy} className="font-semibold hover:underline disabled:opacity-50">Retry</button>
                  </div>
                )}

                {metricsLoading && (
                  <div className={`grid grid-cols-2 gap-3 ${showResultsCard ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
                    {Array.from({ length: showResultsCard ? 4 : 3 }).map((_, i) => <StatSkeleton key={i} />)}
                  </div>
                )}

                {metrics && pop && diff && (
                  <div className={`grid grid-cols-2 gap-3 ${showResultsCard ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
                    <StatCard label="Popularity" hint="Estimated search demand (0 to 100), from App Store and Google Play search signals. Shown as Volume in Keyword Research.">
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
                    <StatCard label="Est. daily searches" hint="A ballpark modeled from Popularity, for comparing keywords. Not a store-reported count.">
                      <span className="text-2xl font-semibold text-white light:text-gray-900">~{NUMBER_FORMATTER.format(metrics.estDailySearches)}</span>
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

              {/* ── Live search results ── */}
              <section>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                  <h2 className="text-sm font-semibold text-white light:text-gray-900">Top {RESULTS_DISPLAY_LIMIT} search results</h2>
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
                <div className="rounded-2xl bg-[#1a1d24] light:bg-white overflow-hidden">
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
                      />
                  ))}
                </div>
              </section>
            </>
          )}
        </div>
      </div>

      {showHistory && query && (
        <VolumeHistoryPanel term={query.term} store={query.store} country={query.country} onClose={() => setShowHistory(false)} />
      )}
    </div>
  );
}

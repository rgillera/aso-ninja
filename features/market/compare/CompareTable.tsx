"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  ArrowTopRightOnSquareIcon, ChevronLeftIcon, ChevronRightIcon,
  ExclamationTriangleIcon, CheckCircleIcon, StarIcon, XMarkIcon,
} from "@heroicons/react/24/outline";
import { StoreIcon } from "@/features/market/explorer/StoreIcon";
import { computeKeywordDensity } from "@/features/aso/metadata/preview/KeywordDensity";
import { daysSince } from "@/libs/store/benchmark-utils";
import type { CompareApp } from "./types";
import { compareKey, storeUrl, FIELD_LIMITS } from "./types";

type Props = {
  apps: CompareApp[];
  country: string;
  onRemove: (key: string) => void;
};

const STORE_LABEL: Record<"ios" | "android", string> = { ios: "App Store", android: "Google Play" };

// How many screenshot thumbnails show inline before collapsing the rest
// behind a "+N" tile — sized so 4 fit inside the ~220px column width
// without forcing the table wider than the other (text) columns.
const SCREENSHOT_PREVIEW_COUNT = 4;
// Roughly where a description stops fitting the row's 3-line clamp at this
// column width — just a threshold for whether "Show more" is worth showing,
// not an exact line-length calculation.
const DESCRIPTION_CLAMP_THRESHOLD = 160;
// Keyword density chips shown before collapsing the rest behind "+N more" —
// computeKeywordDensity itself already caps at its own maxRows (10).
const DENSITY_PREVIEW_COUNT = 4;
// computeKeywordDensity groups every term that repeats the same number of
// times into one row's `keywords` array — for a long description that tier
// can hold 50+ tied terms, which read fine in the full-width DensityTable
// but blow out a single chip here. Cap what's joined into one chip's text.
const DENSITY_TERMS_PER_CHIP = 6;
// An app that hasn't shipped an update in 3+ months reads as possibly
// abandoned/deprioritized — a real ASO signal when sizing up a competitor.
const STALE_DAYS_THRESHOLD = 90;

function formatRatingCount(n: number | null | undefined): string {
  if (n === null || n === undefined) return "";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function formatUpdated(ts: number | undefined): string {
  if (!ts) return "—";
  return new Date(ts).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function formatDaysAgo(days: number): string {
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days} days ago`;
  if (days < 365) { const months = Math.round(days / 30); return `${months} month${months !== 1 ? "s" : ""} ago`; }
  const years = Math.round(days / 365);
  return `${years} year${years !== 1 ? "s" : ""} ago`;
}

// Shared by Title length / Subtitle length — "maxed" (≥90% of the store's
// hard cap) is flagged positively: using the full field is the ASO-correct
// move (more room for keywords), unlike every other "higher is better" row
// this table highlights via bestIndices/emerald text.
function FieldLengthCell({ length, limit }: { length: number; limit: number }) {
  const maxed = limit > 0 && length / limit >= 0.9;
  return (
    <span className="inline-flex items-center gap-1.5">
      {length}/{limit} chars
      {maxed && (
        <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-500/10 px-1.5 py-px text-[10px] font-medium text-emerald-400">
          <CheckCircleIcon className="size-2.5" />
          Maxed
        </span>
      )}
    </span>
  );
}

// Flags the highest value in a row (e.g. rating, screenshot count) so it's
// easy to scan which app leads on that metric — skipped when there's
// nothing to distinguish (fewer than 2 real values, or every value ties).
function bestIndices(values: (number | null | undefined)[]): Set<number> {
  const nums = values.filter((v): v is number => v !== null && v !== undefined);
  if (nums.length < 2) return new Set();
  const max = Math.max(...nums);
  if (nums.every((n) => n === max)) return new Set();
  const set = new Set<number>();
  values.forEach((v, i) => { if (v === max) set.add(i); });
  return set;
}

function MetricRow({ label, cells, bestSet, wrap = false }: { label: string; cells: ReactNode[]; bestSet?: Set<number>; wrap?: boolean }) {
  return (
    <tr className="border-b border-white/[0.04]">
      <td className="sticky left-0 bg-[#1a1d24] px-4 py-3 align-top text-xs font-medium text-gray-500 whitespace-nowrap">{label}</td>
      {cells.map((cell, i) => (
        <td
          key={i}
          className={`px-4 py-3 align-top text-sm ${wrap ? "" : "whitespace-nowrap"} ${bestSet?.has(i) ? "text-emerald-400 font-medium" : "text-gray-300"}`}
        >
          {cell}
        </td>
      ))}
    </tr>
  );
}

type LightboxState = { key: string; index: number } | null;

export function CompareTable({ apps, country, onRemove }: Props) {
  const [expandedDescriptions, setExpandedDescriptions] = useState<Set<string>>(new Set());
  const [expandedDensity, setExpandedDensity] = useState<Set<string>>(new Set());
  const [lightbox, setLightbox] = useState<LightboxState>(null);

  useEffect(() => {
    if (!lightbox) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setLightbox(null);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [lightbox]);

  function toggleDescription(key: string) {
    setExpandedDescriptions((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  function toggleDensity(key: string) {
    setExpandedDensity((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  const ratings = apps.map((a) => a.storeData?.rating ?? null);
  const bestRating = bestIndices(ratings);
  const screenshotCounts = apps.map((a) => a.storeData?.screenshotUrls?.length ?? null);
  const bestScreenshots = bestIndices(screenshotCounts);
  const languageCounts = apps.map((a) => (a.storeData?.languageCount ?? null));
  const bestLanguages = bestIndices(languageCounts);
  const updatedAts = apps.map((a) => a.storeData?.lastUpdatedAt ?? null);
  const bestUpdated = bestIndices(updatedAts);

  const lightboxApp = lightbox ? apps.find((a) => compareKey(a.store, a.storeId) === lightbox.key) : undefined;
  const lightboxUrls = lightboxApp?.storeData?.screenshotUrls ?? [];

  return (
    <div className="mx-6 mb-6 rounded-xl bg-[#1a1d24] ring-1 ring-white/[0.07] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="border-collapse">
          <thead>
            <tr className="border-b border-white/[0.07]">
              <th className="sticky left-0 bg-[#1a1d24] px-4 py-3 text-left text-xs font-medium text-gray-500 w-40" />
              {apps.map((app) => {
                const key = compareKey(app.store, app.storeId);
                return (
                  <th key={key} className="px-4 py-3 text-left align-top min-w-[220px]">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="relative shrink-0">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={app.iconUrl} alt="" className="size-9 rounded-lg bg-white/[0.05]" />
                          <span className="absolute -bottom-1 -right-1 flex size-4 items-center justify-center rounded-full bg-[#1a1d24] ring-1 ring-white/10">
                            <StoreIcon store={app.store} className="size-2.5 text-gray-300" />
                          </span>
                        </div>
                        <div className="min-w-0">
                          <a
                            href={storeUrl(app, country)}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1 text-sm font-medium text-white hover:text-indigo-300 transition-colors group"
                            title="Open store listing"
                          >
                            <span className="truncate">{app.name}</span>
                            <ArrowTopRightOnSquareIcon className="size-3 shrink-0 text-gray-600 group-hover:text-indigo-300 transition-colors" />
                          </a>
                          <p className="text-xs text-gray-600 truncate">{app.developer}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => onRemove(key)}
                        className="shrink-0 rounded p-1 text-gray-600 hover:bg-white/[0.08] hover:text-white transition-colors"
                        aria-label={`Remove ${app.name}`}
                      >
                        <XMarkIcon className="size-3.5" />
                      </button>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            <MetricRow
              label="Store"
              cells={apps.map((a) => (
                <span key={compareKey(a.store, a.storeId)} className="inline-flex items-center gap-1.5 text-xs text-gray-400">
                  <StoreIcon store={a.store} className="size-3" />
                  {STORE_LABEL[a.store]}
                </span>
              ))}
            />
            <MetricRow label="Category" cells={apps.map((a) => cellFor(a, (d) => d.primaryGenreName || "—"))} />
            <MetricRow
              label="Rating"
              bestSet={bestRating}
              cells={apps.map((a) => cellFor(a, (d) =>
                d.rating != null ? (
                  <span className="inline-flex items-center gap-1">
                    <StarIcon className="size-3.5 text-amber-400 shrink-0" />
                    {d.rating.toFixed(1)}
                    {d.ratingCount != null && <span className="text-xs text-gray-600">({formatRatingCount(d.ratingCount)})</span>}
                  </span>
                ) : "—"
              ))}
            />
            <MetricRow label="Content rating" cells={apps.map((a) => cellFor(a, (d) => d.contentAdvisoryRating || "—"))} />
            <MetricRow label="Version" cells={apps.map((a) => cellFor(a, (d) => d.version || "—"))} />
            <MetricRow
              label="Screenshots"
              bestSet={bestScreenshots}
              cells={apps.map((a) => cellFor(a, (d) => {
                const urls = d.screenshotUrls ?? [];
                if (urls.length === 0) return "—";
                const key = compareKey(a.store, a.storeId);
                const shown = urls.slice(0, SCREENSHOT_PREVIEW_COUNT);
                const extra = urls.length - shown.length;
                return (
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1">
                      {shown.map((url, i) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={url}
                          src={url}
                          alt=""
                          onClick={() => setLightbox({ key, index: i })}
                          className="size-10 shrink-0 rounded-md object-cover bg-white/[0.05] ring-1 ring-white/[0.08] cursor-zoom-in hover:ring-indigo-400/60 transition-all"
                        />
                      ))}
                      {extra > 0 && (
                        <button
                          onClick={() => setLightbox({ key, index: SCREENSHOT_PREVIEW_COUNT })}
                          className="flex size-10 shrink-0 items-center justify-center rounded-md bg-white/[0.04] ring-1 ring-white/[0.08] text-xs text-gray-400 hover:text-white hover:ring-white/20 transition-colors"
                        >
                          +{extra}
                        </button>
                      )}
                    </div>
                    <span className="text-[11px]">{urls.length} screenshot{urls.length !== 1 ? "s" : ""}</span>
                  </div>
                );
              }))}
            />
            <MetricRow label="Preview video" cells={apps.map((a) => cellFor(a, (d) => (d.hasPreviewVideo ? "Yes" : "No")))} />
            <MetricRow
              label="Languages"
              bestSet={bestLanguages}
              cells={apps.map((a) => cellFor(a, (d) => (d.languageCount != null ? String(d.languageCount) : "—")))}
            />
            <MetricRow
              label="Last updated"
              bestSet={bestUpdated}
              cells={apps.map((a) => cellFor(a, (d) => {
                const days = daysSince(d.lastUpdatedAt);
                if (days === undefined) return "—";
                const stale = days >= STALE_DAYS_THRESHOLD;
                return (
                  <span className="inline-flex items-center gap-1.5" title={formatUpdated(d.lastUpdatedAt)}>
                    {formatDaysAgo(days)}
                    {stale && (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-500/10 px-1.5 py-px text-[10px] font-medium text-amber-400">
                        <ExclamationTriangleIcon className="size-2.5" />
                        Stale
                      </span>
                    )}
                  </span>
                );
              }))}
            />
            <MetricRow
              label="Title length"
              cells={apps.map((a) => (
                <FieldLengthCell key={compareKey(a.store, a.storeId)} length={a.name.length} limit={FIELD_LIMITS[a.store].name} />
              ))}
            />
            <MetricRow
              label="Subtitle length"
              cells={apps.map((a) => cellFor(a, (d) => (
                d.subtitle ? <FieldLengthCell length={d.subtitle.length} limit={FIELD_LIMITS[a.store].subtitle} /> : "—"
              )))}
            />
            <MetricRow
              label="Subtitle"
              wrap
              cells={apps.map((a) => cellFor(a, (d) => (
                <span className="block max-w-[280px]" title={d.subtitle}>{d.subtitle || "—"}</span>
              )))}
            />
            <MetricRow
              label="Description"
              wrap
              cells={apps.map((a) => cellFor(a, (d) => {
                const text = d.description?.trim() ?? "";
                if (!text) return "—";
                const key = compareKey(a.store, a.storeId);
                const expanded = expandedDescriptions.has(key);
                return (
                  <div className="max-w-[280px]">
                    <p className={expanded ? "whitespace-pre-line" : "line-clamp-3"}>{text}</p>
                    {(expanded || text.length > DESCRIPTION_CLAMP_THRESHOLD) && (
                      <button
                        onClick={() => toggleDescription(key)}
                        className="mt-1 text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
                      >
                        {expanded ? "Show less" : "Show more"}
                      </button>
                    )}
                  </div>
                );
              }))}
            />
            <MetricRow
              label="Keyword density"
              wrap
              cells={apps.map((a) => cellFor(a, (d) => {
                const text = d.description?.trim() ?? "";
                const rows = text ? computeKeywordDensity(text) : [];
                if (rows.length === 0) return <span className="text-gray-600">Not enough text to analyze</span>;
                const key = compareKey(a.store, a.storeId);
                const expanded = expandedDensity.has(key);
                const shown = expanded ? rows : rows.slice(0, DENSITY_PREVIEW_COUNT);
                return (
                  <div className="max-w-[280px]">
                    <div className="flex flex-wrap gap-1">
                      {shown.map((row) => {
                        const terms = row.keywords.slice(0, DENSITY_TERMS_PER_CHIP);
                        const extraTerms = row.keywords.length - terms.length;
                        return (
                          <span
                            key={row.keywords.join(",")}
                            // rounded-lg (not rounded-full) — a pill shape distorts into a
                            // blob once the joined term list wraps to more than one line.
                            className="inline-flex items-start gap-1.5 rounded-lg bg-white/[0.05] ring-1 ring-white/[0.08] px-2 py-1 text-[11px] text-gray-300"
                          >
                            <span>{terms.join(", ")}{extraTerms > 0 ? `, +${extraTerms} more` : ""}</span>
                            <span className="shrink-0 text-gray-500">{row.density.toFixed(1)}%</span>
                          </span>
                        );
                      })}
                    </div>
                    {rows.length > DENSITY_PREVIEW_COUNT && (
                      <button
                        onClick={() => toggleDensity(key)}
                        className="mt-1 text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
                      >
                        {expanded ? "Show less" : `+${rows.length - DENSITY_PREVIEW_COUNT} more`}
                      </button>
                    )}
                  </div>
                );
              }))}
            />
          </tbody>
        </table>
      </div>

      {lightbox && lightboxApp && lightboxUrls.length > 0 && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6"
          onClick={() => setLightbox(null)}
        >
          <div className="absolute top-4 left-4 flex items-center gap-2 text-sm text-gray-300">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={lightboxApp.iconUrl} alt="" className="size-6 rounded-md" />
            <span>{lightboxApp.name}</span>
            <span className="text-gray-600">{lightbox.index + 1} / {lightboxUrls.length}</span>
          </div>

          <button
            onClick={(e) => { e.stopPropagation(); setLightbox(null); }}
            className="absolute top-4 right-4 rounded-full p-2 text-gray-300 hover:bg-white/10 hover:text-white transition-colors"
            aria-label="Close"
          >
            <XMarkIcon className="size-5" />
          </button>

          {lightboxUrls.length > 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); setLightbox((prev) => prev && { ...prev, index: (prev.index - 1 + lightboxUrls.length) % lightboxUrls.length }); }}
              className="absolute left-4 rounded-full p-2 text-gray-300 hover:bg-white/10 hover:text-white transition-colors"
              aria-label="Previous screenshot"
            >
              <ChevronLeftIcon className="size-6" />
            </button>
          )}

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightboxUrls[lightbox.index]}
            alt=""
            onClick={(e) => e.stopPropagation()}
            className="max-h-[85vh] max-w-[85vw] rounded-xl object-contain shadow-2xl"
          />

          {lightboxUrls.length > 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); setLightbox((prev) => prev && { ...prev, index: (prev.index + 1) % lightboxUrls.length }); }}
              className="absolute right-4 rounded-full p-2 text-gray-300 hover:bg-white/10 hover:text-white transition-colors"
              aria-label="Next screenshot"
            >
              <ChevronRightIcon className="size-6" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// Renders a metric cell from an app's storeData, covering the three states
// every row shares: still loading, failed/unavailable, and a real value.
function cellFor(app: CompareApp, render: (d: NonNullable<CompareApp["storeData"]>) => ReactNode): ReactNode {
  if (app.loading) return <span className="inline-block h-3.5 w-16 rounded bg-white/[0.06] animate-pulse" />;
  if (app.failed || !app.storeData) return <span className="text-gray-600">—</span>;
  return render(app.storeData);
}

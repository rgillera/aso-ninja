"use client";

import type { ReactNode } from "react";
import { ArrowTopRightOnSquareIcon, StarIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { StoreIcon } from "@/features/market/explorer/StoreIcon";
import type { CompareApp } from "./types";
import { compareKey, storeUrl } from "./types";

type Props = {
  apps: CompareApp[];
  country: string;
  onRemove: (key: string) => void;
};

const STORE_LABEL: Record<"ios" | "android", string> = { ios: "App Store", android: "Google Play" };

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

function MetricRow({ label, cells, bestSet }: { label: string; cells: ReactNode[]; bestSet?: Set<number> }) {
  return (
    <tr className="border-b border-white/[0.04]">
      <td className="sticky left-0 bg-[#1a1d24] px-4 py-3 text-xs font-medium text-gray-500 whitespace-nowrap">{label}</td>
      {cells.map((cell, i) => (
        <td
          key={i}
          className={`px-4 py-3 text-sm whitespace-nowrap ${bestSet?.has(i) ? "text-emerald-400 font-medium" : "text-gray-300"}`}
        >
          {cell}
        </td>
      ))}
    </tr>
  );
}

export function CompareTable({ apps, country, onRemove }: Props) {
  const ratings = apps.map((a) => a.storeData?.rating ?? null);
  const bestRating = bestIndices(ratings);
  const screenshotCounts = apps.map((a) => a.storeData?.screenshotUrls?.length ?? null);
  const bestScreenshots = bestIndices(screenshotCounts);
  const languageCounts = apps.map((a) => (a.storeData?.languageCount ?? null));
  const bestLanguages = bestIndices(languageCounts);
  const updatedAts = apps.map((a) => a.storeData?.lastUpdatedAt ?? null);
  const bestUpdated = bestIndices(updatedAts);

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
              cells={apps.map((a) => cellFor(a, (d) => String(d.screenshotUrls?.length ?? 0)))}
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
              cells={apps.map((a) => cellFor(a, (d) => formatUpdated(d.lastUpdatedAt)))}
            />
            <MetricRow
              label="Subtitle"
              cells={apps.map((a) => cellFor(a, (d) => (
                <span className="block max-w-[260px] truncate" title={d.subtitle}>{d.subtitle || "—"}</span>
              )))}
            />
            <MetricRow
              label="Description"
              cells={apps.map((a) => cellFor(a, (d) => `${d.description?.length ?? 0} chars`))}
            />
          </tbody>
        </table>
      </div>
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

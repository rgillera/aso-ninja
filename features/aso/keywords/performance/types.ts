import type { RankValue, TermSnapshot, PerformanceSnapshotResult } from "@/app/api/keywords/performance-snapshots/route";
import type { VisibilityPoint, VisibilityHistoryResult } from "@/app/api/keywords/visibility-history/route";

export type { RankValue, TermSnapshot, PerformanceSnapshotResult, VisibilityPoint, VisibilityHistoryResult };

// Cycled across our app + competitors in the Visibility Score chart.
export const SERIES_COLORS = ["#2dd4bf", "#a78bfa", "#fb923c", "#60a5fa", "#f472b6", "#facc15"];

export type PerformanceKeyword = {
  term: string;
  volume: number;
  rank: number | null;
  starred: boolean;
  loading: boolean;
};

export type DateRange = { from: string; to: string };

export function todayIso(): string {
  return new Date().toISOString().split("T")[0];
}

// Defaults to today→today: with no history yet, a wide range just shows
// dashes. Widen it yourself once snapshots have had time to accumulate.
export const DEFAULT_RANGE: DateRange = { from: todayIso(), to: todayIso() };

export function formatRank(v: RankValue | undefined): string {
  if (v === undefined || v === "unknown" || v === "unranked") return "Unranked";
  return `#${v}`;
}

// "unknown" means keyword_rankings_history has no row at all for this term
// yet (never synced from this page) — fall back to the cached rank from
// keyword_metrics so we don't show "Unranked" for a keyword we do have a
// rank for. "unranked" is a real, distinct result (a sync ran and found
// nothing) and must win over the cached fallback, not be overridden by it.
export function effectiveRank(snapshotValue: RankValue | undefined, fallback: number | null | undefined): RankValue {
  if (snapshotValue === undefined || snapshotValue === "unknown") return fallback ?? "unknown";
  return snapshotValue;
}

// The snapshot date only describes snapshotValue, not the keyword_metrics
// fallback effectiveRank() may return instead — pairing it with a fallback
// rank would label an unrelated cached value with a misleading date.
export function effectiveRankDate(snapshotValue: RankValue | undefined, date: string | null | undefined): string | null {
  if (snapshotValue === undefined || snapshotValue === "unknown") return null;
  return date ?? null;
}

export function rankGrowth(prev: RankValue | undefined, latest: RankValue | undefined): number | null {
  if (typeof prev !== "number" || typeof latest !== "number") return null;
  return prev - latest; // positive = moved up (improved)
}

export function volumeGrowth(prev: number | null | undefined, latest: number | null | undefined): number | null {
  if (prev == null || latest == null) return null;
  return latest - prev;
}

export function formatSnapshotDate(date: string | null): string {
  if (!date) return "";
  const d = new Date(date + "T00:00:00");
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

export type Filters = {
  query: string;
  volumeMin: number;
  volumeMax: number;
  rankMin: number;
  rankMax: number;
  starredOnly: boolean;
  type: "all" | "branded" | "generic";
  wordCount: "all" | 1 | 2 | 3;
};

export const DEFAULT_FILTERS: Filters = {
  query: "",
  volumeMin: 0,
  volumeMax: 100,
  rankMin: 1,
  rankMax: 200,
  starredOnly: false,
  type: "all",
  wordCount: "all",
};

export function isFiltersDefault(f: Filters): boolean {
  return JSON.stringify(f) === JSON.stringify(DEFAULT_FILTERS);
}

export function isBranded(term: string, appName: string): boolean {
  const nameTokens = new Set(
    appName.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((w) => w.length >= 3)
  );
  if (!nameTokens.size) return false;
  return term.toLowerCase().split(/\s+/).some((w) => nameTokens.has(w));
}

export function wordCount(term: string): 1 | 2 | 3 {
  const n = term.trim().split(/\s+/).filter(Boolean).length;
  return n >= 3 ? 3 : (n as 1 | 2);
}

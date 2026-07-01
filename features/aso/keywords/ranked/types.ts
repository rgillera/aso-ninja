import type { RankedKeyword, RankedHistoryPoint } from "@/app/api/keywords/ranked/route";

export type { RankedKeyword, RankedHistoryPoint };

export type Filters = {
  query: string;
  volumeMin: number;
  volumeMax: number;
  rankMin: number;
  rankMax: number;
  type: "all" | "branded" | "generic";
  wordCount: "all" | 1 | 2 | 3;
};

export const DEFAULT_FILTERS: Filters = {
  query: "",
  volumeMin: 0,
  volumeMax: 100,
  rankMin: 1,
  rankMax: 200,
  type: "all",
  wordCount: "all",
};

export function isFiltersDefault(f: Filters): boolean {
  return JSON.stringify(f) === JSON.stringify(DEFAULT_FILTERS);
}

export function isBranded(term: string, appName: string): boolean {
  const tokens = new Set(
    appName.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((w) => w.length >= 3)
  );
  if (!tokens.size) return false;
  return term.toLowerCase().split(/\s+/).some((w) => tokens.has(w));
}

export function wordCount(term: string): 1 | 2 | 3 {
  const n = term.trim().split(/\s+/).filter(Boolean).length;
  return n >= 3 ? 3 : (n as 1 | 2);
}

export function rankDelta(prev: number | null, latest: number): number | null {
  if (prev === null) return null;
  return prev - latest; // positive = moved up (rank number decreased)
}

export function formatDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

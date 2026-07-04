import type { RankedKeyword, RankedHistoryPoint } from "@/app/api/keywords/ranked/route";

export type { RankedKeyword, RankedHistoryPoint };

export type Filters = {
  query: string;
  volumeMin: number;
  volumeMax: number;
  rankMin: number;
  rankMax: number;
  wordCount: "all" | 1 | 2 | 3;
};

export const DEFAULT_FILTERS: Filters = {
  query: "",
  volumeMin: 0,
  volumeMax: 100,
  rankMin: 1,
  rankMax: 200,
  wordCount: "all",
};

export function isFiltersDefault(f: Filters): boolean {
  return JSON.stringify(f) === JSON.stringify(DEFAULT_FILTERS);
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

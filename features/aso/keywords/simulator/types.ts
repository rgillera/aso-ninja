import type { SavedKeyword } from "@/app/api/keywords/list/route";

export type SimulatedResult = { relevancy: number; opportunity: number | null; intentThemeId: string | null };

export type SimulatorRow = {
  term: string;
  currentRelevancy: number | null;
  currentOpportunity: number | null;
  simulatedRelevancy: number | null;
  simulatedOpportunity: number | null;
};

export type { SavedKeyword };

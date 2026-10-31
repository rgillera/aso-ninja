import type { SavedKeyword } from "@/app/api/keywords/list/route";
import type { Coverage, Density } from "./coverage";

export type SimulatorRow = {
  term: string;
  volume: number;
  rank: number | null;
  relevancy: number | null;
  currentCoverage: Coverage;
  simulatedCoverage: Coverage;
  // Android only: the keyword's density in the live vs. edited full
  // description. null on iOS.
  currentDensity: Density | null;
  simulatedDensity: Density | null;
};

export type { SavedKeyword };

import type { SavedKeyword } from "@/app/api/keywords/list/route";
import type { Coverage } from "./coverage";

export type SimulatorRow = {
  term: string;
  volume: number;
  rank: number | null;
  relevancy: number | null;
  currentCoverage: Coverage;
  simulatedCoverage: Coverage;
};

export type { SavedKeyword };

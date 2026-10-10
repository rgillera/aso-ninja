"use client";

import { createContext, useContext } from "react";
import type { PlanSlug } from "@/libs/contracts";

const PlanContext = createContext<PlanSlug>("free");

export const PlanProvider = PlanContext.Provider;

export function usePlanSlug() {
  return useContext(PlanContext);
}

// The active workspace's plans.competitor_limit (null = unlimited). Mirrors
// the DB trigger (enforce_competitor_limit) so pickers can stop a selection
// before the save gets rejected. Defaults to the Free plan's 1.
const CompetitorLimitContext = createContext<number | null>(1);

export const CompetitorLimitProvider = CompetitorLimitContext.Provider;

export function useCompetitorLimit() {
  return useContext(CompetitorLimitContext);
}

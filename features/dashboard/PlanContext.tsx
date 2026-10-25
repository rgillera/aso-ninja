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

// When the active workspace owner's signup Pro trial ends (ISO), while it's
// still running; null otherwise. The plan slug above already reads "pro"
// during it, so this is only for trial-specific copy and the countdown.
const TrialEndsAtContext = createContext<string | null>(null);

export const TrialEndsAtProvider = TrialEndsAtContext.Provider;

export function useTrialEndsAt() {
  return useContext(TrialEndsAtContext);
}

// Whole days left, rounded up, so the last day reads "1 day left".
export function trialDaysLeft(trialEndsAt: string) {
  return Math.max(1, Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / 86_400_000));
}

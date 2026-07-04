"use client";

import { createContext, useContext } from "react";
import type { PlanSlug } from "@/libs/contracts";

const PlanContext = createContext<PlanSlug>("free");

export const PlanProvider = PlanContext.Provider;

export function usePlanSlug() {
  return useContext(PlanContext);
}

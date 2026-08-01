"use client";

import { createContext, useContext } from "react";
import type { App } from "@/libs/contracts";

const AllAppsContext = createContext<App[]>([]);

export const AllAppsProvider = AllAppsContext.Provider;

/** Every followed app across every workspace the user belongs to — filter by workspace/bundle_id/store as needed. */
export function useAllApps() {
  return useContext(AllAppsContext);
}

"use client";

import { createContext, useContext } from "react";
import type { RecentEntry } from "./recentApps";

type SelectAppFn = (entry: Omit<RecentEntry, "timestamp">) => void;

const SelectAppContext = createContext<SelectAppFn>(() => {});

export const SelectAppProvider = SelectAppContext.Provider;

/** Marks `entry` as the active app (cookie + in-place context) without navigating. */
export function useSelectApp() {
  return useContext(SelectAppContext);
}

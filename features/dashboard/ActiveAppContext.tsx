"use client";

import { createContext, useContext } from "react";

export type ActiveApp = {
  id?: string;
  bundle_id?: string;
  store_id?: string;
  name: string;
  icon_url: string | null;
  store: "ios" | "android";
  country?: string | null;
  // apps.created_at — when this app was first followed. Undefined for a
  // previewed-but-not-yet-tracked app (there's no apps row yet). Used by
  // Export Report to tell "no data because this predates tracking" apart
  // from a genuine gap — see exportReport.ts's appTrackedSince.
  created_at?: string;
};

const ActiveAppContext = createContext<ActiveApp | undefined>(undefined);

export const ActiveAppProvider = ActiveAppContext.Provider;

export function useActiveApp() {
  return useContext(ActiveAppContext);
}

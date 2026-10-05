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

// True until DashboardShell has finished restoring the last-viewed app from
// localStorage (client-only, so it can't happen on the first render). Pages
// use it to show a loading state instead of flashing "No apps yet".
const ActiveAppResolvingContext = createContext(false);

export const ActiveAppResolvingProvider = ActiveAppResolvingContext.Provider;

export function useActiveAppResolving() {
  return useContext(ActiveAppResolvingContext);
}

export function ActiveAppLoading() {
  return (
    <div className="h-full flex items-center justify-center bg-[#111318] light:bg-[#f5f6f8]">
      <div className="flex flex-col items-center gap-3">
        <span className="size-6 rounded-full border-2 border-gray-600 light:border-gray-300 border-t-indigo-400 light:border-t-indigo-600 animate-spin" />
        <p className="text-sm text-gray-500">Please wait...</p>
      </div>
    </div>
  );
}

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
};

const ActiveAppContext = createContext<ActiveApp | undefined>(undefined);

export const ActiveAppProvider = ActiveAppContext.Provider;

export function useActiveApp() {
  return useContext(ActiveAppContext);
}

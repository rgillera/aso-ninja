"use client";

import { createContext, useContext } from "react";

type SidebarTourState = { active: boolean; onAdvance: () => void };

type SidebarTourValue = SidebarTourState & {
  setSidebarTour: (state: SidebarTourState) => void;
};

const NOOP_STATE: SidebarTourState = { active: false, onAdvance: () => {} };

const SidebarTourContext = createContext<SidebarTourValue>({
  ...NOOP_STATE,
  setSidebarTour: () => {},
});

export const SidebarTourProvider = SidebarTourContext.Provider;

/**
 * Lets a page (currently just Keywords Research's onboarding coach mark)
 * highlight the sidebar and hand it a dismiss handler for the tour's last
 * step. Needed because DashboardSidebar and the page that drives the tour
 * are siblings under DashboardShell, not parent/child — a plain prop can't
 * cross that gap, so DashboardShell holds the state and both sides reach it
 * through this context. Mirrors NavigationGuardContext's shape (read value +
 * setter bundled into one context value).
 */
export function useSidebarTour() {
  return useContext(SidebarTourContext);
}

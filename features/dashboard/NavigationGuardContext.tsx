"use client";

import { createContext, useContext } from "react";

type NavigationGuardValue = {
  guardMessage: string | null;
  setGuardMessage: (message: string | null) => void;
};

const NavigationGuardContext = createContext<NavigationGuardValue>({
  guardMessage: null,
  setGuardMessage: () => {},
});

export const NavigationGuardProvider = NavigationGuardContext.Provider;

/** Lets a page register/clear a reason to confirm before the user navigates away (e.g. a save still in flight). */
export function useNavigationGuard() {
  return useContext(NavigationGuardContext);
}

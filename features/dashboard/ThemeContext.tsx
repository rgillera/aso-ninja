"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Theme = "dark" | "light";

export const THEME_COOKIE = "theme";
// A year, not the usual 30-day cookie lifetime elsewhere in this file's
// neighbors (lastAppId, etc.) — this is a standing preference, not a
// last-visited pointer that's fine to lose after a month of inactivity.
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

type ThemeContextValue = {
  theme: Theme;
  toggleTheme: () => void;
  /** Sets the theme directly rather than flipping it — for a two-option control (e.g. an explicit Light/Dark picker) instead of a single toggle button. */
  setTheme: (next: Theme) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
}

type Props = {
  /** From the `theme` cookie, read server-side in app/dashboard/layout.tsx. */
  initialTheme: Theme;
  children: ReactNode;
};

// Reflects `theme` onto <html data-theme="..."> rather than some wrapper
// further down the tree — every `light:` Tailwind class (see the
// @custom-variant in globals.css) matches `[data-theme="light"] *`, and
// OnboardingWizard/TourTooltip render via createPortal straight into
// document.body, outside DashboardShell's own DOM subtree. <html> is the one
// ancestor guaranteed to sit above document.body regardless, so it's the
// only place this can live and still reach portaled content.
//
// app/dashboard/layout.tsx also inlines a synchronous <script> setting this
// same attribute from the cookie before hydration, so a light-mode session
// (the product default, absent a "dark" cookie) doesn't see a flash of the
// CSS's built-in dark styling on first paint — this effect is what keeps it
// in sync afterward (the toggle, and re-renders).
export function ThemeProvider({ initialTheme, children }: Props) {
  const [theme, setThemeState] = useState<Theme>(initialTheme);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  function setTheme(next: Theme) {
    document.cookie = `${THEME_COOKIE}=${next}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
    setThemeState(next);
  }

  function toggleTheme() {
    setTheme(theme === "dark" ? "light" : "dark");
  }

  return <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>{children}</ThemeContext.Provider>;
}

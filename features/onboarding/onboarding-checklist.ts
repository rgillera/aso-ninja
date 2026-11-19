export type OnboardingState = {
  /** True once the first-run wizard is done or dismissed. */
  seen: boolean;
};

export function onboardingKey(workspaceId: string) {
  return `aso_onboarding_${workspaceId}`;
}

export function loadOnboarding(workspaceId: string): OnboardingState | null {
  try {
    const raw = localStorage.getItem(onboardingKey(workspaceId));
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

// Cookie mirror of `seen`, so the dashboard layout (server) can tell a
// brand-new workspace from one that already onboarded and then removed all
// its apps, and render the wizard's cover in the very first HTML instead of
// flashing the dashboard underneath until the client catches up.
export function onboardedCookieName(workspaceId: string) {
  return `aso_onboarded_${workspaceId}`;
}

export function saveOnboarding(workspaceId: string, state: OnboardingState) {
  try {
    localStorage.setItem(onboardingKey(workspaceId), JSON.stringify(state));
  } catch { /* no-op outside browser */ }
  if (state.seen) {
    try {
      document.cookie = `${onboardedCookieName(workspaceId)}=1; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    } catch { /* no-op outside browser */ }
  }
}

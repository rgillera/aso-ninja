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

export function saveOnboarding(workspaceId: string, state: OnboardingState) {
  try {
    localStorage.setItem(onboardingKey(workspaceId), JSON.stringify(state));
  } catch { /* no-op outside browser */ }
}

// Suggestions are recomputed fresh on every report page load (deterministic
// checks run client-side, LLM ones come from a cached-but-still-regenerable
// route) — dismissals aren't part of that data, so they're tracked here by
// title, scoped per app, purely client-side.
function storageKey(appId: string): string {
  return `aso_dismissed_suggestions_${appId}`;
}

export function loadDismissedSuggestions(appId: string): string[] {
  try {
    return JSON.parse(localStorage.getItem(storageKey(appId)) ?? "[]");
  } catch {
    return [];
  }
}

export function dismissSuggestion(appId: string, title: string): void {
  const existing = loadDismissedSuggestions(appId);
  if (existing.includes(title)) return;
  localStorage.setItem(storageKey(appId), JSON.stringify([...existing, title]));
}

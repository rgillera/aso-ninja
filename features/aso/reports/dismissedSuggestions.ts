// Dismissals are stored in a cookie (not localStorage) so the report page's
// server component can read the same value and pass an already-correct
// initial list to ReportSuggestions — otherwise the server would always
// render "nothing dismissed", and the client's first paint would briefly
// show dismissed items before a client-only effect filtered them out.
//
// Keyed by bundleId+store rather than the tracked app id: an untracked
// preview and its later-tracked counterpart are the same underlying app and
// should share dismissals, and every untracked preview shares one synthetic
// "__preview__" app id, so keying on that would collide across apps.
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

function sanitize(value: string): string {
  return value.replace(/[^a-zA-Z0-9]/g, "_");
}

export function dismissedSuggestionsCookieName(bundleId: string, store: string): string {
  return `aso_dismissed_${store}_${sanitize(bundleId)}`;
}

// Server and client share this: on the server, `cookies().get(name)?.value`
// from next/headers is already url-decoded, same as what this expects.
export function parseDismissedSuggestionsCookie(value: string | undefined | null): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

// Client-side only — persists the dismissal and returns the updated list for
// the caller to put straight into React state.
export function dismissSuggestion(bundleId: string, store: string, title: string, current: string[]): string[] {
  const updated = current.includes(title) ? current : [...current, title];
  const name = dismissedSuggestionsCookieName(bundleId, store);
  document.cookie = `${name}=${encodeURIComponent(JSON.stringify(updated))}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
  return updated;
}

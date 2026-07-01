const key = (appId: string) => `starred-kw-${appId}`;

export function getStarred(appId: string): Set<string> {
  try {
    const raw = localStorage.getItem(key(appId));
    return new Set<string>(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

export function toggleStarred(appId: string, term: string): boolean {
  const set = getStarred(appId);
  const lower = term.toLowerCase();
  if (set.has(lower)) set.delete(lower);
  else set.add(lower);
  try { localStorage.setItem(key(appId), JSON.stringify([...set])); } catch {}
  return set.has(lower);
}

export function starTerms(appId: string, terms: string[]): void {
  const set = getStarred(appId);
  terms.forEach((t) => set.add(t.toLowerCase()));
  try { localStorage.setItem(key(appId), JSON.stringify([...set])); } catch {}
}

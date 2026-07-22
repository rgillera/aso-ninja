const KEY = "keyword-table-columns";

// null means "never customized" — callers fall back to computed defaults in
// that case, rather than treating an empty array as "hide everything".
export function getVisibleColumns(): Set<string> | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? new Set<string>(JSON.parse(raw) as string[]) : null;
  } catch {
    return null;
  }
}

export function saveVisibleColumns(cols: Set<string>): void {
  try { localStorage.setItem(KEY, JSON.stringify([...cols])); } catch {}
}

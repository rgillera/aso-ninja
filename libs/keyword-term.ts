// The one stored form of a keyword. Lowercasing and trimming alone let
// "pet  reminder" or "pet\u00A0reminder" (pasted, or from an AI suggestion)
// become a second keyword that renders identically to "pet reminder", since
// HTML collapses the whitespace. Mirrors normalize_keyword_term() in SQL.
export function normalizeTerm(term: string): string {
  return term
    .normalize("NFKC")
    .replace(/[\u200B-\u200D\u2060\uFEFF]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

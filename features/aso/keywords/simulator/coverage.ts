// Which tracked keywords a title/subtitle pair puts in the store's search
// index, and where. This is what a title edit actually changes: the stores
// rank on indexed words, with the title weighted above the subtitle, and a
// multi-word keyword still counts when its words are split across the two
// fields. Relevancy (does the app serve the searcher) doesn't move with
// wording, so the simulator compares this instead.

export type Coverage = "title" | "split" | "subtitle" | "partial" | "none";

// Higher = stronger ranking signal.
export const COVERAGE_STRENGTH: Record<Coverage, number> = { title: 4, split: 3, subtitle: 2, partial: 1, none: 0 };

// Scripts written without spaces between words: tokens there can't be
// matched as whole words, so they fall back to a substring check.
const UNSPACED_SCRIPT = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}\p{Script=Thai}]/u;

// Lowercased words, split on anything that isn't a letter/number (Unicode
// aware, so non-Latin text isn't shredded), with a simple plural fold so
// "trackers" covers "tracker" the way the stores treat them.
function tokens(text: string): string[] {
  return text.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean).map(singular);
}

function singular(word: string): string {
  return word.length > 3 && word.endsWith("s") && !word.endsWith("ss") ? word.slice(0, -1) : word;
}

function inField(token: string, fieldTokens: Set<string>, fieldText: string): boolean {
  if (fieldTokens.has(token)) return true;
  return UNSPACED_SCRIPT.test(token) && fieldText.includes(token);
}

export function keywordCoverage(keyword: string, title: string, subtitle: string): Coverage {
  const kw = tokens(keyword);
  if (!kw.length) return "none";
  const titleText = title.toLowerCase();
  const subtitleText = subtitle.toLowerCase();
  const titleTokens = new Set(tokens(title));
  const subtitleTokens = new Set(tokens(subtitle));

  const inTitle = kw.map((t) => inField(t, titleTokens, titleText));
  const inSubtitle = kw.map((t) => inField(t, subtitleTokens, subtitleText));

  if (inTitle.every(Boolean)) return "title";
  if (inSubtitle.every(Boolean)) return "subtitle";
  if (kw.every((_, i) => inTitle[i] || inSubtitle[i])) return "split";
  if (kw.some((_, i) => inTitle[i] || inSubtitle[i])) return "partial";
  return "none";
}

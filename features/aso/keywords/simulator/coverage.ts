// Which tracked keywords a title/subtitle pair (plus, on iOS, the hidden
// keyword field) puts in the store's search index, and where. This is what a
// title edit actually changes: the stores rank on indexed words, with the
// title weighted above the subtitle and the subtitle above the keyword field,
// and a multi-word keyword still counts when its words are split across
// fields. Relevancy (does the app serve the searcher) doesn't move with
// wording, so the simulator compares this instead.

// "keywordField": every word is indexed, but only with the keyword field's
// help (all in it, or split between it and the title/subtitle).
export type Coverage = "title" | "split" | "subtitle" | "keywordField" | "partial" | "none";

// Higher = stronger ranking signal.
export const COVERAGE_STRENGTH: Record<Coverage, number> = { title: 5, split: 4, subtitle: 3, keywordField: 2, partial: 1, none: 0 };

// Apple's limit for the iOS keyword field.
export const KEYWORD_FIELD_LIMIT = 100;

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

// `keywordField`: iOS only; "" elsewhere.
export function keywordCoverage(keyword: string, title: string, subtitle: string, keywordField = ""): Coverage {
  const kw = tokens(keyword);
  if (!kw.length) return "none";
  const titleText = title.toLowerCase();
  const subtitleText = subtitle.toLowerCase();
  const titleTokens = new Set(tokens(title));
  const subtitleTokens = new Set(tokens(subtitle));

  const keywordFieldText = keywordField.toLowerCase();
  const keywordFieldTokens = new Set(tokens(keywordField));

  const inTitle = kw.map((t) => inField(t, titleTokens, titleText));
  const inSubtitle = kw.map((t) => inField(t, subtitleTokens, subtitleText));
  const inKeywordField = kw.map((t) => inField(t, keywordFieldTokens, keywordFieldText));

  if (inTitle.every(Boolean)) return "title";
  if (inSubtitle.every(Boolean)) return "subtitle";
  if (kw.every((_, i) => inTitle[i] || inSubtitle[i])) return "split";
  if (kw.every((_, i) => inTitle[i] || inSubtitle[i] || inKeywordField[i])) return "keywordField";
  if (kw.some((_, i) => inTitle[i] || inSubtitle[i] || inKeywordField[i])) return "partial";
  return "none";
}

// Lowercased words in the keyword field that the title or subtitle already
// index: Apple counts each word once across the three fields, so repeating
// them here only spends characters.
export function wastedKeywordFieldWords(keywordField: string, title: string, subtitle: string): string[] {
  const indexed = new Set([...tokens(title), ...tokens(subtitle)]);
  return [...new Set(tokens(keywordField))].filter((t) => indexed.has(t));
}

// Google Play's full description limit.
export const DESCRIPTION_LIMIT = 4000;

// How often a keyword appears in the Android full description, as whole
// words in order. `density` is the share of the description's words those
// mentions take up (mentions × words in the keyword ÷ total words), in
// percent. For scripts written without spaces it's measured in characters
// instead, since there are no words to count.
export type Density = { count: number; density: number };

export function descriptionDensity(keyword: string, description: string): Density {
  const kw = tokens(keyword);
  if (!kw.length || !description.trim()) return { count: 0, density: 0 };

  if (kw.some((t) => UNSPACED_SCRIPT.test(t))) {
    const needle = kw.join("");
    const haystack = description.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");
    if (!haystack.length) return { count: 0, density: 0 };
    const count = haystack.split(needle).length - 1;
    return { count, density: (count * needle.length * 100) / haystack.length };
  }

  const words = tokens(description);
  let count = 0;
  for (let i = 0; i + kw.length <= words.length; i++) {
    if (kw.every((t, j) => words[i + j] === t)) {
      count++;
      i += kw.length - 1;
    }
  }
  return { count, density: words.length ? (count * kw.length * 100) / words.length : 0 };
}

// Rule-of-thumb bands, not a published Google number: under 1% barely
// registers, over 3% starts to read as keyword stuffing, which Google Play's
// metadata policy does prohibit.
export type DensityBand = "none" | "low" | "good" | "high";

export function densityBand(d: Density): DensityBand {
  if (d.count === 0) return "none";
  if (d.density < 1) return "low";
  if (d.density <= 3) return "good";
  return "high";
}

import { ASO_REFERENCE } from "./asoScore";

export type Suggestion = { title: string; description: string };

type BenchmarkInput = {
  avgScreenshotCount?: number | null;
  pctWithPreviewVideo?: number | null;
  avgRating?: number | null;
  medianRatingCount?: number | null;
  avgDaysSinceUpdate?: number | null;
  avgLanguageCount?: number | null;
} | null | undefined;

type SuggestionInput = {
  appName: string;
  title: string;
  subtitle: string;
  description: string;
  releaseNotes: string;
  isIos: boolean;
  nameLimit: number;
  subtitleLimit: number;
  screenshotCount: number;
  hasPreviewVideo: boolean;
  rating?: number;
  ratingCount?: number;
  daysSinceUpdate?: number;
  languageCount?: number;
  keywordMetrics: { term: string; volume: number }[];
  benchmark?: BenchmarkInput;
};

// \p{L}\p{N} (Unicode letter/number) rather than a-z0-9 — an ASCII-only class
// treats accented letters as delimiters, splitting words like "appétit" or
// "appâts" into a false "app" token and misfiring the keyword checks below.
function tokenize(text: string): string[] {
  return text.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean);
}

// Store name for the field iOS calls "Subtitle" and Android calls "Short
// Description" — matches the wording ReportMetadataComparison already uses.
function subtitleLabel(isIos: boolean): string {
  return isIos ? "Subtitle" : "Short description";
}

// ─── Title / Subtitle text checks ──────────────────────────────────────────

function checkStartTrackingKeywords(keywordMetrics: SuggestionInput["keywordMetrics"]): Suggestion | null {
  if (keywordMetrics.length > 0) return null;
  return {
    title: "Start tracking keywords",
    description: "Add target terms to unlock more precise ASO recommendations and visibility insights.",
  };
}

function checkTitleDivider(title: string): Suggestion | null {
  const match = title.match(/\s([-–—])\s/);
  if (!match) return null;
  return {
    title: `"${match[1]}" as a title divider`,
    description: "A colon works better. It's cleaner, more professional, and helps the store parse your title and keywords more clearly.",
  };
}

function checkAppAsKeyword(title: string, subtitle: string, isIos: boolean): Suggestion | null {
  const words = new Set(tokenize(`${title} ${subtitle}`));
  if (!words.has("app") && !words.has("apps")) return null;
  return {
    title: `"App" as a keyword`,
    description: `${isIos ? "Apple" : "Google"} already knows it's an app. That slot is better used on relevant, high-intent keywords.`,
  };
}

function checkDuplicateKeywords(title: string, subtitle: string): Suggestion | null {
  const titleWords = new Set(tokenize(title).filter((w) => w.length >= 3));
  const dup = [...new Set(tokenize(subtitle).filter((w) => w.length >= 3 && titleWords.has(w)))];
  if (dup.length === 0) return null;
  return {
    title: "Duplicate keywords",
    description: `"${dup.slice(0, 3).join(", ")}" repeat${dup.length === 1 ? "s" : ""} across your title and subtitle — repeating terms in your metadata doesn't boost rankings, those slots are better used on new keywords.`,
  };
}

// iOS-only — same reasoning as checkDuplicateKeywords above: Android's much
// larger short description (80 chars) and description (4000 chars) fields
// mean a repeated word in just the title+subtitle isn't the wasted-space
// problem it is on iOS's tightly capped 30+30 fields.
function checkKeywordStuffing(title: string, subtitle: string): Suggestion | null {
  const words = tokenize(`${title} ${subtitle}`).filter((w) => w.length >= 3);
  const counts = new Map<string, number>();
  for (const w of words) counts.set(w, (counts.get(w) ?? 0) + 1);
  const stuffed = [...counts.entries()].find(([, c]) => c >= 3);
  if (!stuffed) return null;
  return {
    title: "Keyword stuffing",
    description: `"${stuffed[0]}" appears ${stuffed[1]} times across your title and subtitle — doesn't improve rankings and can get your app penalized by the App Store.`,
  };
}

function checkSingularPlural(title: string, subtitle: string): Suggestion | null {
  const words = new Set(tokenize(`${title} ${subtitle}`).filter((w) => w.length >= 4));
  for (const w of words) {
    if (w.endsWith("s") && words.has(w.slice(0, -1))) {
      return {
        title: "Singular and plural keywords",
        description: `You're using both "${w.slice(0, -1)}" and "${w}" — using both wastes character space. Stick to singular only.`,
      };
    }
  }
  return null;
}

function checkTitleUnderused(title: string, nameLimit: number): Suggestion | null {
  if (title.length === 0 || title.length / nameLimit >= 0.7) return null;
  return {
    title: "Title underused",
    description: "It's indexed, so adding more relevant keywords here can directly improve your search rankings.",
  };
}

function checkMissingSubtitle(subtitle: string, isIos: boolean): Suggestion | null {
  if (subtitle.trim().length > 0) return null;
  return {
    title: `Missing ${subtitleLabel(isIos).toLowerCase()}`,
    description: "This field is indexed for search — leaving it blank means giving up valuable keyword real estate entirely.",
  };
}

function checkSubtitleUnderused(subtitle: string, subtitleLimit: number, isIos: boolean): Suggestion | null {
  if (subtitle.length === 0 || subtitle.length / subtitleLimit >= 0.7) return null;
  return {
    title: `${subtitleLabel(isIos)} underused`,
    description: "It's indexed, so leaving it short means missing out on valuable keyword real estate.",
  };
}

function checkLowKeywordDensity(title: string, subtitle: string, keywordMetrics: SuggestionInput["keywordMetrics"]): Suggestion | null {
  if (keywordMetrics.length === 0) return null;
  const haystack = `${title} ${subtitle}`.toLowerCase();
  const missing = [...keywordMetrics].sort((a, b) => b.volume - a.volume).slice(0, 3)
    .filter((k) => !haystack.includes(k.term.toLowerCase()));
  if (missing.length === 0) return null;
  return {
    title: "Low keyword density",
    description: `"${missing.map((m) => m.term).join(", ")}" ${missing.length === 1 ? "isn't" : "aren't"} prominent enough across your title and subtitle to fully signal relevance to the algorithm.`,
  };
}

// ─── Description checks ────────────────────────────────────────────────────

function checkMissingDescription(description: string): Suggestion | null {
  if (description.trim().length > 0) return null;
  return {
    title: "Missing description",
    description: "Users check this before installing — an empty description is a lost opportunity to sell the app and reinforce keywords.",
  };
}

function checkDescriptionUnderused(description: string): Suggestion | null {
  if (description.length === 0 || description.length / ASO_REFERENCE.descriptionLength >= 0.5) return null;
  return {
    title: "Description underused",
    description: `At ${description.length} characters, you're leaving room on the table — a fuller description gives you more space to naturally include supporting keywords and highlight features.`,
  };
}

function checkUnformattedDescription(description: string): Suggestion | null {
  if (description.length < 300 || description.includes("\n")) return null;
  return {
    title: "Description isn't scannable",
    description: "It reads as one long paragraph — breaking it into short paragraphs or bullet points makes it easier to skim and can lift conversion.",
  };
}

// Android-only: Play indexes the full description for search relevance, so a
// top keyword missing from it is lost ranking signal. Apple doesn't index the
// iOS description the same way, so this doesn't apply there.
function checkDescriptionMissingKeywords(description: string, keywordMetrics: SuggestionInput["keywordMetrics"]): Suggestion | null {
  if (keywordMetrics.length === 0 || description.length === 0) return null;
  const haystack = description.toLowerCase();
  const missing = [...keywordMetrics].sort((a, b) => b.volume - a.volume).slice(0, 3)
    .filter((k) => !haystack.includes(k.term.toLowerCase()));
  if (missing.length === 0) return null;
  return {
    title: "Top keywords missing from description",
    description: `"${missing.map((m) => m.term).join(", ")}" ${missing.length === 1 ? "doesn't" : "don't"} appear anywhere in your description — Play indexes the full description text, so this is lost ranking signal.`,
  };
}

function checkMissingReleaseNotes(releaseNotes: string): Suggestion | null {
  if (releaseNotes.trim().length > 0) return null;
  return {
    title: "Missing release notes",
    description: `Add "What's New" notes with each update — they signal active maintenance to users deciding whether to download.`,
  };
}

// ─── Visual / trust checks, benchmark-aware where data exists ─────────────

function checkFewScreenshots(screenshotCount: number, avgScreenshotCount?: number | null): Suggestion | null {
  const target = avgScreenshotCount && avgScreenshotCount > 0 ? avgScreenshotCount : ASO_REFERENCE.screenshotCount;
  if (screenshotCount >= target) return null;
  const compare = avgScreenshotCount
    ? `the category average of ${Math.round(avgScreenshotCount)}`
    : `the recommended minimum of ${ASO_REFERENCE.screenshotCount}`;
  return {
    title: "Not enough screenshots",
    description: `You have ${screenshotCount} screenshot${screenshotCount === 1 ? "" : "s"}, below ${compare} — screenshots are one of the biggest conversion levers on your store listing.`,
  };
}

function checkNoPreviewVideo(hasPreviewVideo: boolean, pctWithPreviewVideo?: number | null): Suggestion | null {
  if (hasPreviewVideo) return null;
  const context = pctWithPreviewVideo && pctWithPreviewVideo >= 30
    ? `${pctWithPreviewVideo}% of top apps in your category have one`
    : "it can meaningfully lift conversion rate";
  return { title: "Missing a preview video", description: `Adding one is worth prioritizing — ${context}.` };
}

function checkLowRating(rating: number | undefined, avgRating?: number | null): Suggestion | null {
  if (rating === undefined) return null;
  const target = avgRating && avgRating > 0 ? avgRating : ASO_REFERENCE.rating;
  if (rating >= target) return null;
  const compare = avgRating ? `the category average of ${avgRating.toFixed(1)}` : `the ${target} benchmark`;
  return {
    title: "Rating below target",
    description: `Your ${rating.toFixed(1)} rating is below ${compare} — a lower rating can suppress both ranking and conversion. Prioritize fixing the most common complaints in your reviews.`,
  };
}

function checkLowReviewCount(ratingCount: number | undefined, medianRatingCount?: number | null): Suggestion | null {
  if (ratingCount === undefined) return null;
  const target = medianRatingCount && medianRatingCount > 0 ? medianRatingCount : ASO_REFERENCE.reviewCount;
  if (ratingCount >= target) return null;
  const compare = medianRatingCount
    ? `well below the category median of ${medianRatingCount.toLocaleString()}`
    : "still building up";
  return {
    title: "Low review volume",
    description: `${ratingCount.toLocaleString()} ratings is ${compare} — more reviews build the social proof that improves conversion. Consider prompting happy users to leave one.`,
  };
}

function checkStaleApp(daysSinceUpdate: number | undefined, avgDaysSinceUpdate?: number | null): Suggestion | null {
  if (daysSinceUpdate === undefined) return null;
  const target = avgDaysSinceUpdate && avgDaysSinceUpdate > 0 ? avgDaysSinceUpdate : ASO_REFERENCE.daysSinceUpdate;
  if (daysSinceUpdate <= target) return null;
  const compare = avgDaysSinceUpdate ? `, versus a category average of ${Math.round(avgDaysSinceUpdate)}` : "";
  return {
    title: "Hasn't been updated recently",
    description: `It's been ${daysSinceUpdate} days since your last update${compare} — regular updates signal active maintenance to both users and the ranking algorithm.`,
  };
}

// iOS-only: Localization scoring elsewhere in this report (asoScore.ts) is
// iOS-only too — Play listings don't expose a comparable per-locale count.
function checkLowLocalization(isIos: boolean, languageCount: number | undefined, avgLanguageCount?: number | null): Suggestion | null {
  if (!isIos || languageCount === undefined) return null;
  const target = avgLanguageCount && avgLanguageCount > 0 ? avgLanguageCount : ASO_REFERENCE.languageCount;
  if (languageCount >= target) return null;
  return {
    title: "Limited localization",
    description: `Supporting only ${languageCount} language${languageCount === 1 ? "" : "s"} limits your reach in other App Store storefronts — localizing your title, subtitle, and keywords can unlock meaningful new search traffic.`,
  };
}

// Deterministic, text-only ASO checks — no network call, so these always
// render immediately regardless of plan tier (unlike the LLM-generated
// suggestions layered on top in ReportPage, which are Pro only).
export function computeDeterministicSuggestions(input: SuggestionInput): Suggestion[] {
  const {
    appName, title, subtitle, description, releaseNotes, isIos, nameLimit, subtitleLimit,
    screenshotCount, hasPreviewVideo, rating, ratingCount, daysSinceUpdate, languageCount,
    keywordMetrics, benchmark,
  } = input;

  return [
    checkStartTrackingKeywords(keywordMetrics),
    checkTitleDivider(title),
    checkAppAsKeyword(title, subtitle, isIos),
    // iOS-only: title (30) + subtitle (30) + a separate 100-char keyword field
    // are the *only* indexed space, so a repeated term there is a wasted slot.
    // Android's short description (80) + long description (4000) give far more
    // room, and Play's algorithm doesn't penalize the same repetition — it can
    // even reinforce relevance — so this rule doesn't apply there.
    isIos ? checkDuplicateKeywords(title, subtitle) : null,
    isIos ? checkKeywordStuffing(title, subtitle) : null,
    checkSingularPlural(title, subtitle),
    checkTitleUnderused(title, nameLimit),
    checkMissingSubtitle(subtitle, isIos),
    checkSubtitleUnderused(subtitle, subtitleLimit, isIos),
    checkLowKeywordDensity(title, subtitle, keywordMetrics),
    checkMissingDescription(description),
    checkDescriptionUnderused(description),
    checkUnformattedDescription(description),
    !isIos ? checkDescriptionMissingKeywords(description, keywordMetrics) : null,
    checkMissingReleaseNotes(releaseNotes),
    checkFewScreenshots(screenshotCount, benchmark?.avgScreenshotCount),
    checkNoPreviewVideo(hasPreviewVideo, benchmark?.pctWithPreviewVideo),
    checkLowRating(rating, benchmark?.avgRating),
    checkLowReviewCount(ratingCount, benchmark?.medianRatingCount),
    checkStaleApp(daysSinceUpdate, benchmark?.avgDaysSinceUpdate),
    checkLowLocalization(isIos, languageCount, benchmark?.avgLanguageCount),
  ].filter((s): s is Suggestion => s !== null);
}

// Restricted search terms: the App Store returns zero apps for some explicit
// phrases ("adult content", "porn", "nsfw"...), even though people type them
// and autocomplete suggests them. No app can rank for such a term, so its
// difficulty (scored from an empty top 5) reads 0 and Chance 95, which made
// it look like the easiest keyword in the table.
//
// Apple doesn't publish the list and it differs by storefront ("sex" returns
// results, "nsfw" doesn't), so it's detected from the search itself: zero
// results with popularity above the never-suggested floor. A zero-result
// search always lands its volume on exactly that floor when the term isn't
// suggested (no title matches -> rating estimate 5 -> long-tail score 5), so
// a higher volume means the store suggests the term but hides its results.
// A truly empty, never-suggested term stays unrestricted: an app that adds it
// really would be the only result.
//
// No imports: shared by server routes and client components.

// NEVER_SUGGESTED_SCORE in libs/keyword-autocomplete.ts.
export const RESTRICTED_VOLUME_FLOOR = 5;

export function isRestrictedSearch(
  results: number | null | undefined,
  volume: number | null | undefined,
): boolean {
  return results === 0 && (volume ?? 0) > RESTRICTED_VOLUME_FLOOR;
}

export const RESTRICTED_SEARCH_HINT =
  "The store shows no apps when people search this term, so no app can rank for it. Target nearby terms that do return results.";

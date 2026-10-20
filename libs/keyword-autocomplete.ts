import type { SupabaseClient } from "@supabase/supabase-js";
import { enqueueAppleHintsRequest, createQueue } from "@/libs/apple-rate-limiter";

// iOS keyword popularity estimated from App Store search autocomplete — the
// same suggestion list the App Store app shows while typing. Popular
// searches are suggested after a letter or two ("budget app" at "bu"), rare
// ones only late or never ("pet vet records" isn't suggested even fully
// typed). This tracks Apple Ads' own Search Popularity far better than the
// old rating-count proxy (computeIosVolume), which mostly measured how big
// the apps that happen to have the keyword in their title are, and which
// stays as the fallback whenever this returns null.
//
// Unofficial, undocumented endpoint (no account or key needed) — every
// failure path returns null so callers fall back rather than break.
//
// Android does the same walk against Google Play's search suggest (see
// fetchPlayHints). Play used to be scored by whether the *full* keyword came
// back as a suggestion, which saturated because Play echoed back almost any
// well-formed phrase — it no longer does (long-tail phrases like "pet vet
// records" now return no suggestions at all), and the letter-by-letter walk
// only rewards keywords suggested early anyway. Sample (US): chatgpt 95,
// photo editor 73, budget app 61, habit tracker 59, ai photo enhancer 43,
// pet records 36, plant identifier 34.

// Apple storefront IDs, needed as the X-Apple-Store-Front header (a ?cc=
// param is ignored). Sourced from app-store-scraper's markets table and
// spot-checked against 20 major markets. Countries missing here (mostly
// small markets) fall back to the rating-count volume.
const STOREFRONTS: Record<string, number> = {
  AE: 143481, AI: 143538, AM: 143524, AO: 143564, AR: 143505, AT: 143445, AU: 143460, AZ: 143568,
  BB: 143541, BE: 143446, BG: 143526, BH: 143559, BM: 143542, BN: 143560, BO: 143556, BR: 143503,
  BW: 143525, BY: 143565, BZ: 143555, CA: 143455, CH: 143459, CL: 143483, CN: 143465, CO: 143501,
  CR: 143495, CY: 143557, CZ: 143489, DE: 143443, DK: 143458, DM: 143545, DZ: 143563, EC: 143509,
  EE: 143518, EG: 143516, ES: 143454, FI: 143447, FR: 143442, GB: 143444, GD: 143546, GH: 143573,
  GR: 143448, GT: 143504, GY: 143553, HK: 143463, HN: 143510, HR: 143494, HU: 143482, ID: 143476,
  IE: 143449, IL: 143491, IN: 143467, IS: 143558, IT: 143450, JM: 143511, JO: 143528, JP: 143462,
  KE: 143529, KR: 143466, KW: 143493, KY: 143544, LB: 143497, LK: 143486, LT: 143520, LU: 143451,
  LV: 143519, MG: 143531, MK: 143530, ML: 143532, MO: 143515, MS: 143547, MT: 143521, MU: 143533,
  MX: 143468, MY: 143473, NE: 143534, NG: 143561, NI: 143512, NL: 143452, NO: 143457, NP: 143484,
  NZ: 143461, OM: 143562, PA: 143485, PE: 143507, PH: 143474, PK: 143477, PL: 143478, PT: 143453,
  PY: 143513, QA: 143498, RO: 143487, RU: 143469, SA: 143479, SE: 143456, SG: 143464, SI: 143499,
  SK: 143496, SN: 143535, SR: 143554, SV: 143506, TH: 143475, TN: 143536, TR: 143480, TW: 143470,
  TZ: 143572, UA: 143492, UG: 143537, US: 143441, UY: 143514, UZ: 143566, VE: 143502, VG: 143543,
  VN: 143471, YE: 143571, ZA: 143472,
};

const HINTS_URL = "https://search.itunes.apple.com/WebObjects/MZSearchHints.woa/wa/hints?clientApplication=Software&term=";
const USER_AGENT = "AppStore/3.0 iOS/17.0 model/iPhone15,2 hwp/t8120 build/21A329 (6; dt:280)";

// Prefixes past this are rarely where a keyword first shows up, and each one
// costs a request — a keyword not suggested within MAX_PREFIX_CHARS letters
// is scored as if found at its full length (it is already known to be
// suggested at full length by then; see fetchAutocompletePopularity).
const MAX_PREFIX_CHARS = 8;
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const NEVER_SUGGESTED_SCORE = 5;
// Never-suggested keywords (most of the long tail) are spread across
// NEVER_SUGGESTED_SCORE..LONG_TAIL_MAX by the rating-count estimate instead of
// all tying at 5 — see resolveIosVolume. Suggested keywords never score below
// LONG_TAIL_MAX + 1, so any suggested keyword still outranks every
// unsuggested one.
const LONG_TAIL_MAX = 15;

// Many keywords share prefixes ("p", "pe", "pet") — share the responses
// across a batch instead of re-requesting them per keyword.
const PREFIX_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const prefixCache = new Map<string, { hints: string[]; ts: number }>();

// Play suggest has no known per-IP limit (a ~60-request back-to-back run went
// through clean), but each keyword can cost ~9 requests and the Android
// metrics path scores terms in parallel — a short gap keeps that from
// bursting.
const PLAY_SUGGEST_GAP_MS = 200;
const enqueuePlaySuggestRequest = createQueue(PLAY_SUGGEST_GAP_MS);
const PLAY_SUGGEST_URL = "https://play.google.com/_/PlayStoreUi/data/batchexecute?rpcids=IJ4APc&authuser&soc-app=121&soc-platform=1&soc-device=1";

export type Store = "ios" | "android";
type HintsFetcher = (prefix: string) => Promise<string[] | null>;

export type AutocompleteResult = { score: number; prefixChars: number | null; position: number | null };

function normalize(s: string) {
  return s.toLowerCase().trim().replace(/\s+/g, " ");
}

async function fetchAppleHints(prefix: string, storefront: number): Promise<string[] | null> {
  const key = `ios|${storefront}|${prefix}`;
  const cached = prefixCache.get(key);
  if (cached && Date.now() - cached.ts < PREFIX_CACHE_TTL_MS) return cached.hints;
  try {
    const res = await enqueueAppleHintsRequest(() =>
      fetch(HINTS_URL + encodeURIComponent(prefix), {
        headers: { "User-Agent": USER_AGENT, "X-Apple-Store-Front": String(storefront) },
        cache: "no-store",
      })
    );
    if (!res.ok) return null;
    // Plist XML — every suggestion is a <string> directly after <key>term</key>.
    const xml = await res.text();
    const hints = [...xml.matchAll(/<key>term<\/key>\s*<string>([^<]*)<\/string>/g)].map((m) =>
      normalize(decodeXmlEntities(m[1]))
    );
    prefixCache.set(key, { hints, ts: Date.now() });
    return hints;
  } catch {
    return null;
  }
}

// Same request google-play-scraper's suggest() sends, made directly: the
// library throws a TypeError ("reading 'map'") when Play has no suggestions
// for a prefix, which is indistinguishable from a real failure — here an
// empty result is [] and only a failed request/unparseable response is null.
async function fetchPlayHints(prefix: string, country: string): Promise<string[] | null> {
  const key = `android|${country}|${prefix}`;
  const cached = prefixCache.get(key);
  if (cached && Date.now() - cached.ts < PREFIX_CACHE_TTL_MS) return cached.hints;
  try {
    const term = encodeURIComponent(prefix);
    const body = `f.req=%5B%5B%5B%22IJ4APc%22%2C%22%5B%5Bnull%2C%5B%5C%22${term}%5C%22%5D%2C%5B10%5D%2C%5B2%5D%2C4%5D%5D%22%5D%5D%5D`;
    const res = await enqueuePlaySuggestRequest(() =>
      fetch(`${PLAY_SUGGEST_URL}&hl=en&gl=${encodeURIComponent(country)}`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
        body,
        cache: "no-store",
      })
    );
    if (!res.ok) return null;
    // ")]}'" XSSI prefix, then a JSON envelope whose payload is itself a JSON string.
    const text = await res.text();
    const envelope = JSON.parse(text.substring(5));
    const payload = envelope?.[0]?.[2];
    if (typeof payload !== "string") return null;
    const data = JSON.parse(payload);
    const rows: unknown[] = Array.isArray(data?.[0]?.[0]) ? data[0][0] : [];
    const hints = rows
      .map((r) => (Array.isArray(r) && typeof r[0] === "string" ? normalize(r[0]) : null))
      .filter((h): h is string => h !== null);
    prefixCache.set(key, { hints, ts: Date.now() });
    return hints;
  } catch {
    return null;
  }
}

function decodeXmlEntities(s: string) {
  return s
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&amp;/g, "&");
}

// Fewer letters needed → more popular; log-scaled so 1→2 letters matters more
// than 7→8. Each place down the suggestion list costs a point. Sample (US):
// chatgpt 95, photo editor 74, budget app 70, habit tracker 61, plant
// identifier 53, ai photo enhancer 49, pet records 41, pet vet records 5.
export function scoreAutocomplete(prefixChars: number, position: number) {
  const score = Math.round(95 - 30 * Math.log(prefixChars)) - (position - 1);
  return Math.min(Math.max(score, LONG_TAIL_MAX + 1), 100);
}

// A suggestion counts if it's the keyword itself or the keyword plus more
// whole words: head terms are rarely suggested on their own ("photo" only
// ever comes back as "photo editor", "weight" as "weight watchers"), so
// requiring an exact match scored them as never suggested — while everyone
// who searches "photo editor" typed "photo" first, so an extension's
// popularity is a floor for the keyword's. The word boundary keeps "chat"
// from riding on "chatgpt".
function suggestionIndex(hints: string[], kw: string) {
  return hints.findIndex((h) => h === kw || h.startsWith(kw + " "));
}

// A match only says something about popularity if the keyword beat
// something unrelated to it. An app's own name ("nutrisnap") is suggested
// as soon as its letters stop matching anything else — at "nutrisn" every
// suggestion on both stores is NutriSnap or a NutriSnap variant — which
// scored a brand with ~0 searches like a mid-popularity keyword. Every real
// keyword sampled (incl. brands people do search, like "myfitnesspal") had
// 2+ unrelated suggestions alongside it where it first appeared.
// A variant is the keyword followed by nothing or by a non-letter ("nutrisnap
// pro", "nutrisnap: calorie counter"); "buddy" is a rival of "bud", not a
// variant of it.
function isVariant(hint: string, kw: string) {
  if (!hint.startsWith(kw)) return false;
  const next = Array.from(hint.slice(kw.length))[0];
  return next === undefined || !/[\p{L}\p{N}]/u.test(next);
}

// Two, not one: a near-identical app name can be the lone "rival" (Apple
// suggests "nutrisnaps: ai calorie tracker" alongside nine NutriSnap
// variants at "nutrisn").
const MIN_RIVALS = 2;

function wonByDefault(hints: string[], kw: string) {
  return hints.filter((h) => !isVariant(h, kw)).length < MIN_RIVALS;
}

// Checks the full keyword first: a keyword the store doesn't suggest even
// fully typed is never suggested at any shorter prefix either, so the long
// tail (most keywords) costs a single request. Only keywords that *are*
// suggested pay for the letter-by-letter walk.
async function walkPrefixes(kw: string, fetchHints: HintsFetcher): Promise<AutocompleteResult | null> {
  const full = await fetchHints(kw);
  if (!full) return null;
  const fullIdx = suggestionIndex(full, kw);
  if (fullIdx < 0) return { score: NEVER_SUGGESTED_SCORE, prefixChars: null, position: null };

  // Array.from, not .length/.slice — keeps a CJK/emoji keyword's prefixes on
  // code point boundaries rather than splitting surrogate pairs.
  const chars = Array.from(kw);
  for (let n = 1; n < Math.min(chars.length, MAX_PREFIX_CHARS + 1); n++) {
    // A trailing space adds nothing the store matches on — skip the request.
    if (chars[n - 1] === " ") continue;
    const hints = await fetchHints(chars.slice(0, n).join(""));
    if (!hints) return null;
    const idx = suggestionIndex(hints, kw);
    if (idx < 0) continue;
    if (wonByDefault(hints, kw)) return { score: NEVER_SUGGESTED_SCORE, prefixChars: null, position: null };
    return { score: scoreAutocomplete(n, idx + 1), prefixChars: n, position: idx + 1 };
  }
  if (wonByDefault(full, kw)) return { score: NEVER_SUGGESTED_SCORE, prefixChars: null, position: null };
  const pos = fullIdx + 1;
  return { score: scoreAutocomplete(chars.length, pos), prefixChars: chars.length, position: pos };
}

export async function fetchAutocompletePopularity(term: string, country: string, store: Store = "ios"): Promise<AutocompleteResult | null> {
  const kw = normalize(term);
  if (!kw) return null;
  if (store === "android") {
    const gl = country.toLowerCase();
    return walkPrefixes(kw, (prefix) => fetchPlayHints(prefix, gl));
  }
  const storefront = STOREFRONTS[country.toUpperCase()];
  if (!storefront) return null;
  return walkPrefixes(kw, (prefix) => fetchAppleHints(prefix, storefront));
}

// Weekly-cached autocomplete popularity for a keyword, shared across every
// app/workspace. null = not available (unsupported country, store error) —
// the caller should fall back to its search-result volume, and nothing is
// cached so the next check retries. fresh skips the cached score (still
// writes the new one) — for an explicit force refresh, where handing back
// last week's score would make the refresh a silent no-op for volume.
export type VolumeOptions = { fresh?: boolean };

async function getAutocompleteVolume(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>, term: string, country: string, store: Store, opts: VolumeOptions = {}
): Promise<{ score: number; prefixChars: number | null } | null> {
  const normTerm = normalize(term);
  const normCountry = country.toLowerCase();
  if (store === "ios" && !STOREFRONTS[normCountry.toUpperCase()]) return null;

  const { data } = opts.fresh ? { data: null } : await supabase
    .from("keyword_autocomplete_popularity")
    .select("score, prefix_chars, checked_at")
    .eq("term", normTerm)
    .eq("store", store)
    .eq("country", normCountry)
    .maybeSingle();
  if (data && Date.now() - new Date(data.checked_at as string).getTime() < CACHE_TTL_MS) {
    return { score: data.score as number, prefixChars: (data.prefix_chars as number | null) ?? null };
  }

  const result = await fetchAutocompletePopularity(normTerm, normCountry, store);
  if (!result) return null;
  await supabase.from("keyword_autocomplete_popularity").upsert(
    {
      term: normTerm, store, country: normCountry, score: result.score,
      prefix_chars: result.prefixChars, position: result.position,
      checked_at: new Date().toISOString(),
    },
    { onConflict: "term,store,country" }
  );
  return { score: result.score, prefixChars: result.prefixChars };
}

// Rating-count volume (computeIosVolume) is 5 below a 1,000-rating average,
// otherwise ~43 and up — real keywords mostly land in 43-80, so that band is
// stretched across the long-tail range rather than the full 43-100.
function longTailScore(ratingVolume: number) {
  if (ratingVolume <= NEVER_SUGGESTED_SCORE) return NEVER_SUGGESTED_SCORE;
  const t = (ratingVolume - 43) / (80 - 43);
  return Math.min(Math.max(NEVER_SUGGESTED_SCORE + 1 + Math.round(t * (LONG_TAIL_MAX - NEVER_SUGGESTED_SCORE - 1)), NEVER_SUGGESTED_SCORE + 1), LONG_TAIL_MAX);
}

// An autocomplete score no better than a first suggestion at 5 letters
// (95 - 30·ln 5 ≈ 47) comes from the part of the walk where quiet
// storefronts pad the list with obscure app names: in PH, "nutrisnap" first
// shows at "nutris" beside nutriscan / nutrisense / nutrishot, which pass
// wonByDefault as rivals but aren't real competing searches, and nutriscan
// itself only scrapes in at "nutr" in 10th place (44). Real head terms
// surface within 1-3 letters even there (nutrition 58, calorie 59, noom 58,
// gcash 95). The same padding happens at fewer letters when the prefix is a
// rare letter combination: in the US, "ikisaki" (13 ratings) is the 10th and
// last suggestion at "iki", behind ikia / ikick / ikitesurf, which scores 53.
// So the cap covers anything not suggested within 2 letters (95 - 30·ln 3 ≈
// 62); head terms are still well above it.
const LATE_SCORE_MAX = 62;

// Ceiling for a late-suggested brand name, from how many ratings its app has
// in this storefront: a brand gets searched roughly in proportion to its
// user base. Same scale as the volume score itself (+20 = 10x searches, see
// libs/keyword-impressions.ts), anchored so lifesum's 823 PH ratings land at
// 30. PH samples: lifesum 30, nutrisnap (248) 20, nutriscan (7) 5.
function brandCeiling(topRatings: number) {
  if (topRatings < 1) return NEVER_SUGGESTED_SCORE;
  return Math.max(Math.round(20 * Math.log10(topRatings) - 28), NEVER_SUGGESTED_SCORE);
}

// The part of an app title before its tagline ("NutriSnap: Nutrition
// Tracker" → "nutrisnap"), minus trailing symbols ("Nutriscan+" → "nutriscan").
function titleBrand(trackName: string) {
  return normalize(trackName.split(/:| [-–—|] /)[0]).replace(/[^\p{L}\p{N}]+$/u, "");
}

// A name can also sit anywhere in the title ("AI Travel Planner Ikisaki"),
// where titleBrand can't see it. A word that only one or two result titles
// use is a name; generic words show up in many (US: planner 40, itinerary 16,
// ikigai 33 vs ikisaki 1, wanderlog 1, tripit 1).
const MAX_NAME_TITLES = 2;

function titleWords(trackName: string) {
  return normalize(trackName).split(/[^\p{L}\p{N}]+/u);
}

// Ratings of the most-rated app whose title brand is exactly this keyword
// (or whose title is one of the few that use it as a word), or null when the
// keyword isn't any result's brand, in which case it keeps its autocomplete
// score. Single words only: a title brand like "Habit Tracker" or "Calorie
// Counter" is a generic phrase, not a name; CJK has no spaces to tell the two
// apart, so it's skipped too. "macro" isn't the brand of "Macro Tracker:
// ...", nor "nutrition" of "Nutrition Coach: ...".
function topBrandRatings(apps: { trackName: string; userRatingCount: number }[], kw: string): number | null {
  if (kw.includes(" ") || /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u.test(kw)) return null;
  let brandApps = apps.filter((a) => titleBrand(a.trackName) === kw);
  if (!brandApps.length) {
    const named = apps.filter((a) => titleWords(a.trackName).includes(kw));
    if (named.length <= MAX_NAME_TITLES) brandApps = named;
  }
  if (!brandApps.length) return null;
  return Math.max(...brandApps.map((a) => a.userRatingCount ?? 0));
}

export type IosVolumeOptions = VolumeOptions & {
  // The search result set the keyword was scored from; enables the brand
  // ceiling for late-suggested app names. Omitted → no ceiling.
  apps?: { trackName: string; userRatingCount: number }[];
};

// The iOS volume every writer stores: autocomplete popularity, with the
// rating-count estimate (ratingVolume) used to break ties among
// never-suggested keywords, and as the whole score whenever autocomplete
// isn't available (unsupported country, Apple hints error). A late-suggested
// brand name is also capped by its app's ratings, so it can land below
// LONG_TAIL_MAX — an unused app name shouldn't outrank the long tail just
// because a quiet storefront suggested it. Every other keyword keeps its
// autocomplete score.
export async function resolveIosVolume(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>, term: string, country: string, ratingVolume: number, opts: IosVolumeOptions = {}
): Promise<number> {
  const autocomplete = await getAutocompleteVolume(supabase, term, country, "ios", opts);
  if (autocomplete === null) return ratingVolume;
  if (autocomplete.score === NEVER_SUGGESTED_SCORE) return longTailScore(ratingVolume);
  if (opts.apps && autocomplete.score <= LATE_SCORE_MAX) {
    const top = topBrandRatings(opts.apps, normalize(term));
    if (top !== null) return Math.min(autocomplete.score, brandCeiling(top));
  }
  return autocomplete.score;
}

// Title-match volume (computeAndroidTitleVolume) is ~30 for any keyword with
// a full result page but no title matches, up to 100 — stretched across the
// long-tail range the same way longTailScore stretches the iOS estimate.
function androidLongTailScore(titleVolume: number) {
  const t = Math.min(Math.max((titleVolume - 30) / (100 - 30), 0), 1);
  return NEVER_SUGGESTED_SCORE + 1 + Math.round(t * (LONG_TAIL_MAX - NEVER_SUGGESTED_SCORE - 1));
}

// The Android volume every writer stores: Play suggest popularity, with the
// title-match estimate (titleVolume) breaking ties among never-suggested
// keywords, and as the whole score whenever Play suggest fails.
export async function resolveAndroidVolume(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>, term: string, country: string, titleVolume: number, opts: VolumeOptions = {}
): Promise<number> {
  const autocomplete = (await getAutocompleteVolume(supabase, term, country, "android", opts))?.score ?? null;
  if (autocomplete === null) return titleVolume;
  if (autocomplete === NEVER_SUGGESTED_SCORE) return androidLongTailScore(titleVolume);
  return autocomplete;
}

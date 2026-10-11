import type { SupabaseClient } from "@supabase/supabase-js";
import { enqueueAppleHintsRequest } from "@/libs/apple-rate-limiter";

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

export type AutocompleteResult = { score: number; prefixChars: number | null; position: number | null };

function normalize(s: string) {
  return s.toLowerCase().trim().replace(/\s+/g, " ");
}

async function fetchHints(prefix: string, storefront: number): Promise<string[] | null> {
  const key = `${storefront}|${prefix}`;
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

// Checks the full keyword first: a keyword Apple doesn't suggest even fully
// typed is never suggested at any shorter prefix either, so the long tail
// (most keywords) costs a single request. Only keywords that *are*
// suggested pay for the letter-by-letter walk.
export async function fetchAutocompletePopularity(term: string, country: string): Promise<AutocompleteResult | null> {
  const storefront = STOREFRONTS[country.toUpperCase()];
  const kw = normalize(term);
  if (!storefront || !kw) return null;

  const full = await fetchHints(kw, storefront);
  if (!full) return null;
  if (!full.includes(kw)) return { score: NEVER_SUGGESTED_SCORE, prefixChars: null, position: null };

  // Array.from, not .length/.slice — keeps a CJK/emoji keyword's prefixes on
  // code point boundaries rather than splitting surrogate pairs.
  const chars = Array.from(kw);
  for (let n = 1; n < Math.min(chars.length, MAX_PREFIX_CHARS + 1); n++) {
    // A trailing space adds nothing Apple matches on — skip the request.
    if (chars[n - 1] === " ") continue;
    const hints = await fetchHints(chars.slice(0, n).join(""), storefront);
    if (!hints) return null;
    const idx = hints.indexOf(kw);
    if (idx >= 0) return { score: scoreAutocomplete(n, idx + 1), prefixChars: n, position: idx + 1 };
  }
  const pos = full.indexOf(kw) + 1;
  return { score: scoreAutocomplete(chars.length, pos), prefixChars: chars.length, position: pos };
}

// Weekly-cached autocomplete popularity for a keyword, shared across every
// app/workspace. null = not available (unsupported country, Apple error) —
// the caller should fall back to the rating-count volume, and nothing is
// cached so the next check retries.
export async function getIosAutocompleteVolume(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>, term: string, country: string
): Promise<number | null> {
  const normTerm = normalize(term);
  const normCountry = country.toLowerCase();
  if (!STOREFRONTS[normCountry.toUpperCase()]) return null;

  const { data } = await supabase
    .from("keyword_autocomplete_popularity")
    .select("score, checked_at")
    .eq("term", normTerm)
    .eq("country", normCountry)
    .maybeSingle();
  if (data && Date.now() - new Date(data.checked_at as string).getTime() < CACHE_TTL_MS) {
    return data.score as number;
  }

  const result = await fetchAutocompletePopularity(normTerm, normCountry);
  if (!result) return null;
  await supabase.from("keyword_autocomplete_popularity").upsert(
    {
      term: normTerm, country: normCountry, score: result.score,
      prefix_chars: result.prefixChars, position: result.position,
      checked_at: new Date().toISOString(),
    },
    { onConflict: "term,country" }
  );
  return result.score;
}

// Rating-count volume (computeIosVolume) is 5 below a 1,000-rating average,
// otherwise ~43 and up — real keywords mostly land in 43-80, so that band is
// stretched across the long-tail range rather than the full 43-100.
function longTailScore(ratingVolume: number) {
  if (ratingVolume <= NEVER_SUGGESTED_SCORE) return NEVER_SUGGESTED_SCORE;
  const t = (ratingVolume - 43) / (80 - 43);
  return Math.min(Math.max(NEVER_SUGGESTED_SCORE + 1 + Math.round(t * (LONG_TAIL_MAX - NEVER_SUGGESTED_SCORE - 1)), NEVER_SUGGESTED_SCORE + 1), LONG_TAIL_MAX);
}

// The iOS volume every writer stores: autocomplete popularity, with the
// rating-count estimate (ratingVolume) used to break ties among
// never-suggested keywords, and as the whole score whenever autocomplete
// isn't available (unsupported country, Apple hints error).
export async function resolveIosVolume(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>, term: string, country: string, ratingVolume: number
): Promise<number> {
  const autocomplete = await getIosAutocompleteVolume(supabase, term, country);
  if (autocomplete === null) return ratingVolume;
  if (autocomplete === NEVER_SUGGESTED_SCORE) return longTailScore(ratingVolume);
  return autocomplete;
}

// Quick ASO audit for cold outreach (Super Admin → Quick Audit): paste a
// store URL, get a pool of concrete findings ranked by severity, three of
// which drop into the reply template. Everything is read live from the public
// stores. The only writes are the ones a Keyword Inspector lookup makes anyway
// (shared search/popularity caches and today's keyword snapshots).
//
// The email leads with two keyword findings (see pickDefault):
//   kw-target     a keyword the owner is going after (Gemini reads the title,
//                 subtitle and description), looked up like the Keyword
//                 Inspector does (popularity, difficulty, rank, relevancy):
//                 a relevant, beatable one they're not top 10 for yet, one
//                 that's popular but very hard, or one barely searched.
//                 kw-target-2 is the next one, as an alternate
//   kw-longtail   long-tail sweet spots from the store's own autocomplete:
//                 decent volume, weaker competition, relevant to the app
// Everything else is an alternate the admin can swap in:
//   keywords      competitor title/subtitle terms the app's own title/subtitle
//                 lacks, checked through the Keyword Inspector's own pipeline
//                 (popularity, difficulty, rank all match appaso.io)
//   creatives     Gemini vision on the first screenshots; screenshot count and
//                 preview video vs the category's top apps
//   localization  big markets where the app still shows its default-language
//                 listing but most competitors have a localized one
//   ratings       average rating / rating count vs the category's top apps
//   metadata      empty/short subtitle, brand-only title, stale updates, thin
//                 Android description

import type { SupabaseClient } from "@supabase/supabase-js";
import type { StoreData, CategoryBenchmark } from "@/libs/contracts";
import { fetchStoreData, loadCategoryBenchmark } from "@/libs/store/load-benchmark";
import { itunesFetch } from "@/libs/store/appstore";
import { fetchIosCoreMetrics, fetchAndroidCoreMetrics } from "@/libs/keyword-core-metrics";
import { fetchStoreSuggestions } from "@/libs/keyword-autocomplete";
import { generateCombinations } from "@/libs/keyword-combinations";
import { estimateDailySearches } from "@/libs/keyword-impressions";
import { findRankIdx } from "@/libs/keyword-rank-match";
import { generateText, generateTextWithImages, type InlineImage } from "@/libs/gemini";
import { scoreAppsRelevancyBatch } from "@/libs/keyword-relevancy";
import { ALL_STOP_WORDS } from "@/libs/stopWords";
import { COUNTRY_MAP } from "@/libs/countries";

export type AuditStore = "ios" | "android";
export type AuditCategory = "keywords" | "creatives" | "localization" | "ratings" | "metadata";

export type AuditFinding = {
  id: string;
  category: AuditCategory;
  severity: number; // 0-100, higher = more worth leading with
  text: string; // the sentence that replaces {{FINDING_n}}
  toolLine?: string; // optional second line (the free-tool nudge)
  oneWord?: boolean; // pitches a single word ("sell"): only emailed if nothing better exists
  evidence: string; // admin-only context, never goes in the email
};

export type QuickAuditResult = {
  appName: string; // full store title
  shortName: string; // brand part of the title, for {{APP_NAME}}
  store: AuditStore;
  storeId: string;
  country: string;
  category: string;
  competitors: string[];
  findings: AuditFinding[];
  defaultSelection: string[]; // finding ids, in email order
  notes: string[]; // steps that couldn't run (Gemini off, search rate-limited...)
};

const TOOL_URL = "https://www.appaso.io/";

// ── Input ───────────────────────────────────────────────────────────────────

export function parseAppInput(raw: string, countryOverride?: string): { store: AuditStore; storeId: string; country: string } | null {
  const input = raw.trim();
  const override = countryOverride?.trim().toLowerCase() || null;

  const ios = input.match(/(?:apps|itunes)\.apple\.com\/(?:([a-z]{2})\/)?app\/(?:[^/?#]+\/)?id(\d+)/i);
  if (ios) return { store: "ios", storeId: ios[2], country: override ?? (ios[1]?.toLowerCase() || "us") };

  if (/play\.google\.com/i.test(input)) {
    try {
      const url = new URL(input.startsWith("http") ? input : `https://${input}`);
      const id = url.searchParams.get("id");
      if (id) return { store: "android", storeId: id, country: override ?? (url.searchParams.get("gl")?.toLowerCase() || "us") };
    } catch { /* fall through */ }
    return null;
  }

  const bareIos = input.match(/^(?:id)?(\d{6,})$/i);
  if (bareIos) return { store: "ios", storeId: bareIos[1], country: override ?? "us" };
  if (/^[a-z][\w]*(\.[\w]+)+$/i.test(input)) return { store: "android", storeId: input, country: override ?? "us" };
  return null;
}

// ── Text helpers ────────────────────────────────────────────────────────────

const segmenter = new Intl.Segmenter("und", { granularity: "word" });
const NO_SPACE_SCRIPT = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Thai}\p{Script=Lao}\p{Script=Khmer}\p{Script=Myanmar}]/u;
// Words every listing uses that nobody searches on their own.
const FILLER = new Set(["app", "apps", "free", "best", "new", "pro", "plus", "premium", "lite", "official", "online", "mobile", "easy", "simple", "top", "now", "get", "one", "all", "daily"]);

function words(text: string): string[] {
  const out: string[] = [];
  for (const { segment, isWordLike } of segmenter.segment(text.toLowerCase())) if (isWordLike) out.push(segment);
  return out;
}

function isOneWord(term: string) {
  return words(term).length < 2;
}

function isKeywordWord(w: string) {
  return w.length >= 2 && !ALL_STOP_WORDS.has(w) && !FILLER.has(w) && !/^\d+$/.test(w);
}

function extractTerms(text: string): string[] {
  const ws = words(text);
  const terms = new Set(ws.filter(isKeywordWord));
  for (let i = 0; i < ws.length - 1; i++) {
    const a = ws[i], b = ws[i + 1];
    if (isKeywordWord(a) && isKeywordWord(b)) terms.add(NO_SPACE_SCRIPT.test(a) && NO_SPACE_SCRIPT.test(b) ? a + b : `${a} ${b}`);
  }
  return [...terms];
}

// The part of a title before its tagline: "Calm: Sleep & Meditation" → "Calm".
// Without a separator, a CamelCase first word is the brand ("HabitNow Daily
// Routine Planner" → "HabitNow"); otherwise the whole title stays.
export function titleBrand(name: string) {
  const head = (name.split(/\s*[:|,–—]\s*|\s+-\s+/)[0] || name).trim();
  const first = head.split(/\s+/)[0];
  return head.split(/\s+/).length > 2 && /^\p{Lu}?\p{Ll}+\p{Lu}/u.test(first) ? first : head;
}

// A term is "covered" when every word of it already appears in the text.
function covers(textWords: Set<string>, term: string, joined: string) {
  if (NO_SPACE_SCRIPT.test(term)) return joined.includes(term);
  return term.split(" ").every((w) => textWords.has(w));
}

function listNames(names: string[], max = 3) {
  const shown = names.slice(0, max);
  if (names.length > max) return `${shown.join(", ")} and others`;
  return shown.length <= 2 ? shown.join(" and ") : `${shown.slice(0, -1).join(", ")} and ${shown[shown.length - 1]}`;
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) { const i = next++; out[i] = await fn(items[i]); }
  }));
  return out;
}

// ── Store access ────────────────────────────────────────────────────────────

type SearchHit = { id: string; name: string };

async function gplay() {
  const mod = await import("google-play-scraper");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (mod.default ?? mod) as any;
}

// A keyword check exactly as the Keyword Inspector runs it
// (libs/keyword-core-metrics.ts): same shared same-day search cache, same
// popularity/difficulty scoring, same snapshot writes. So every number in a
// finding is what the prospect sees when they look the keyword up on
// appaso.io, and the rank comes from that same result list.
type KeywordCheck = {
  term: string;
  popularity: number;
  difficulty: number;
  estDailySearches: number;
  hits: SearchHit[];
};

async function checkKeyword(admin: SupabaseClient, store: AuditStore, term: string, country: string): Promise<KeywordCheck | "rate_limited" | null> {
  const norm = term.toLowerCase().trim();
  // The core-metrics helpers are typed for the request-scoped client; the
  // admin client has the same query surface.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = admin as any;
  const core = store === "ios" ? await fetchIosCoreMetrics(client, norm, country) : await fetchAndroidCoreMetrics(client, norm, country);
  if (core === "rate_limited" || core === null) return core;
  const hits: SearchHit[] = store === "ios"
    ? (core.apps as { trackId: number; trackName: string }[]).map((a) => ({ id: String(a.trackId), name: a.trackName }))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    : (core.apps as any[]).map((a) => ({ id: String(a.appId ?? ""), name: String(a.title ?? "") }));
  return { term: norm, popularity: core.volume, difficulty: core.diff, estDailySearches: Math.round(estimateDailySearches(core.volume)), hits };
}

// iOS searches stay serial for Apple's per-IP limit (see fetchIosCoreMetrics);
// Play has no such limit.
async function checkKeywords(admin: SupabaseClient, store: AuditStore, terms: string[], country: string, notes: string[]) {
  let rateLimited = false;
  const results = await mapLimit(terms, store === "ios" ? 1 : 4, async (t) => {
    const r = await checkKeyword(admin, store, t, country).catch(() => null);
    if (r === "rate_limited") { rateLimited = true; return null; }
    return r;
  });
  if (rateLimited) notes.push("The App Store rate-limited some keyword checks; those keywords were skipped. Try again in a minute.");
  return new Map(terms.map((t, i) => [t, results[i]] as const));
}

function rankIn(hits: SearchHit[], appName: string, storeId: string): number | null {
  const idx = findRankIdx(hits.map((h) => h.name), appName, hits.map((h) => h.id), storeId);
  return idx >= 0 ? idx + 1 : null;
}

function metricsLine(k: KeywordCheck, rank: number | null, relevancy?: number | null) {
  return `Popularity ${k.popularity}/100 · difficulty ${k.difficulty}/100 · ~${k.estDailySearches.toLocaleString("en-US")} searches/day · rank ${rank ?? `not in the ${k.hits.length} results`}${relevancy != null ? ` · relevancy ${relevancy}/100` : ""}`;
}

// Relevancy as the Keyword Inspector's column scores it (same LLM rules and
// embedding blend), for this one app against the keyword's top results as
// market context. Scoring the app alone rather than in the Inspector's
// top-10 batch can land a few points off what appaso.io shows. null when the
// LLM gave no usable reply.
async function relevancyFor(k: KeywordCheck, storeId: string, data: NonNullable<StoreData>): Promise<number | null> {
  const scores = await scoreAppsRelevancyBatch(
    k.term,
    [{ id: storeId, name: data.name ?? "", subtitle: data.subtitle ?? "", description: data.description ?? "" }],
    k.hits.slice(0, 10).map((h) => h.name),
  ).catch(() => null);
  return scores?.[storeId] ?? null;
}

// ── Seeds: the generic searches this app should show up for ─────────────────

// One Gemini read of the listing for two lists:
//   targeted  what the owner is clearly trying to rank for, judged from the
//             title, subtitle and description together and phrased as a
//             search ("SMS Spam Text Blocker" → "spam text blocker", not the
//             "text blocker" a word split would give)
//   seeds     the generic searches someone who doesn't know the app would type
// Without Gemini, targeted falls back to splitting the title/subtitle and
// seeds to the subtitle's own words.
async function analyzeListing(
  data: NonNullable<StoreData>, country: string, brandWords: Set<string>, notes: string[],
): Promise<{ seeds: string[]; targeted: string[] }> {
  const appName = data.name ?? "";
  const fallbackTargeted = () => targetedTerms(appName, data.subtitle, brandWords);
  const prompt = `You are an App Store Optimization expert. Below is an app listing in the ${COUNTRY_MAP[country.toUpperCase()] ?? country.toUpperCase()} store.
Title: ${data.name}
Subtitle / short description: ${data.subtitle}
Category: ${data.primaryGenreName}
Description (excerpt): ${data.description.slice(0, 1500)}

1. "targeted": the 4 search keywords the developer is clearly trying to rank for, judging from which words they put in the title and subtitle and what the description keeps coming back to. Phrase each the way a person types it into store search (2 or 3 words, lowercase), combining words across the title and subtitle where that's the real search (e.g. title "SMS Spam Text Blocker" → "spam text blocker", "sms blocker"). Most important first. No brand or app names.
2. "seeds": the 3 generic search terms (2 words each, lowercase) that someone who doesn't know this app would type to find an app like it. No brand names, no app names.
All terms in the language people in that store search in.
Reply with JSON only: {"targeted": ["...", "...", "...", "..."], "seeds": ["...", "...", "..."]}`;
  const raw = await generateText(prompt);
  const clean = (v: unknown) => (Array.isArray(v) ? v : [])
    .filter((t): t is string => typeof t === "string" && !!t.trim())
    .map((t) => t.toLowerCase().trim().replace(/\s+/g, " "));
  try {
    const parsed = JSON.parse((raw ?? "").replace(/^```(?:json)?\s*|\s*```$/g, ""));
    const seeds = [...new Set(clean(parsed.seeds))].slice(0, 3);
    const targeted = [...new Set(clean(parsed.targeted))]
      .filter((t) => words(t).length >= 1 && words(t).length <= 4 && !words(t).some((w) => brandWords.has(w)))
      .slice(0, 4);
    if (seeds.length) return { seeds, targeted: targeted.length ? targeted : fallbackTargeted() };
  } catch { /* fallback below */ }

  notes.push("Gemini unavailable for the listing analysis; used the title and subtitle's own words instead.");
  const brand = new Set(words(titleBrand(appName)));
  const fromListing = extractTerms(`${appName} ${data.subtitle}`).filter((t) => !t.split(" ").some((w) => brand.has(w)));
  const bigrams = fromListing.filter((t) => t.includes(" "));
  const seeds = [...bigrams.slice(0, 2), ...fromListing.filter((t) => !t.includes(" ")).slice(0, 1)];
  return { seeds: seeds.length ? seeds : [data.primaryGenreName.toLowerCase()], targeted: fallbackTargeted() };
}

// ── Keyword findings ────────────────────────────────────────────────────────

type Competitor = { id: string; data: NonNullable<StoreData> };

async function keywordFindings(
  admin: SupabaseClient, store: AuditStore, storeId: string, country: string,
  data: NonNullable<StoreData>, shortName: string, notes: string[],
): Promise<{ findings: AuditFinding[]; competitors: Competitor[] }> {
  const appName = data.name ?? "";
  // One-word brands only: a multi-word title head like "Water Reminder" is
  // a generic phrase, not a name to keep out of keyword ideas.
  const oneWordBrand = (name: string) => { const b = words(titleBrand(name)); return b.length === 1 ? b : []; };
  const { seeds, targeted: aiTargeted } = await analyzeListing(data, country, new Set(oneWordBrand(appName)), notes);

  // Every keyword check goes through the Inspector pipeline once per term.
  const checked = new Map<string, KeywordCheck | null>();
  const check = async (terms: string[]) => {
    const todo = [...new Set(terms.map((t) => t.toLowerCase().trim()))].filter((t) => t && !checked.has(t));
    for (const [t, r] of await checkKeywords(admin, store, todo, country, notes)) checked.set(t, r);
  };
  const got = (t: string) => checked.get(t.toLowerCase().trim()) ?? null;

  // Competitors: apps that show up most (and highest) across the seed searches.
  await check(seeds);
  if (seeds.every((s) => !got(s))) notes.push("Store search failed for every seed term; keyword findings skipped.");
  const score = new Map<string, number>();
  for (const s of seeds) {
    (got(s)?.hits ?? []).filter((h) => h.id !== storeId).slice(0, 10)
      .forEach((h, i) => score.set(h.id, (score.get(h.id) ?? 0) + (10 - i)));
  }
  const competitorIds = [...score.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id]) => id);
  const competitors = (await Promise.all(competitorIds.map(async (id) => ({ id, data: await fetchStoreData(store, id, id, country) }))))
    .filter((c): c is Competitor => !!c.data);

  const ownText = `${appName} ${data.subtitle}`.toLowerCase();
  const ownWords = new Set(words(ownText));
  const brandWords = new Set([
    ...oneWordBrand(appName),
    ...competitors.flatMap((c) => oneWordBrand(c.data.name ?? "")),
  ]);
  const hasBrand = (t: string) => words(t).some((w) => brandWords.has(w));

  const findings: AuditFinding[] = [];
  const subField = store === "ios" ? "subtitle" : "short description";
  const fieldPhrase = store === "ios" ? "subtitle" : "title and short description";
  const fieldVerb = store === "ios" ? "doesn't" : "don't";
  // Play sometimes returns only a dozen results; missing from those says
  // nothing about rank.
  const deep = (k: KeywordCheck) => k.hits.length >= 50;
  const rankSentence = (rank: number | null, k: KeywordCheck) => rank == null
    ? deep(k) ? " You don't rank for it at all right now." : ""
    : rank > 10 ? ` You currently rank #${rank} for it.` : "";
  const volumeWord = (v: number) => v >= 55 ? "high-volume" : v >= 35 ? "popular" : "relevant";
  const toolLine = (kw: string) => `You can check this yourself for free in our tool: ${TOOL_URL} (just search ${shortName} and look up "${kw}")`;
  const perDay = (k: KeywordCheck) => `~${k.estDailySearches.toLocaleString("en-US")} searches a day`;

  // Relevancy per keyword, scored once and only for terms that could make a
  // finding (each is an LLM call). Unknown (LLM down) never filters a term out.
  const relevancy = new Map<string, number | null>();
  let relevancyMissed = false;
  const scoreRelevancy = async (ks: KeywordCheck[]) => {
    await mapLimit(ks.filter((k) => !relevancy.has(k.term)), 4, async (k) => {
      const r = await relevancyFor(k, storeId, data);
      if (r == null) relevancyMissed = true;
      relevancy.set(k.term, r);
    });
  };
  const rel = (k: KeywordCheck) => relevancy.get(k.term) ?? null;
  const relevantEnough = (k: KeywordCheck, min: number) => { const r = rel(k); return r == null || r >= min; };

  // ── 1. The keywords the owner is going after (Gemini's read of the
  // listing), each looked up like the Keyword Inspector does. Three stories:
  //   opportunity  relevant, real volume, beatable, but not top 10 yet
  //   hard         popular but dominated by big apps, not top 10
  //   low          barely searched, so the space it takes is wasted
  const targeted = aiTargeted.filter((t) => !hasBrand(t));
  await check(targeted);
  const targetChecks = targeted.map((t) => got(t)).filter((k): k is KeywordCheck => !!k);
  await scoreRelevancy(targetChecks);
  const titleWords = new Set(words(appName));
  // Where the keyword lives in the listing. Gemini can name a phrase the
  // listing only describes; on iOS the description isn't indexed, which is
  // its own point to make.
  const whereIs = (t: string): "title" | "subtitle" | "listing" | "description" =>
    covers(titleWords, t, appName.toLowerCase()) ? "title"
      : covers(new Set(words(data.subtitle ?? "")), t, (data.subtitle ?? "").toLowerCase()) ? "subtitle"
      : covers(ownWords, t, ownText) ? "listing" : "description";
  type Target = { k: KeywordCheck; rank: number | null; kind: "opportunity" | "hard" | "low"; where: ReturnType<typeof whereIs>; order: number };
  const targets: Target[] = [];
  for (const [order, k] of targetChecks.entries()) {
    const rank = rankIn(k.hits, appName, storeId);
    const where = whereIs(k.term);
    const top10 = rank != null && rank <= 10;
    const r = rel(k);
    if (!top10 && (r == null || r >= 60) && k.popularity >= 30 && k.difficulty <= 60 && (rank != null || deep(k))) targets.push({ k, rank, kind: "opportunity", where, order });
    else if (!top10 && k.popularity >= 45 && k.difficulty >= 65) targets.push({ k, rank, kind: "hard", where, order });
    // A term only the description mentions takes no title/subtitle space.
    else if (k.popularity <= 20 && where !== "description") targets.push({ k, rank, kind: "low", where, order });
  }
  // Phrases before single words, then opportunity → hard → low. Within a
  // kind: the term Gemini ranked as more important to the owner first.
  const kindOrder = { opportunity: 0, hard: 1, low: 2 } as const;
  targets.sort((a, b) => Number(isOneWord(a.k.term)) - Number(isOneWord(b.k.term)) || kindOrder[a.kind] - kindOrder[b.kind] || a.order - b.order);
  const fieldName = (w: Target["where"]) => w === "title" ? "title" : w === "subtitle" ? subField : w === "listing" ? `title and ${subField}` : "description";
  const targetText = ({ k, rank, kind, where }: Target) => {
    const leaders = k.hits.filter((h) => h.id !== storeId).slice(0, 3).map((h) => titleBrand(h.name));
    const r = rel(k);
    const fit = r != null && r >= 80 ? "exactly what your app does" : "a strong fit for your app";
    if (kind === "opportunity") {
      const standing = rank == null ? "but you don't rank for it at all right now" : `but you're only at #${rank}`;
      const fix = where === "description" && store === "ios"
        ? ` It's only in your description, which the App Store doesn't index for search, so putting it in your ${subField} or keyword field is the fastest win.`
        : " The top 10 is realistic here with the right metadata.";
      const competition = k.difficulty < 10 ? "almost no competition" : `beatable competition (difficulty ${k.difficulty}/100)`;
      return `Your listing goes after "${k.term}", ${fit}, with ${perDay(k)} and ${competition}, ${standing}.${fix}`;
    }
    if (kind === "hard") {
      return `Your ${fieldName(where)} targets "${k.term}", which gets ${perDay(k)} but has a difficulty of ${k.difficulty}/100, with ${listNames(leaders)} holding the top spots.${rank != null && rank <= 20 ? ` You're at #${rank}, just off the first page, where most of the taps happen.` : rank != null ? ` You're at #${rank}, so that keyword space isn't bringing you much traffic yet.` : deep(k) ? " You don't rank for it at all right now, so that keyword space isn't bringing you much traffic yet." : " That's a tough keyword to win traffic from right now."}`;
    }
    return `Your ${fieldName(where)} spends space on "${k.term}", which barely gets searched (${perDay(k)}, popularity ${k.popularity}/100). Those characters could be working a lot harder for you.`;
  };
  const target = targets[0];
  for (const [i, t] of targets.slice(0, 2).entries()) {
    findings.push({
      id: i === 0 ? "kw-target" : "kw-target-2",
      category: "keywords",
      severity: 96 - i * 6,
      text: targetText(t),
      toolLine: toolLine(t.k.term),
      oneWord: isOneWord(t.k.term),
      evidence: `Targeted (${t.kind}, in ${fieldName(t.where)}) · ${metricsLine(t.k, t.rank, rel(t.k))}`,
    });
  }

  // ── 2. Long-tail sweet spots: real autocomplete searches around the app's
  // core terms with decent volume and weaker competition.
  // Autocomplete mixes app names in with real searches ("granola note
  // taker", "notee: ai note taker"). A word that is some search result's
  // one-word brand, and not part of this app's own vocabulary, marks one.
  const vocab = new Set([...ownWords, ...seeds.flatMap((t) => words(t))]);
  const resultBrands = new Set<string>();
  for (const k of checked.values()) {
    for (const h of (k?.hits ?? []).slice(0, 60)) {
      const b = words(titleBrand(h.name));
      if (b.length === 1 && !vocab.has(b[0])) resultBrands.add(b[0]);
    }
  }
  const notASearch = (t: string) => hasBrand(t) || /[:™®&|]/.test(t) || words(t).some((w) => resultBrands.has(w) || FILLER.has(w));

  const longTailSeeds = [...new Set([...seeds, ...targeted.filter((t) => t.includes(" "))])].slice(0, 4);
  // Two-word terms go first so they survive the cap on keyword checks below.
  const isTwoWords = (t: string) => words(t).length === 2;
  const suggestions = (await longTailCandidates(store, country, longTailSeeds, notASearch))
    .filter((t) => !targeted.includes(t) && !seeds.includes(t))
    .sort((a, b) => Number(isTwoWords(b)) - Number(isTwoWords(a)));
  await check(suggestions.slice(0, 8));
  const sweet = suggestions
    .map((t) => got(t))
    .filter((k): k is KeywordCheck => !!k && k.popularity >= 30)
    // Name check against the suggestion's own results, as topBrandRatings in
    // libs/keyword-autocomplete.ts does: a word only one or two result titles
    // use, and that a top result's title starts with, is an app name
    // ("meettrail" in "meettrail meeting recorder"); generic words show up in many.
    .filter((k) => !words(k.term).some((w) => !vocab.has(w)
      && k.hits.slice(0, 30).filter((h) => words(h.name).includes(w)).length <= 2
      && k.hits.slice(0, 3).some((h) => words(h.name)[0] === w)))
    .map((k) => ({ k, rank: rankIn(k.hits, appName, storeId) }))
    .filter(({ rank }) => rank == null || rank > 10);
  // "Weaker competition" is relative: in a crowded niche every keyword's top
  // results are big apps, so the bar is the hard keyword above (or 60).
  const maxDiff = Math.max(60, target?.kind === "hard" ? target.k.difficulty - 3 : 0);
  // Only what the app actually does: autocomplete around "spam blocker"
  // happily offers "unknown call blocker" to an SMS-only app.
  const inReach = sweet.filter(({ k }) => k.difficulty <= maxDiff);
  await scoreRelevancy(inReach.map(({ k }) => k));
  // Prefer ~100+ searches a day (popularity 40); thinner ones only when
  // nothing better exists.
  const viable = inReach.filter(({ k }) => relevantEnough(k, 50))
    .sort((a, b) => (b.k.popularity - 0.8 * b.k.difficulty) - (a.k.popularity - 0.8 * a.k.difficulty));
  const strong = viable.filter(({ k }) => k.popularity >= 40);
  // Within that pool, two-word terms read best in the email; longer ones only
  // fill the slots two-word terms can't.
  const pool = strong.length ? strong : viable;
  const picks = [...pool.filter(({ k }) => isTwoWords(k.term)), ...pool.filter(({ k }) => !isTwoWords(k.term))].slice(0, 2);
  if (picks.length) {
    const describe = ({ k }: (typeof picks)[number]) => `"${k.term}" (${perDay(k)}, difficulty ${k.difficulty}/100)`;
    // Where to put it: a long tail like "food tracker protein" reads oddly as
    // a title. iOS combines words across title, subtitle and the keyword
    // field, so naming the missing words is the concrete advice; Play has no
    // keyword field and indexes the descriptions instead.
    const first = picks[0].k.term;
    const missing = words(first).filter((w) => !ownWords.has(w));
    const placement = store === "ios"
      ? missing.length && missing.length < words(first).length
        ? ` You don't need the exact phrase in your title: the App Store combines words from your title, subtitle and keyword field, so adding "${missing.join(" ")}" to your subtitle or keyword field lets you compete for "${first}".`
        : " You don't need these as exact phrases in your title: the App Store combines words from your title, subtitle and keyword field, so spreading the words across your subtitle and keyword field is enough."
      : " They don't belong in your title as-is: work them naturally into your short description and full description, which Google Play indexes for search.";
    findings.push({
      id: "kw-longtail",
      category: "keywords",
      severity: 94,
      // The "hundreds to thousands" line only when the best pick backs it up
      // (popularity 40 is ~100 searches a day); otherwise a claim the numbers
      // right before it would contradict.
      text: `The sweet spot for you is long-tail keywords with real search volume and weaker competition, like ${picks.map(describe).join(" and ")}. ${Math.max(...picks.map(({ k }) => k.popularity)) >= 40
        ? "Ranking for just one long-tail keyword like these can bring hundreds to thousands of impressions a day."
        : "Each one you rank for adds steady daily impressions you're not getting today, and they're less contested than the big head terms."}${placement}`,
      toolLine: toolLine(picks[0].k.term),
      evidence: picks.map(({ k, rank }) => `${k.term}: ${metricsLine(k, rank, rel(k))}`).join(" | "),
    });
  }

  // ── Alternates: competitor terms the listing lacks, and core searches the
  // app barely ranks for.
  const shared = (() => {
    const usedBy = new Map<string, string[]>();
    for (const c of competitors) {
      for (const t of extractTerms(`${c.data.name} ${c.data.subtitle}`)) {
        if (hasBrand(t)) continue;
        usedBy.set(t, [...(usedBy.get(t) ?? []), titleBrand(c.data.name ?? c.id)]);
      }
    }
    return [...usedBy.entries()].filter(([t, names]) => names.length >= 2 && !covers(ownWords, t, ownText));
  })();
  // A word that only rides along inside a shared phrase ("relief" in
  // "anxiety relief") is pitched as the phrase, not the bare word.
  const gaps = shared
    .filter(([t, names]) => t.includes(" ") || !shared.some(([p, pn]) => p.includes(" ") && p.split(" ").includes(t) && pn.length >= names.length))
    .sort((a, b) => Number(isOneWord(a[0])) - Number(isOneWord(b[0])) || b[1].length - a[1].length || b[0].split(" ").length - a[0].split(" ").length)
    .filter(([t]) => !seeds.includes(t))
    .slice(0, 3);
  await check(gaps.map(([t]) => t));
  await scoreRelevancy(gaps.map(([t]) => got(t)).filter((k): k is KeywordCheck => !!k && k.popularity > 15));

  const rankedGaps = gaps
    .map(([t, names]) => ({ names, k: got(t) }))
    .filter((g): g is { names: string[]; k: KeywordCheck } => !!g.k && g.k.popularity > 15 && relevantEnough(g.k, 40))
    // Already top 10 without it in the listing: nothing to pitch.
    .filter(({ k }) => { const r = rankIn(k.hits, appName, storeId); return r == null || r > 10; })
    .sort((a, b) => Number(isOneWord(a.k.term)) - Number(isOneWord(b.k.term)) || b.k.popularity - a.k.popularity || b.names.length - a.names.length)
    .slice(0, 2);
  for (const [i, { names, k }] of rankedGaps.entries()) {
    const rank = rankIn(k.hits, appName, storeId);
    findings.push({
      id: `kw-gap-${i}`,
      category: "keywords",
      severity: Math.min(90, Math.round(45 + k.popularity * 0.4 + (rank == null || rank > 30 ? 8 : 0)) - i * 8),
      text: `Your ${fieldPhrase} ${fieldVerb} include "${k.term}", a ${volumeWord(k.popularity)} term ${names.length} of your top ${competitors.length} competitors (${listNames(names)}) use in theirs.${rankSentence(rank, k)}`,
      toolLine: toolLine(k.term),
      oneWord: isOneWord(k.term),
      evidence: `${metricsLine(k, rank, rel(k))} · used by ${names.join(", ")}`,
    });
  }

  await scoreRelevancy(seeds.map((t) => got(t)).filter((k): k is KeywordCheck => !!k && k.popularity >= 35));
  for (const [i, seed] of seeds.entries()) {
    const k = got(seed);
    if (!k || k.popularity < 35 || !relevantEnough(k, 40)) continue;
    // Already pitched as a targeted keyword.
    if (targets.slice(0, 2).some((t) => t.k.term === k.term)) continue;
    const rank = rankIn(k.hits, appName, storeId);
    if (rank != null && rank <= 15) continue;
    if (rank == null && !deep(k)) continue;
    const leaders = k.hits.filter((h) => h.id !== storeId).slice(0, 3).map((h) => titleBrand(h.name));
    findings.push({
      id: `kw-core-${i}`,
      category: "keywords",
      severity: Math.min(88, Math.round(40 + k.popularity * 0.4 + (rank == null ? 10 : 0))),
      text: `${rank == null ? "You don't rank at all" : `You're only ranking #${rank}`} for "${k.term}", one of the main searches for apps like yours, where ${listNames(leaders)} take the top spots.`,
      toolLine: toolLine(k.term),
      oneWord: isOneWord(k.term),
      evidence: `Core search · ${metricsLine(k, rank, rel(k))}`,
    });
  }
  if (relevancyMissed) notes.push("Gemini couldn't score relevancy for some keywords; those weren't filtered on relevancy.");

  return { findings, competitors };
}

// The keywords a listing is visibly going after: phrases from its title and
// subtitle, split at punctuation so "Note Taker, Summary" never yields
// "taker summary". Phrases first; a single word only when no phrase covers it.
function targetedTerms(title: string, subtitle: string, brandWords: Set<string>): string[] {
  const chunks = `${title}|${subtitle}`.split(/[|,:;&+–—\-/()]+/).map((c) => c.trim()).filter(Boolean);
  const phrases: string[] = [], singles: string[] = [];
  for (const chunk of chunks) {
    for (const t of extractTerms(chunk)) {
      if (words(t).some((w) => brandWords.has(w))) continue;
      (t.includes(" ") || NO_SPACE_SCRIPT.test(t) && t.length > 2 ? phrases : singles).push(t);
    }
  }
  const uniq = [...new Set(phrases)];
  const loose = [...new Set(singles)].filter((w) => w.length >= 3 && !uniq.some((p) => p.split(" ").includes(w)));
  return [...uniq, ...loose].slice(0, 4);
}

// Long-tail ideas straight from the store's autocomplete: what people
// actually type after each core term, most-suggested first. Gemini
// combinations only fill in when autocomplete has little to offer.
async function longTailCandidates(store: AuditStore, country: string, seeds: string[], notASearch: (t: string) => boolean): Promise<string[]> {
  const out: string[] = [];
  const add = (t: string, seed: string) => {
    const n = t.toLowerCase().trim().replace(/\s+/g, " ");
    const len = n.split(" ").length;
    if (n === seed || len < 2 || len > 4 || notASearch(n) || out.includes(n)) return;
    if (!seed.split(" ").some((w) => n.split(" ").includes(w))) return;
    out.push(n);
  };
  const lists = await Promise.all(seeds.map(async (seed) => {
    const [a, b] = await Promise.all([fetchStoreSuggestions(`${seed} `, country, store), fetchStoreSuggestions(seed, country, store)]);
    return { seed, hints: [...(a ?? []), ...(b ?? [])] };
  }));
  // Interleave seeds so one seed's suggestions don't crowd out the rest.
  for (let i = 0; i < 10; i++) for (const { seed, hints } of lists) if (hints[i]) add(hints[i], seed);
  if (out.length < 4 && seeds[0]) {
    for (const t of await generateCombinations(seeds[0], 6, "", "").catch(() => [] as string[])) add(t, seeds[0]);
  }
  return out;
}

// ── Creative findings ───────────────────────────────────────────────────────

async function fetchImage(url: string): Promise<InlineImage | null> {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const mimeType = (res.headers.get("content-type") ?? "image/jpeg").split(";")[0];
    if (!mimeType.startsWith("image/")) return null;
    return { mimeType, data: Buffer.from(await res.arrayBuffer()).toString("base64") };
  } catch {
    return null;
  }
}

async function screenshotFinding(store: AuditStore, data: NonNullable<StoreData>, notes: string[]): Promise<AuditFinding | null> {
  const urls = data.screenshotUrls.slice(0, 3).map((u) => store === "android" && !u.includes("=") ? `${u}=w540` : u);
  if (!urls.length) return null;
  const images = (await Promise.all(urls.map(fetchImage))).filter((i): i is InlineImage => !!i);
  if (!images.length) return null;

  const prompt = `You are an App Store Optimization expert reviewing the first ${images.length} screenshots (in order) of the store listing for "${data.name}" (${data.primaryGenreName}). Its subtitle is "${data.subtitle}".
Most install decisions are made on the first two screenshots, in about a second. Judge them on: does each lead with a clear benefit caption (not a feature label), show the core value or outcome rather than settings, onboarding, login, empty states or a busy UI, use text readable at thumbnail size, and give a reason to pick this app over others?
Reply with JSON only: {"score": <1-10, 10 = excellent>, "issue": "<one sentence to the developer, starting with 'Your first two screenshots' or 'Your screenshots', saying concretely what they show and why it costs installs. Plain conversational English, no em dashes, no jargon. Example: Your first two screenshots show settings screens instead of the core value, and that's where most install decisions happen.>"}`;
  const raw = await generateTextWithImages(prompt, images, { json: true });
  if (!raw) { notes.push("Gemini unavailable for the screenshot review."); return null; }
  try {
    const parsed = JSON.parse(raw.replace(/^```(?:json)?\s*|\s*```$/g, ""));
    const s = Number(parsed.score);
    const issue = String(parsed.issue ?? "").replace(/\s*[—–]\s*/g, ", ").trim();
    if (!issue || !Number.isFinite(s) || s >= 8) return null;
    return {
      id: "shots-ai",
      category: "creatives",
      severity: s <= 4 ? 88 : s <= 6 ? 70 : 45,
      text: issue,
      evidence: `Gemini screenshot score ${s}/10 on the first ${images.length}`,
    };
  } catch {
    return null;
  }
}

function creativeBenchmarkFindings(store: AuditStore, data: NonNullable<StoreData>, bench: CategoryBenchmark): AuditFinding[] {
  if (!bench) return [];
  const out: AuditFinding[] = [];
  const count = data.screenshotUrls.length;
  // The iOS page scrape stops at 6, so only a clearly short set is flagged there.
  const short = store === "ios" ? count > 0 && count <= 3 && bench.avgScreenshotCount >= 5 : count > 0 && count < bench.avgScreenshotCount - 2;
  if (short) {
    out.push({
      id: "shots-count",
      category: "creatives",
      severity: 50,
      text: `You only have ${count} screenshots, while the top ${bench.genreName} apps average ${bench.avgScreenshotCount}, so you're leaving most of your page's selling space empty.`,
      evidence: `${count} vs avg ${bench.avgScreenshotCount} across ${bench.peerCount} top ${bench.genreName} apps`,
    });
  }
  if (!data.hasPreviewVideo && bench.pctWithPreviewVideo >= 40) {
    out.push({
      id: "video",
      category: "creatives",
      severity: Math.round(35 + bench.pctWithPreviewVideo / 4),
      text: `You don't have an app preview video, while ${bench.pctWithPreviewVideo}% of the top ${bench.genreName} apps do. It autoplays in search results and is one of the easiest conversion wins.`,
      evidence: `${bench.pctWithPreviewVideo}% of ${bench.peerCount} top apps have a video`,
    });
  }
  return out;
}

// ── Localization finding ────────────────────────────────────────────────────

const MARKETS: { code: string; lang: string; hl: string }[] = [
  { code: "de", lang: "German", hl: "de" },
  { code: "jp", lang: "Japanese", hl: "ja" },
  { code: "fr", lang: "French", hl: "fr" },
  { code: "br", lang: "Portuguese", hl: "pt-BR" },
  { code: "kr", lang: "Korean", hl: "ko" },
  { code: "es", lang: "Spanish", hl: "es" },
];
const ENGLISH_STOREFRONTS = new Set(["us", "gb", "ca", "au", "nz", "ie", "ph", "sg", "in", "za"]);

function fingerprint(desc: string) {
  return desc.replace(/\s+/g, " ").trim().slice(0, 160).toLowerCase();
}

// Description per app id in one storefront, or undefined when not listed there.
async function descriptionsIn(store: AuditStore, ids: string[], market: { code: string; hl: string }): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (store === "ios") {
    const res = await itunesFetch(`https://itunes.apple.com/lookup?id=${ids.join(",")}&country=${market.code}`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const results: any[] = res ? ((await res.json().catch(() => null))?.results ?? []) : [];
    for (const r of results) out.set(String(r.trackId), String(r.description ?? ""));
    return out;
  }
  const api = await gplay();
  await mapLimit(ids, 4, async (id) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const r: any = await api.app({ appId: id, country: market.code, lang: market.hl });
      out.set(id, String(r.description ?? ""));
    } catch { /* not listed there */ }
  });
  return out;
}

async function localizationFinding(
  store: AuditStore, storeId: string, country: string, data: NonNullable<StoreData>, competitors: Competitor[],
): Promise<AuditFinding | null> {
  const peers = competitors.slice(0, store === "ios" ? 5 : 4);
  if (peers.length < 2) return null;
  const markets = MARKETS.filter((m) => m.code !== country).slice(0, store === "ios" ? 6 : 4);
  const base = new Map([[storeId, fingerprint(data.description)], ...peers.map((p) => [p.id, fingerprint(p.data.description)] as const)]);

  let best: { market: (typeof MARKETS)[number]; localized: string[] } | null = null;
  for (const market of markets) {
    const descs = await descriptionsIn(store, [storeId, ...peers.map((p) => p.id)], market);
    const own = descs.get(storeId);
    if (own === undefined || fingerprint(own) !== base.get(storeId)) continue; // not listed there, or already localized
    const localized = peers.filter((p) => { const d = descs.get(p.id); return d !== undefined && fingerprint(d) !== base.get(p.id); })
      .map((p) => titleBrand(p.data.name ?? p.id));
    if (localized.length >= 2 && (!best || localized.length > best.localized.length)) best = { market, localized };
  }
  if (!best) return null;

  const marketName = COUNTRY_MAP[best.market.code.toUpperCase()] ?? best.market.code.toUpperCase();
  const baseLang = ENGLISH_STOREFRONTS.has(country) ? "English" : "default-language";
  const langNote = store === "ios" && data.languageCount ? ` (your app lists ${data.languageCount} language${data.languageCount === 1 ? "" : "s"})` : "";
  return {
    id: "l10n",
    category: "localization",
    severity: Math.min(85, 40 + best.localized.length * 10),
    text: `You're not localized for ${marketName}: your listing there still shows your ${baseLang} copy, while ${best.localized.length} of your top ${peers.length} competitors (${listNames(best.localized)}) have a ${best.market.lang} listing.`,
    evidence: `Checked ${markets.map((m) => m.code.toUpperCase()).join(", ")}${langNote}`,
  };
}

// ── Ratings + metadata findings ─────────────────────────────────────────────

function ratingFindings(data: NonNullable<StoreData>, bench: CategoryBenchmark): AuditFinding[] {
  const out: AuditFinding[] = [];
  const rating = data.rating ?? 0;
  if (rating > 0 && bench?.avgRating && rating < 4.3 && bench.avgRating - rating >= 0.3) {
    const gap = bench.avgRating - rating;
    out.push({
      id: "rating",
      category: "ratings",
      severity: Math.min(85, Math.round(45 + gap * 30)),
      text: `Your rating is ${rating.toFixed(1)} against a ${bench.avgRating.toFixed(1)} average for the top ${bench.genreName} apps, which costs you both conversion and search rank. A well-timed in-app review prompt usually closes a lot of that gap.`,
      evidence: `${rating.toFixed(2)} (${data.ratingCount ?? 0} ratings) vs ${bench.avgRating}`,
    });
  }
  const count = data.ratingCount ?? 0;
  if (bench?.medianRatingCount && count < bench.medianRatingCount / 20) {
    out.push({
      id: "rating-count",
      category: "ratings",
      severity: 42,
      text: `You have ${count.toLocaleString("en-US")} ratings while the top ${bench.genreName} apps sit at a median of ${Math.round(bench.medianRatingCount).toLocaleString("en-US")}. Rating volume feeds ranking, so an in-app review prompt after a success moment would help.`,
      evidence: `${count} vs median ${Math.round(bench.medianRatingCount)}`,
    });
  }
  return out;
}

function metadataFindings(store: AuditStore, data: NonNullable<StoreData>, bench: CategoryBenchmark): AuditFinding[] {
  const out: AuditFinding[] = [];
  const name = data.name ?? "";
  const sub = data.subtitle.trim();
  const subLimit = store === "ios" ? 30 : 80;
  const subLabel = store === "ios" ? "subtitle" : "short description";

  if (!sub) {
    out.push({
      id: "sub-empty", category: "metadata", severity: 82,
      text: `You don't have a ${subLabel} set, which leaves ${subLimit} characters of heavily weighted keyword space empty.`,
      evidence: "Empty",
    });
  } else if (sub.length < subLimit * 0.65) {
    out.push({
      id: "sub-short", category: "metadata", severity: 52,
      text: `Your ${subLabel} only uses ${sub.length} of ${subLimit} characters, so you're leaving keyword space on the table in one of the fields the store weights most.`,
      evidence: `"${sub}"`,
    });
  }
  if (name.length <= 14 && titleBrand(name) === name.trim()) {
    out.push({
      id: "title-brand", category: "metadata", severity: 60,
      text: `Your title is just your brand name ("${name}"), using ${name.length} of 30 characters. Adding your main keyword after it is usually the single biggest ranking lever.`,
      evidence: `${name.length} chars, no keyword after the brand`,
    });
  }
  const days = data.lastUpdatedAt ? Math.round((Date.now() - data.lastUpdatedAt) / 86_400_000) : null;
  if (days != null && days > 120 && (bench?.avgDaysSinceUpdate ?? 999) < 60) {
    out.push({
      id: "stale", category: "metadata", severity: 38,
      text: `Your last update was ${days >= 730 ? `over ${Math.floor(days / 365)} years` : days >= 60 ? `${Math.round(days / 30)} months` : `${days} days`} ago, while the top ${bench!.genreName} apps update about every ${bench!.avgDaysSinceUpdate} days. Regular updates are a freshness signal and a free chance to re-test metadata.`,
      evidence: `${days}d vs ${bench!.avgDaysSinceUpdate}d avg`,
    });
  }
  if (store === "android" && data.description.length < 1500 && (bench?.avgDescriptionLength ?? 0) > 2500) {
    out.push({
      id: "desc-short", category: "metadata", severity: 48,
      text: `Your description is ${data.description.length.toLocaleString("en-US")} characters while top ${bench!.genreName} apps average ${bench!.avgDescriptionLength.toLocaleString("en-US")}. On Google Play the description is indexed for search, so that's ranking potential left unused.`,
      evidence: `${data.description.length} vs ${bench!.avgDescriptionLength}`,
    });
  }
  return out;
}

// ── Selection ───────────────────────────────────────────────────────────────

export const MAX_PICKS = 2;

// Keyword-first: the targeted-keyword finding, then the long-tail sweet
// spot (or the second targeted keyword when there's no long tail). Any slot
// those can't fill goes to the next strongest finding.
function pickDefault(findings: AuditFinding[]): string[] {
  const preferred = ["kw-target", "kw-longtail", "kw-target-2"].filter((id) => findings.some((f) => f.id === id && !f.oneWord));
  const rest = [...findings].sort((a, b) => Number(b.category === "keywords") - Number(a.category === "keywords") || Number(!!a.oneWord) - Number(!!b.oneWord) || b.severity - a.severity)
    .map((f) => f.id).filter((id) => !preferred.includes(id));
  return [...preferred, ...rest].slice(0, MAX_PICKS);
}

// ── Entry point ─────────────────────────────────────────────────────────────

// `full` adds the non-keyword angles: Gemini screenshot review, category
// benchmark (screenshot count, video, ratings, update cadence) and the
// localization check. Off by default, since the email carries two keyword
// findings; skipping them drops the Gemini vision call and roughly 40% of
// the store requests.
export async function runQuickAudit(
  admin: SupabaseClient, input: { store: AuditStore; storeId: string; country: string }, { full = false }: { full?: boolean } = {},
): Promise<QuickAuditResult> {
  const { store, storeId, country } = input;
  const data = await fetchStoreData(store, storeId, storeId, country);
  if (!data) throw new Error(`Couldn't load that listing in the ${country.toUpperCase()} store. Check the URL or try another country.`);

  const notes: string[] = [];
  const shortName = titleBrand(data.name ?? "");

  const [bench, kw, shots] = await Promise.all([
    full ? loadCategoryBenchmark(store, storeId, storeId, country, data) : Promise.resolve(null),
    keywordFindings(admin, store, storeId, country, data, shortName, notes),
    full ? screenshotFinding(store, data, notes) : Promise.resolve(null),
  ]);
  if (full && !bench) notes.push("Category benchmark unavailable; benchmark-based findings skipped.");
  const l10n = full ? await localizationFinding(store, storeId, country, data, kw.competitors).catch(() => null) : null;

  // Metadata checks that need no benchmark (empty/short subtitle, brand-only
  // title) cost no requests, so they're always in as keyword-space alternates.
  const findings = [
    ...kw.findings,
    ...(shots ? [shots] : []),
    ...creativeBenchmarkFindings(store, data, bench),
    ...(l10n ? [l10n] : []),
    ...ratingFindings(data, bench),
    ...metadataFindings(store, data, bench),
  ].sort((a, b) => b.severity - a.severity);

  return {
    appName: data.name ?? "",
    shortName,
    store,
    storeId,
    country,
    category: data.primaryGenreName,
    competitors: kw.competitors.map((c) => c.data.name ?? c.id),
    findings,
    defaultSelection: pickDefault(findings),
    notes,
  };
}

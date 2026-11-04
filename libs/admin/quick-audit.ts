// Quick ASO audit for cold outreach (Super Admin → Quick Audit): paste a
// store URL, get a pool of concrete findings ranked by severity, three of
// which drop into the reply template. Everything is read live from the public
// stores; nothing is written except the shared autocomplete-volume cache.
//
// Findings come from five angles, each phrased for the email as-is:
//   keywords      competitor title/subtitle terms the app's own title/subtitle
//                 lacks, scored with the same autocomplete volume the product
//                 uses, plus the app's live rank for each
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
import { searchIosLive } from "@/libs/keyword-relevancy";
import { resolveIosVolume, resolveAndroidVolume } from "@/libs/keyword-autocomplete";
import { findRankIdx } from "@/libs/keyword-rank-match";
import { generateText, generateTextWithImages, type InlineImage } from "@/libs/gemini";
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

async function searchStore(store: AuditStore, term: string, country: string): Promise<SearchHit[] | null> {
  if (store === "ios") {
    const res = await searchIosLive(term, country);
    if (!Array.isArray(res)) return null;
    return res.map((a) => ({ id: String(a.trackId), name: a.trackName }));
  }
  try {
    const api = await gplay();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res: any[] = await api.search({ term, country, num: 100 });
    return res.map((a) => ({ id: String(a.appId), name: String(a.title ?? "") }));
  } catch {
    return null;
  }
}

function rankIn(hits: SearchHit[], appName: string, storeId: string): number | null {
  const idx = findRankIdx(hits.map((h) => h.name), appName, hits.map((h) => h.id), storeId);
  return idx >= 0 ? idx + 1 : null;
}

const SEARCH_DEPTH: Record<AuditStore, number> = { ios: 200, android: 100 };

// ── Seeds: the generic searches this app should show up for ─────────────────

async function seedTerms(data: NonNullable<StoreData>, country: string, notes: string[]): Promise<string[]> {
  const prompt = `You are an App Store Optimization expert. Below is an app listing in the ${COUNTRY_MAP[country.toUpperCase()] ?? country.toUpperCase()} store.
Title: ${data.name}
Subtitle / short description: ${data.subtitle}
Category: ${data.primaryGenreName}
Description (excerpt): ${data.description.slice(0, 900)}

List the 3 generic search terms (1 to 3 words each, lowercase, in the language people in that store search in) that someone who doesn't know this app would type to find an app like it. No brand names, no app names.
Reply with JSON only: {"terms": ["...", "...", "..."]}`;
  const raw = await generateText(prompt);
  try {
    const parsed = JSON.parse((raw ?? "").replace(/^```(?:json)?\s*|\s*```$/g, ""));
    const terms = (parsed.terms as unknown[]).filter((t): t is string => typeof t === "string" && !!t.trim()).map((t) => t.toLowerCase().trim());
    if (terms.length) return terms.slice(0, 3);
  } catch { /* fallback below */ }

  notes.push("Gemini unavailable for seed terms; used the subtitle's own words instead.");
  const brand = new Set(words(titleBrand(data.name ?? "")));
  const fromListing = extractTerms(`${data.name} ${data.subtitle}`).filter((t) => !t.split(" ").some((w) => brand.has(w)));
  const bigrams = fromListing.filter((t) => t.includes(" "));
  const seeds = [...bigrams.slice(0, 2), ...fromListing.filter((t) => !t.includes(" ")).slice(0, 1)];
  return seeds.length ? seeds : [data.primaryGenreName.toLowerCase()];
}

// ── Keyword findings ────────────────────────────────────────────────────────

type Competitor = { id: string; data: NonNullable<StoreData> };

async function keywordFindings(
  admin: SupabaseClient, store: AuditStore, storeId: string, country: string,
  data: NonNullable<StoreData>, shortName: string, notes: string[],
): Promise<{ findings: AuditFinding[]; competitors: Competitor[] }> {
  const appName = data.name ?? "";
  const seeds = await seedTerms(data, country, notes);

  // Competitors: apps that show up most (and highest) across the seed searches.
  const seedHits = await Promise.all(seeds.map((s) => searchStore(store, s, country)));
  if (seedHits.every((h) => h === null)) notes.push("Store search failed (likely rate-limited); keyword findings skipped.");
  const score = new Map<string, number>();
  seedHits.forEach((hits) => (hits ?? []).filter((h) => h.id !== storeId).slice(0, 10)
    .forEach((h, i) => score.set(h.id, (score.get(h.id) ?? 0) + (10 - i))));
  const competitorIds = [...score.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id]) => id);
  const competitors = (await Promise.all(competitorIds.map(async (id) => ({ id, data: await fetchStoreData(store, id, id, country) }))))
    .filter((c): c is Competitor => !!c.data);

  // Candidate terms: competitor title/subtitle terms our title/subtitle lacks.
  const ownText = `${appName} ${data.subtitle}`.toLowerCase();
  const ownWords = new Set(words(ownText));
  const brandWords = new Set([
    ...words(titleBrand(appName)),
    ...competitors.flatMap((c) => { const b = words(titleBrand(c.data.name ?? "")); return b.length === 1 ? b : []; }),
  ]);
  const usedBy = new Map<string, string[]>();
  for (const c of competitors) {
    for (const t of extractTerms(`${c.data.name} ${c.data.subtitle}`)) {
      if (t.split(" ").some((w) => brandWords.has(w))) continue;
      usedBy.set(t, [...(usedBy.get(t) ?? []), titleBrand(c.data.name ?? c.id)]);
    }
  }
  const shared = [...usedBy.entries()].filter(([t, names]) => names.length >= 2 && !covers(ownWords, t, ownText));
  // A word that only rides along inside a shared phrase ("relief" in
  // "anxiety relief") is pitched as the phrase, not the bare word.
  const gaps = shared
    .filter(([t, names]) => t.includes(" ") || !shared.some(([p, pn]) => p.includes(" ") && p.split(" ").includes(t) && pn.length >= names.length))
    .sort((a, b) => b[1].length - a[1].length || b[0].split(" ").length - a[0].split(" ").length)
    .slice(0, 10);
  const seedCandidates = seeds.filter((s) => !gaps.some(([t]) => t === s));

  const volumeOf = (term: string) => store === "ios"
    ? resolveIosVolume(admin, term, country, 0)
    : resolveAndroidVolume(admin, term, country, 0);
  const allTerms = [...gaps.map(([t]) => t), ...seedCandidates];
  const volumes = new Map(await Promise.all(allTerms.map(async (t) => [t, await volumeOf(t).catch(() => 0)] as const)));

  const findings: AuditFinding[] = [];
  const fieldPhrase = store === "ios" ? "subtitle" : "title and short description";
  const fieldVerb = store === "ios" ? "doesn't" : "don't";
  const depth = SEARCH_DEPTH[store];
  const rankSentence = (rank: number | null) => rank == null
    ? ` You don't rank in the top ${depth} for it right now.`
    : rank > 10 ? ` You currently rank #${rank} for it.` : "";
  const volumeWord = (v: number) => v >= 55 ? "high-volume" : v >= 35 ? "popular" : "relevant";
  const toolLine = (kw: string) => `You can check this yourself for free in our tool: ${TOOL_URL} (just search ${shortName} and look up "${kw}")`;

  // Gap keywords, best volume first; live rank for the top two.
  const rankedGaps = gaps
    .map(([t, names]) => ({ term: t, names, volume: volumes.get(t) ?? 0 }))
    .filter((g) => g.volume > 15)
    .sort((a, b) => b.volume - a.volume || b.names.length - a.names.length)
    .slice(0, 2);
  for (const [i, g] of rankedGaps.entries()) {
    const hits = await searchStore(store, g.term, country);
    const rank = hits ? rankIn(hits, appName, storeId) : null;
    findings.push({
      id: `kw-gap-${i}`,
      category: "keywords",
      severity: Math.min(98, Math.round(45 + g.volume * 0.45 + (rank == null || rank > 30 ? 8 : 0)) - i * 8),
      text: `Your ${fieldPhrase} ${fieldVerb} include "${g.term}", a ${volumeWord(g.volume)} term ${g.names.length} of your top ${competitors.length} competitors (${listNames(g.names)}) use in theirs.${hits ? rankSentence(rank) : ""}`,
      toolLine: toolLine(g.term),
      evidence: `Volume ${g.volume}/100 · rank ${rank ?? `none in top ${depth}`}${hits ? "" : " (search failed)"} · used by ${g.names.join(", ")}`,
    });
  }

  // Core searches: a seed term the app should own but barely ranks for.
  for (const [i, seed] of seeds.entries()) {
    const volume = volumes.get(seed) ?? await volumeOf(seed).catch(() => 0);
    if (volume < 35) continue;
    const hits = seedHits[i];
    if (!hits) continue;
    const rank = rankIn(hits, appName, storeId);
    if (rank != null && rank <= 15) continue;
    const leaders = hits.filter((h) => h.id !== storeId).slice(0, 3).map((h) => titleBrand(h.name));
    findings.push({
      id: `kw-core-${i}`,
      category: "keywords",
      severity: Math.min(95, Math.round(40 + volume * 0.45 + (rank == null ? 10 : 0))),
      text: `${rank == null ? `You don't show up in the top ${depth} results` : `You're only ranking #${rank}`} for "${seed}", one of the main searches for apps like yours, where ${listNames(leaders)} take the top spots.`,
      toolLine: toolLine(seed),
      evidence: `Seed term · volume ${volume}/100 · rank ${rank ?? `none in top ${depth}`}`,
    });
  }

  return { findings, competitors };
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

// Strongest finding from each angle first (three different angles read better
// than three keyword nits), then the next strongest overall; keyword findings
// lead the email since that's where the tool link fits.
function pickDefault(findings: AuditFinding[]): string[] {
  const sorted = [...findings].sort((a, b) => b.severity - a.severity);
  const picked: AuditFinding[] = [];
  const seen = new Set<AuditCategory>();
  for (const f of sorted) if (picked.length < 3 && !seen.has(f.category)) { picked.push(f); seen.add(f.category); }
  for (const f of sorted) if (picked.length < 3 && !picked.includes(f)) picked.push(f);
  return picked.sort((a, b) => Number(b.category === "keywords") - Number(a.category === "keywords") || b.severity - a.severity).map((f) => f.id);
}

// ── Entry point ─────────────────────────────────────────────────────────────

export async function runQuickAudit(
  admin: SupabaseClient, input: { store: AuditStore; storeId: string; country: string },
): Promise<QuickAuditResult> {
  const { store, storeId, country } = input;
  const data = await fetchStoreData(store, storeId, storeId, country);
  if (!data) throw new Error(`Couldn't load that listing in the ${country.toUpperCase()} store. Check the URL or try another country.`);

  const notes: string[] = [];
  const shortName = titleBrand(data.name ?? "");

  const [bench, kw, shots] = await Promise.all([
    loadCategoryBenchmark(store, storeId, storeId, country, data),
    keywordFindings(admin, store, storeId, country, data, shortName, notes),
    screenshotFinding(store, data, notes),
  ]);
  if (!bench) notes.push("Category benchmark unavailable; benchmark-based findings skipped.");
  const l10n = await localizationFinding(store, storeId, country, data, kw.competitors).catch(() => null);

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

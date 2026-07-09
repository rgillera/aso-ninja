import { NextRequest, NextResponse } from "next/server";

export type MetadataKeyword = { term: string; volume: number };
export type AppMetadataResult = {
  title: string;
  subtitle: string;
  description: string;
  titleKeywords: MetadataKeyword[];
  subtitleKeywords: MetadataKeyword[];
  descriptionKeywords: MetadataKeyword[];
  hasMoreDesc: boolean;
};

import { ALL_STOP_WORDS } from "@/libs/stopWords";
import { fetchAndroidStoreData } from "@/libs/store/googleplay";

const DESC_PAGE = 20;

// Word-break segmentation via Intl.Segmenter (not a locale-specific regex) so
// scripts without space delimiters — Japanese, Chinese, etc — tokenize
// correctly via ICU's dictionary-based break iterator, alongside plain
// whitespace-delimited scripts like English. "und" (undetermined) locale still
// gets script-appropriate segmentation since CJK/Thai/etc breaking is driven
// by script detection rather than the locale tag.
const segmenter = new Intl.Segmenter("und", { granularity: "word" });

// Normalizes a raw segment to a comparable term, or null if it should be
// dropped as noise (punctuation, stop word, too short to be meaningful).
// Stop words are checked against the union of all supported languages, since
// app-store metadata can be in any of ~150 storefront locales.
function normalizeTerm(segment: string): string | null {
  const term = segment.toLowerCase();
  return term.length >= 2 && !ALL_STOP_WORDS.has(term) ? term : null;
}

function wordTokens(text: string): string[] {
  const tokens: string[] = [];
  for (const { segment, isWordLike } of segmenter.segment(text)) {
    if (isWordLike) tokens.push(segment);
  }
  return tokens;
}

function extractSingles(text: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of wordTokens(text)) {
    const term = normalizeTerm(raw);
    if (term && !seen.has(term)) { seen.add(term); out.push(term); }
  }
  return out;
}

function extractBigrams(text: string): string[] {
  const raw = wordTokens(text);
  const seen = new Set<string>();
  const bigrams: string[] = [];
  for (let i = 0; i < raw.length - 1; i++) {
    const a = normalizeTerm(raw[i]);
    const b = normalizeTerm(raw[i + 1]);
    if (a && b) {
      const pair = `${a} ${b}`;
      if (!seen.has(pair)) { seen.add(pair); bigrams.push(pair); }
    }
  }
  return bigrams;
}


const EMPTY = { title: "", subtitle: "", description: "", titleKeywords: [], subtitleKeywords: [], descriptionKeywords: [], hasMoreDesc: false };

async function scrapeAppStoreSubtitle(storeId: string, country: string): Promise<string> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await fetch(`https://apps.apple.com/${country}/app/id${storeId}`, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)" },
      cache: "no-store",
    } as any);
    if (!res.ok) return "";
    const html = await res.text();
    // Subtitle appears in the embedded shoebox JSON as "subtitle":"..."
    const m = html.match(/"subtitle"\s*:\s*"([^"\\]+)"/);
    return m ? m[1] : "";
  } catch { return ""; }
}

// GET /api/keywords/app-metadata?storeId=...&store=ios&country=us&descOffset=0
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const storeId    = searchParams.get("storeId") ?? "";
  const store      = searchParams.get("store") ?? "ios";
  const country    = (searchParams.get("country") ?? "us").toLowerCase();
  const descOffset = Math.max(0, parseInt(searchParams.get("descOffset") ?? "0", 10));

  if (!storeId) return NextResponse.json(EMPTY);

  const toKeywords = (terms: string[]): MetadataKeyword[] =>
    terms.map((term) => ({ term, volume: 0 }));

  const buildResult = (title: string, subtitle: string, description: string): AppMetadataResult => {
    // Singles first, then bigrams — so initial page always has the core single-word keywords
    const titleTerms    = [...extractSingles(title),    ...extractBigrams(title)];
    const subtitleTerms = [...extractSingles(subtitle), ...extractBigrams(subtitle)];
    const allDescTerms  = [...extractSingles(description), ...extractBigrams(description)];

    const descPage    = allDescTerms.slice(descOffset, descOffset + DESC_PAGE);
    const hasMoreDesc = allDescTerms.length > descOffset + DESC_PAGE;

    return {
      title,
      subtitle,
      description,
      titleKeywords:       toKeywords(titleTerms),
      subtitleKeywords:    toKeywords(subtitleTerms),
      descriptionKeywords: toKeywords(descPage),
      hasMoreDesc,
    };
  };

  if (store === "android") {
    try {
      const data = await fetchAndroidStoreData(storeId, country);
      if (!data) return NextResponse.json(EMPTY);
      return NextResponse.json(buildResult(data.name ?? "", data.subtitle, data.description));
    } catch {
      return NextResponse.json(EMPTY);
    }
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res  = await fetch(`https://itunes.apple.com/lookup?id=${storeId}&country=${country}`, { cache: "no-store" } as any);
    if (!res.ok) return NextResponse.json(EMPTY);
    const data = await res.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r    = (data.results ?? [])[0] as any;
    if (!r)    return NextResponse.json(EMPTY);

    const title       = (r.trackName ?? "") as string;
    // iTunes lookup doesn't reliably expose subtitle — scrape App Store page as fallback
    const itunesSubtitle = (r.subtitle ?? r.trackSubtitle ?? "") as string;
    const subtitle    = itunesSubtitle || await scrapeAppStoreSubtitle(storeId, country);
    const description = (r.description ?? "") as string;

    return NextResponse.json(buildResult(title, subtitle, description) satisfies AppMetadataResult);
  } catch {
    return NextResponse.json(EMPTY);
  }
}

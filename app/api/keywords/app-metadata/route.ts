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

import { STOP_WORDS } from "@/libs/stopWords";

const DESC_PAGE = 20;

function extractSingles(text: string): string[] {
  return [...new Set(
    text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/)
      .filter((w) => w.length >= 2 && !STOP_WORDS.has(w))
  )];
}

function extractBigrams(text: string): string[] {
  const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(Boolean);
  const seen = new Set<string>();
  const bigrams: string[] = [];
  for (let i = 0; i < words.length - 1; i++) {
    const a = words[i], b = words[i + 1];
    if (a.length >= 2 && !STOP_WORDS.has(a) && b.length >= 2 && !STOP_WORDS.has(b)) {
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

  // Android: lightweight path — just return the short description as subtitle, skip keyword extraction
  if (store === "android") {
    try {
      const res = await fetch(
        `https://play.google.com/store/apps/details?id=${storeId}&hl=en&gl=${country}`,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { headers: { "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1)" }, cache: "no-store" } as any,
      );
      if (!res.ok) return NextResponse.json(EMPTY);
      const html = await res.text();
      const m = html.match(/<meta[^>]+itemprop="description"[^>]+content="([^"]+)"/)
             ?? html.match(/content="([^"]+)"[^>]+itemprop="description"/);
      const subtitle = m ? m[1].replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&quot;/g, '"') : "";
      return NextResponse.json({ ...EMPTY, subtitle });
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

    // Singles first, then bigrams — so initial page always has the core single-word keywords
    const titleTerms    = [...extractSingles(title),    ...extractBigrams(title)];
    const subtitleTerms = [...extractSingles(subtitle), ...extractBigrams(subtitle)];
    const allDescTerms  = [...extractSingles(description), ...extractBigrams(description)];

    const descPage    = allDescTerms.slice(descOffset, descOffset + DESC_PAGE);
    const hasMoreDesc = allDescTerms.length > descOffset + DESC_PAGE;

    const toKeywords = (terms: string[]): MetadataKeyword[] =>
      terms.map((term) => ({ term, volume: 0 }));

    return NextResponse.json({
      title,
      subtitle,
      description,
      titleKeywords:       toKeywords(titleTerms),
      subtitleKeywords:    toKeywords(subtitleTerms),
      descriptionKeywords: toKeywords(descPage),
      hasMoreDesc,
    } satisfies AppMetadataResult);
  } catch {
    return NextResponse.json(EMPTY);
  }
}

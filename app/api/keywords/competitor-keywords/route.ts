import { NextRequest, NextResponse } from "next/server";
import { ALL_STOP_WORDS } from "@/libs/stopWords";
import { fetchStoreData } from "@/libs/store/load-benchmark";

export type CompetitorKeyword = {
  term: string;
  competitors: string[]; // app names that use this keyword
};
export type CompetitorKeywordsResult = {
  appName: string;
  keywords: CompetitorKeyword[];
  competitorApps: { name: string; icon: string }[];
};

const EMPTY: CompetitorKeywordsResult = { appName: "", keywords: [], competitorApps: [] };

// Word-break segmentation via Intl.Segmenter (not whitespace-splitting) so
// scripts without space delimiters — Japanese, Chinese, Thai, etc — tokenize
// correctly, alongside plain whitespace-delimited scripts like English.
const segmenter = new Intl.Segmenter("und", { granularity: "word" });

function wordTokens(text: string): string[] {
  const tokens: string[] = [];
  for (const { segment, isWordLike } of segmenter.segment(text.toLowerCase())) {
    if (isWordLike) tokens.push(segment);
  }
  return tokens;
}

function extractTerms(text: string): string[] {
  const words = wordTokens(text);
  const singles = [...new Set(words.filter((w) => w.length >= 2 && !ALL_STOP_WORDS.has(w)))];

  const bigrams: string[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < words.length - 1; i++) {
    const a = words[i], b = words[i + 1];
    if (a.length >= 2 && !ALL_STOP_WORDS.has(a) && b.length >= 2 && !ALL_STOP_WORDS.has(b)) {
      const pair = `${a} ${b}`;
      if (!seen.has(pair)) { seen.add(pair); bigrams.push(pair); }
    }
  }

  return [...singles, ...bigrams];
}

// GET /api/keywords/competitor-keywords?storeId=X&competitorIds=id1,id2,...&country=us&store=ios|android
//
// Competitors are assumed to be on the same store platform as the primary app
// (the "add competitor" search UI already only searches that platform — see
// the same assumption documented in app/api/competitors/route.ts). storeId
// doubles as bundleId for Android, since googleplay.ts's searchPlayStore sets
// both to the Play Store package id.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const storeId       = searchParams.get("storeId") ?? "";
  const country       = (searchParams.get("country") ?? "us").toLowerCase();
  const store         = searchParams.get("store") === "android" ? "android" : "ios";
  const competitorIds = (searchParams.get("competitorIds") ?? "")
    .split(",").map((s) => s.trim()).filter(Boolean).slice(0, 25);

  if (!storeId || !competitorIds.length) return NextResponse.json(EMPTY);

  // 1. Lookup current app to get its own terms (to exclude from results)
  const ownData = await fetchStoreData(store, storeId, storeId, country);
  if (!ownData) return NextResponse.json(EMPTY);

  const appName  = ownData.name ?? "";
  const ownTerms = new Set(extractTerms(`${appName} ${ownData.subtitle} ${ownData.description}`));

  // 2. Lookup each competitor
  const competitorResults = await Promise.all(
    competitorIds
      .filter((id) => id !== storeId)
      .map(async (id) => ({ id, data: await fetchStoreData(store, id, id, country) }))
  );
  const competitors = competitorResults.filter((c): c is { id: string; data: NonNullable<typeof c.data> } => !!c.data);

  if (!competitors.length) return NextResponse.json({ appName, keywords: [], competitorApps: [] });

  // 3. Extract keywords from each competitor's full metadata (title + subtitle + description)
  const keywordMap = new Map<string, Set<string>>(); // term → competitor app names
  for (const { data } of competitors) {
    const name = data.name ?? "";
    const text = `${name} ${data.subtitle} ${data.description}`;
    const terms = extractTerms(text);
    for (const term of terms) {
      if (!ownTerms.has(term)) {
        if (!keywordMap.has(term)) keywordMap.set(term, new Set());
        keywordMap.get(term)!.add(name);
      }
    }
  }

  // 4. Sort by # competitors using the term, then alphabetically
  const keywords: CompetitorKeyword[] = [...keywordMap.entries()]
    .map(([term, apps]) => ({ term, competitors: [...apps] }))
    .sort((a, b) => b.competitors.length - a.competitors.length || a.term.localeCompare(b.term));

  const competitorApps = competitors.map(({ data }) => ({ name: data.name ?? "", icon: "" }));

  return NextResponse.json({ appName, keywords, competitorApps } satisfies CompetitorKeywordsResult);
}

import { NextRequest, NextResponse } from "next/server";
import { STOP_WORDS } from "@/libs/stopWords";

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

function extractTerms(text: string): string[] {
  const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(Boolean);
  const singles = [...new Set(words.filter((w) => w.length >= 2 && !STOP_WORDS.has(w)))];

  const bigrams: string[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < words.length - 1; i++) {
    const a = words[i], b = words[i + 1];
    if (a.length >= 2 && !STOP_WORDS.has(a) && b.length >= 2 && !STOP_WORDS.has(b)) {
      const pair = `${a} ${b}`;
      if (!seen.has(pair)) { seen.add(pair); bigrams.push(pair); }
    }
  }

  return [...singles, ...bigrams];
}

// GET /api/keywords/competitor-keywords?storeId=X&competitorIds=id1,id2,...&country=us
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const storeId       = searchParams.get("storeId") ?? "";
  const country       = (searchParams.get("country") ?? "us").toLowerCase();
  const competitorIds = (searchParams.get("competitorIds") ?? "")
    .split(",").map((s) => s.trim()).filter(Boolean);

  if (!storeId || !competitorIds.length) return NextResponse.json(EMPTY);

  // 1. Lookup current app to get its own terms (to exclude from results)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const appRes = await fetch(`https://itunes.apple.com/lookup?id=${storeId}&country=${country}`, { cache: "no-store" } as any);
  if (!appRes.ok) return NextResponse.json(EMPTY);
  const appData = await appRes.json();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const app = (appData.results ?? [])[0] as any;
  if (!app) return NextResponse.json(EMPTY);

  const appName     = (app.trackName ?? "") as string;
  const subtitle    = (app.subtitle ?? app.trackSubtitle ?? "") as string;
  const description = (app.description ?? "") as string;
  const ownTerms    = new Set(extractTerms(`${appName} ${subtitle} ${description}`));

  // 2. Batch lookup the user-provided competitor IDs
  const ids = competitorIds.slice(0, 25).join(",");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const batchRes = await fetch(`https://itunes.apple.com/lookup?id=${ids}&country=${country}`, { cache: "no-store" } as any);
  if (!batchRes.ok) return NextResponse.json({ appName, keywords: [], competitorApps: [] });
  const batchData = await batchRes.json();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const competitors: any[] = (batchData.results ?? []).filter((r: any) => String(r.trackId) !== storeId);

  if (!competitors.length) return NextResponse.json({ appName, keywords: [], competitorApps: [] });

  // 3. Extract keywords from each competitor's full metadata (title + subtitle + description)
  const keywordMap = new Map<string, Set<string>>(); // term → competitor app names
  for (const comp of competitors) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const c    = comp as any;
    const text = `${c.trackName ?? ""} ${c.subtitle ?? c.trackSubtitle ?? ""} ${c.description ?? ""}`;
    const terms = extractTerms(text);
    for (const term of terms) {
      if (!ownTerms.has(term)) {
        if (!keywordMap.has(term)) keywordMap.set(term, new Set());
        keywordMap.get(term)!.add(comp.trackName as string);
      }
    }
  }

  // 4. Sort by # competitors using the term, then alphabetically
  const keywords: CompetitorKeyword[] = [...keywordMap.entries()]
    .map(([term, apps]) => ({ term, competitors: [...apps] }))
    .sort((a, b) => b.competitors.length - a.competitors.length || a.term.localeCompare(b.term));

  const competitorApps = competitors.map((c) => ({
    name: c.trackName as string,
    icon: (c.artworkUrl60 ?? c.artworkUrl100 ?? "") as string,
  }));

  return NextResponse.json({ appName, keywords, competitorApps } satisfies CompetitorKeywordsResult);
}

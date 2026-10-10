import { NextRequest, NextResponse } from "next/server";
import { ALL_STOP_WORDS } from "@/libs/stopWords";
import { fetchStoreData } from "@/libs/store/load-benchmark";
import { createClient } from "@/libs/supabase/server";

// Keyword gap matrix buckets (see the "Competitor & keyword gap research"
// playbook lesson):
//   winning:   you and a competitor both rank, you're top 10 and not outranked
//   losing:    you and a competitor both rank, but you're outranked or outside the top 10
//   gap:       a competitor ranks, you don't
//   yours:     you rank, no competitor does
//   unchecked: a word from a competitor's listing with no rank recorded for
//              you or any competitor yet (tracking it records everyone's rank)
export type GapBucket = "winning" | "losing" | "gap" | "yours" | "unchecked";

export type CompetitorRank = { name: string; rank: number };

export type CompetitorKeyword = {
  term: string;
  bucket: GapBucket;
  ourRank: number | null;
  competitorRanks: CompetitorRank[]; // best rank first
  competitors: string[]; // app names whose listing uses this keyword
  volume: number | null;
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

const TOP_10 = 10;
// Ranked keywords pulled in from rank history, per app. History is shared
// across workspaces, so a category leader can have thousands of ranked
// keywords; only its strongest ones are worth surfacing as gaps, and an
// uncapped list bloats the snapshot query, the response, and translation.
const RANKED_MAX_POSITION = 50;
const RANKED_MAX_TERMS = 200;

type RankedSummary = { keywords?: { term: string; rank: number }[] } | null;
type SnapshotRow = { keyword: string; recorded_on: string; app_id: string; position: number | null };
type VolumeRow = { term: string; recorded_on: string; score: number };

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
  const competitorIds = [...new Set(
    (searchParams.get("competitorIds") ?? "")
      .split(",").map((s) => s.trim()).filter((id) => id && id !== storeId)
  )].slice(0, 25);

  if (!storeId || !competitorIds.length) return NextResponse.json(EMPTY);

  const supabase = await createClient();
  const rankedTerms = (appId: string) =>
    supabase
      .rpc("keyword_ranked_summary", { p_app_id: appId, p_store: store, p_country: country })
      .then(({ data }) =>
        ((data as RankedSummary)?.keywords ?? [])
          .filter((k) => k.rank <= RANKED_MAX_POSITION)
          .sort((a, b) => a.rank - b.rank)
          .slice(0, RANKED_MAX_TERMS)
          .map((k) => k.term)
      );

  // 1. Listings (own + competitors) and every keyword each app already has a
  // recorded rank for, all in parallel. Ranked keywords catch gaps a
  // competitor ranks for without using the word in its own listing.
  const [ownData, competitorResults, ownRanked, ...competitorRanked] = await Promise.all([
    fetchStoreData(store, storeId, storeId, country),
    Promise.all(competitorIds.map(async (id) => ({ id, data: await fetchStoreData(store, id, id, country) }))),
    rankedTerms(storeId),
    ...competitorIds.map(rankedTerms),
  ]);
  if (!ownData) return NextResponse.json(EMPTY);

  const appName  = ownData.name ?? "";
  const ownTerms = new Set(extractTerms(`${appName} ${ownData.subtitle} ${ownData.description}`));

  const competitors = competitorResults.filter((c): c is { id: string; data: NonNullable<typeof c.data> } => !!c.data);
  if (!competitors.length) return NextResponse.json({ appName, keywords: [], competitorApps: [] });
  const nameById = new Map(competitors.map(({ id, data }) => [id, data.name ?? id]));

  // 2. Extract keywords from each competitor's full metadata (title + subtitle + description)
  const usedBy = new Map<string, Set<string>>(); // term → competitor app names
  for (const { data } of competitors) {
    const name = data.name ?? "";
    for (const term of extractTerms(`${name} ${data.subtitle} ${data.description}`)) {
      if (!usedBy.has(term)) usedBy.set(term, new Set());
      usedBy.get(term)!.add(name);
    }
  }

  const terms = [...new Set([
    ...usedBy.keys(),
    ...ownRanked.map((t) => t.toLowerCase()),
    ...competitorRanked.flat().map((t) => t.toLowerCase()),
  ])];

  // 3. Latest rank for every relevant app + latest volume, reduced in
  // Postgres (see 20261007000002_keyword_snapshots_visibility_rpc.sql). A
  // ranking pass records every app in the results on the same date, so the
  // latest date's rows give one consistent snapshot per keyword.
  const { data: reduced } = await supabase.rpc("keyword_performance_snapshots", {
    p_terms: terms, p_store: store, p_country: country, p_app_ids: [storeId, ...competitorIds],
  });
  const rankRows = (reduced?.rank ?? []) as SnapshotRow[];
  const volumeRows = (reduced?.volume ?? []) as VolumeRow[];

  const latestRankDate = new Map<string, string>();
  for (const r of rankRows) {
    const d = latestRankDate.get(r.keyword);
    if (!d || r.recorded_on > d) latestRankDate.set(r.keyword, r.recorded_on);
  }
  const ranksByTerm = new Map<string, SnapshotRow[]>();
  for (const r of rankRows) {
    if (r.recorded_on !== latestRankDate.get(r.keyword) || r.position == null) continue;
    if (!ranksByTerm.has(r.keyword)) ranksByTerm.set(r.keyword, []);
    ranksByTerm.get(r.keyword)!.push(r);
  }
  const latestVolume = new Map<string, { date: string; score: number }>();
  for (const v of volumeRows) {
    const cur = latestVolume.get(v.term);
    if (!cur || v.recorded_on > cur.date) latestVolume.set(v.term, { date: v.recorded_on, score: v.score });
  }

  // 4. Bucket each term
  const keywords: CompetitorKeyword[] = [];
  for (const term of terms) {
    const rows = ranksByTerm.get(term) ?? [];
    const ourRank = rows.find((r) => r.app_id === storeId)?.position ?? null;
    const competitorRanks = rows
      .filter((r) => r.app_id !== storeId && nameById.has(r.app_id))
      .map((r) => ({ name: nameById.get(r.app_id)!, rank: r.position! }))
      .sort((a, b) => a.rank - b.rank);

    let bucket: GapBucket;
    if (ourRank != null && competitorRanks.length) {
      bucket = ourRank <= TOP_10 && ourRank <= competitorRanks[0].rank ? "winning" : "losing";
    } else if (competitorRanks.length) {
      bucket = "gap";
    } else if (ourRank != null) {
      bucket = "yours";
    } else {
      // No ranks for anyone: only worth suggesting if it's a competitor
      // listing word we don't already use ourselves.
      if (!usedBy.has(term) || ownTerms.has(term)) continue;
      bucket = "unchecked";
    }

    keywords.push({
      term,
      bucket,
      ourRank,
      competitorRanks,
      competitors: [...(usedBy.get(term) ?? [])],
      volume: latestVolume.get(term)?.score ?? null,
    });
  }

  // 5. Highest volume first, then most competitors using it, then alphabetically
  keywords.sort((a, b) =>
    (b.volume ?? -1) - (a.volume ?? -1)
    || (b.competitorRanks.length + b.competitors.length) - (a.competitorRanks.length + a.competitors.length)
    || a.term.localeCompare(b.term)
  );

  const competitorApps = competitors.map(({ data }) => ({ name: data.name ?? "", icon: "" }));

  return NextResponse.json({ appName, keywords, competitorApps } satisfies CompetitorKeywordsResult);
}

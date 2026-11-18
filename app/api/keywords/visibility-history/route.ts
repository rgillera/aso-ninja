import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/libs/supabase/server";

export type VisibilityPoint = { date: string; score: number };
export type VisibilityHistoryResult = Record<string, VisibilityPoint[]>;

// POST /api/keywords/visibility-history
// body: { terms: string[], appIds: string[], store, country, from: "2026-03-29", to: "2026-06-29" }
//
// POST, not GET: a large tracked-keyword list (800+ terms) made the query
// string ~30KB, past the server's URL/header limit, so the request was
// rejected before reaching this handler and the chart showed no data.
export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as {
    terms?: unknown; appIds?: unknown; store?: unknown; country?: unknown; from?: unknown; to?: unknown;
  };
  const strings = (v: unknown) =>
    (Array.isArray(v) ? v : []).filter((x): x is string => typeof x === "string").map((x) => x.trim()).filter(Boolean);
  const store   = typeof body.store === "string" && body.store ? body.store : "ios";
  const country = (typeof body.country === "string" && body.country ? body.country : "us").toLowerCase();
  const from    = typeof body.from === "string" ? body.from : "";
  const to      = typeof body.to === "string" ? body.to : "";
  const terms   = [...new Set(strings(body.terms).map((t) => t.toLowerCase()))];
  const appIds  = [...new Set(strings(body.appIds))];
  if (!terms.length || !appIds.length || !from || !to) return NextResponse.json({});

  const supabase = await createClient();

  // Computed entirely in Postgres (same math as before: see
  // 20261007000002_keyword_snapshots_visibility_rpc.sql) and returned as one
  // jsonb value. Pulling the raw volume/rank rows here got silently cut off
  // at PostgREST's 1000-row cap, oldest-first, so the newest chart points
  // were the ones dropped for apps with many tracked keywords.
  const { data, error } = await supabase.rpc("keyword_visibility_history", {
    p_terms: terms, p_store: store, p_country: country, p_app_ids: appIds, p_from: from, p_to: to,
  });
  // An error (e.g. a statement timeout) must not look like "no data yet".
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data as VisibilityHistoryResult);
}

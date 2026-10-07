import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/libs/supabase/server";

export type VisibilityPoint = { date: string; score: number };
export type VisibilityHistoryResult = Record<string, VisibilityPoint[]>;

// GET /api/keywords/visibility-history?terms=a,b&store=ios&country=us&from=2026-03-29&to=2026-06-29&appIds=123,456
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const termsParam  = searchParams.get("terms") ?? "";
  const appIdsParam = searchParams.get("appIds") ?? "";
  const store        = searchParams.get("store") ?? "ios";
  const country       = (searchParams.get("country") ?? "us").toLowerCase();
  const from           = searchParams.get("from") ?? "";
  const to              = searchParams.get("to") ?? "";

  // Each term arrives percent-encoded (see the client's encodeURIComponent
  // before joining) so a literal comma inside a keyword survives as %2C
  // instead of being mistaken for the between-terms delimiter.
  const terms  = [...new Set(termsParam.split(",").map((t) => decodeURIComponent(t.trim()).toLowerCase()).filter(Boolean))];
  const appIds = [...new Set(appIdsParam.split(",").map((a) => a.trim()).filter(Boolean))];
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
  if (error) return NextResponse.json({});

  return NextResponse.json(data as VisibilityHistoryResult);
}

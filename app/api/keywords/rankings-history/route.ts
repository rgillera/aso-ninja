import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/libs/supabase/server";

export type RankingEntry = {
  recorded_on: string;
  position: number;
  app_id: string;
  app_name: string;
  app_icon: string;
};

// GET /api/keywords/rankings-history?keyword=calorie+counter&store=ios&country=us&from=2026-06-01&to=2026-06-29
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const keyword = (searchParams.get("keyword") ?? "").toLowerCase().trim();
  const store   = searchParams.get("store") ?? "ios";
  const country = (searchParams.get("country") ?? "us").toLowerCase();
  const from    = searchParams.get("from") ?? new Date(Date.now() - 30 * 86400_000).toISOString().split("T")[0];
  const to      = searchParams.get("to")   ?? new Date().toISOString().split("T")[0];

  if (!keyword) return NextResponse.json({ rows: [] });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("keyword_rankings_history")
    .select("recorded_on, position, app_id, app_name, app_icon")
    .eq("keyword", keyword)
    .eq("store", store)
    .eq("country", country)
    .gte("recorded_on", from)
    .lte("recorded_on", to)
    .order("recorded_on", { ascending: true })
    .order("position", { ascending: true });

  if (error) return NextResponse.json({ rows: [] }, { status: 500 });
  return NextResponse.json({ rows: data ?? [] });
}

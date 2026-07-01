import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/libs/supabase/server";

export type VolumeHistoryEntry = {
  recorded_on: string;
  score: number;
};

// GET /api/keywords/volume-history?term=calorie+counter&store=ios&country=us
//
// Every real Volume snapshot we have for this keyword — accumulates passively
// whenever /api/keywords/metrics computes a fresh (uncached) score.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const term    = (searchParams.get("term") ?? "").toLowerCase().trim();
  const store   = searchParams.get("store") ?? "ios";
  const country = (searchParams.get("country") ?? "us").toLowerCase();

  if (!term) return NextResponse.json({ rows: [] });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("keyword_volume_history")
    .select("recorded_on, score")
    .eq("term", term)
    .eq("store", store)
    .eq("country", country)
    .order("recorded_on", { ascending: true });

  if (error) return NextResponse.json({ rows: [] }, { status: 500 });
  return NextResponse.json({ rows: (data ?? []) as VolumeHistoryEntry[] });
}

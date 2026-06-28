import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/libs/supabase/server";

// GET /api/keywords/popularity?term=calorie+counter&store=ios&country=us&days=90
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const term    = (searchParams.get("term") ?? "").toLowerCase().trim();
  const store   = searchParams.get("store") ?? "ios";
  const country = (searchParams.get("country") ?? "us").toLowerCase();
  const days    = Math.min(Math.max(parseInt(searchParams.get("days") ?? "90"), 1), 365);

  if (!term) return NextResponse.json([]);

  const since = new Date();
  since.setDate(since.getDate() - days);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("keyword_popularity_snapshots")
    .select("score, recorded_on")
    .eq("term", term)
    .eq("store", store)
    .eq("country", country)
    .gte("recorded_on", since.toISOString().split("T")[0])
    .order("recorded_on", { ascending: true });

  if (error) return NextResponse.json([], { status: 500 });
  return NextResponse.json(data ?? []);
}
